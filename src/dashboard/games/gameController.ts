import { NextFunction, Request, Response } from "express";
import { Payouts, Platform } from "./gameModel";
import Game from "./gameModel";
import createHttpError from "http-errors";
import mongoose from "mongoose";
import { AuthRequest, uploadImage } from "../../utils/utils";
import { Player } from "../users/userModel";

interface GameRequest extends Request {
  file: Express.Multer.File;
}

export class GameController {

  constructor() {
    this.getGames = this.getGames.bind(this);
    this.addGame = this.addGame.bind(this);
  }

  // GET : Games
  async getGames(req: Request, res: Response, next: NextFunction) {
    try {
      const _req = req as AuthRequest;
      const { category, platform } = req.query;
      const { username, role } = _req.user;

      if (!platform) {
        throw createHttpError(400, "Platform query parameter is required")
      }

      let matchStage: any = {};
      if (category && category !== "all" && category !== "fav") {
        matchStage.category = category;
      }

      if (platform) {

        if (platform === "crm") {
          const games = await Game.aggregate([{ $match: matchStage }]);
          return res.status(200).json(games);

        }
        const platformDoc = await Platform.findOne({ name: platform }).populate("games");
        if (!platformDoc) {
          throw createHttpError(404, `Platform ${platform} not found`);
        }

        // Use the game IDs from the platform for aggregation
        matchStage._id = { $in: platformDoc.games.map(game => game._id) };
      }


      if (role === "player") {
        if (category === "fav") {
          const player = await Player.findOne({ username }).populate("favouriteGames");
          if (!player) {
            throw createHttpError(404, "Player not found")
          }

          console.log("Player : ", player);


          const favouriteGames = await Game.find({ _id: { $in: player.favouriteGames } });
          console.log("FAv : ", favouriteGames);

          return res.status(200).json({ featured: [], others: favouriteGames });
        }
        else {
          const games = await Game.aggregate([
            { $match: matchStage },
            {
              $sort: { createdAt: -1 }
            },
            {
              $facet: {
                featured: [{ $limit: 5 }],
                others: [{ $skip: 5 }]
              }
            }
          ]);
          return res.status(200).json(games[0])
        }
      }
      else if (role === "company") {
        const games = await Game.aggregate([{ $match: matchStage }]);
        return res.status(200).json(games)
      }
      else {
        return next(createHttpError(403, "Access denied: You don't have permission to access this resource."));
      }
    } catch (error) {
      next(error);
    }
  }

  // POST : Add Game
  async addGame(req: AuthRequest, res: Response, next: NextFunction) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const _req = req as AuthRequest;
      const { role } = _req.user;

      if (role != "company") {
        throw createHttpError(401, "Access denied: You don't have permission to add games")
      }

      const { name, thumbnail, url, type, category, status, tagName, slug, platform } = req.body;

      if (
        !name ||
        !thumbnail ||
        !url ||
        !type ||
        !category ||
        !status ||
        !tagName ||
        !slug ||
        !req.file ||
        !platform
      ) {
        throw createHttpError(
          400,
          "All required fields must be provided, including the payout file and platform"
        );
      }

      const existingGame = await Game.findOne({ $or: [{ name }, { slug }] }).session(session);
      if (existingGame) {
        throw createHttpError(
          409,
          "Game with the same name or slug already exists"
        );
      }

      // Find the platform
      const platformDoc = await Platform.findOne({ name: platform }).session(session);
      if (!platformDoc) {
        throw createHttpError(400, `Platform ${platform} not found`);
      }

      // Handle file for payout
      const jsonData = JSON.parse(req.file.buffer.toString("utf-8"));
      const newPayout = new Payouts({
        gameName: tagName,
        data: jsonData,
      });

      await newPayout.save({ session });

      const game = new Game({
        name,
        thumbnail,
        url,
        type,
        category,
        status,
        tagName,
        slug,
        payout: newPayout._id,
      });

      const savedGame = await game.save({ session });
      platformDoc.games.push(savedGame._id as mongoose.Types.ObjectId)
      await platformDoc.save({ session });

      await session.commitTransaction();
      session.endSession();

      res.status(201).json(savedGame);
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      next(error);
    }
  }

  // POST : Add Platform
  async addPlatform(req: Request, res: Response, next: NextFunction) {
    try {
      const _req = req as AuthRequest;
      const { role } = _req.user;

      if (role != "company") {
        throw createHttpError(401, "Access denied: You don't have permission to add games");
      }

      const { name } = req.body;

      if (!name) {
        throw createHttpError(400, "Platform name is required");
      }

      const existingPlatform = await Platform.findOne({ name });
      if (existingPlatform) {
        throw createHttpError(400, "Platform with the same name already exists")
      }
      const newPlatform = new Platform({ name, games: [] });
      const savedPlatform = await newPlatform.save();

      res.status(201).json(savedPlatform);
    } catch (error) {
      console.error("Error adding platform:", error);
      next(error);
    }
  }

  // GET : Get all Platform
  async getPlatforms(req: Request, res: Response, next: NextFunction) {
    try {
      const _req = req as AuthRequest;
      const { role } = _req.user;

      if (role != "company") {
        throw createHttpError(401, "Access denied: You don't have permission to add games");
      }

      const platforms = await Platform.find();
      res.status(200).json(platforms)
    } catch (error) {
      console.error("Error fetching platforms:", error);
      next(error);
    }
  }
}


// DONE
export const updateGame = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { gameId } = req.params;
    const { creatorRole, status, slug, ...updateFields } = req.body;

    if (!gameId) {
      throw createHttpError(400, "Game ID is required");
    }

    if (!mongoose.Types.ObjectId.isValid(gameId)) {
      throw createHttpError(400, "Invalid Game ID format");
    }

    if (creatorRole !== "company") {
      throw createHttpError(
        401,
        "Access denied: You don't have permission to update games"
      );
    }

    // Check if the game exists
    const game = await Game.findById(gameId);
    if (!game) {
      throw createHttpError(404, "Game not found");
    }

    // Validate the status field
    if (status && !["active", "inactive"].includes(status)) {
      throw createHttpError(
        400,
        "Invalid status value. It should be either 'active' or 'inactive'"
      );
    }

    // Ensure slug is unique if it is being updated
    if (slug && slug !== game.slug) {
      const existingGameWithSlug = await Game.findOne({ slug });
      if (existingGameWithSlug) {
        throw createHttpError(400, "Slug must be unique");
      }
    }

    // Ensure only existing fields in the document are updated
    const fieldsToUpdate = Object.keys(updateFields).reduce((acc: any, key) => {
      if (game[key] !== undefined) {
        acc[key] = updateFields[key];
      }
      return acc;
    }, {} as { [key: string]: any });

    // Include status and slug fields if they are valid
    if (status) {
      fieldsToUpdate.status = status;
    }
    if (slug) {
      fieldsToUpdate.slug = slug;
    }

    // Handle file for payout update
    if (req.file) {
      // Delete the old payout
      if (game.payout) {
        await Payouts.findByIdAndDelete(game.payout);
      }

      // Add the new payout
      const jsonData = JSON.parse(req.file.buffer.toString("utf-8"));
      const newPayout = new Payouts({
        gameName: game.name,
        data: jsonData,
      });

      await newPayout.save();
      fieldsToUpdate.payout = newPayout._id;
    }

    // If no valid fields to update, return an error
    if (Object.keys(fieldsToUpdate).length === 0) {
      throw createHttpError(400, "No valid fields to update");
    }

    const updatedGame = await Game.findByIdAndUpdate(
      gameId,
      { $set: fieldsToUpdate },
      { new: true }
    );

    res.status(200).json(updatedGame);
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) {
      next(createHttpError(400, "Invalid Game ID"));
    } else {
      next(error);
    }
  }
};

// DONE
export const deleteGame = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { gameId } = req.params;
    const { creatorRole } = req.body;

    if (!gameId) {
      throw createHttpError(400, "Game ID is required");
    }

    if (creatorRole !== "company") {
      throw createHttpError(
        401,
        "Access denied: You don't have permission to delete games"
      );
    }

    const deletedGame = await Game.findByIdAndDelete(gameId);

    if (!deletedGame) {
      throw createHttpError(404, "Game not found");
    }

    res.status(200).json({ message: "Game deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// DONE
export const getGameById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { gameId } = req.params;

    if (!gameId) {
      throw createHttpError(400, "Game ID is required");
    }


    const game = await Game.findOne({ slug: gameId });
    console.log("Game : ", game);


    if (!game) {
      throw createHttpError(404, "Game not found");
    }

    if (game.status === "active") {
      res.status(200).json({ url: game.url });
    } else {
      res
        .status(200)
        .json({ message: "This game is currently under maintenance" });
    }
  } catch (error) {
    next(error);
  }
};

export const uploadThubnail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.body.image) {
    return res.status(400).json({ error: "Please upload the image" });
  }
  try {
    const image = req.body.image;
    const imageUrl = await uploadImage(image);
    res.json({
      message: "File uploaded successfully",
      imageUrl: imageUrl,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to upload file" });
  }
};

export const addFavouriteGame = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { playerId } = req.params;
    const { gameId, type } = req.body;


    if (!playerId || !gameId) {
      throw createHttpError(400, "Player ID and Game ID are required");
    }

    if (!mongoose.Types.ObjectId.isValid(playerId)) {
      throw createHttpError(400, "Invalid Player ID format");
    }

    if (type !== "add" && type !== "remove") {
      throw createHttpError(
        400,
        "Invalid type value. It should be either 'add' or 'remove'"
      );
    }

    const player = await Player.findById(playerId);

    if (!player) {
      throw createHttpError(404, "Player not found");
    }

    let message;

    if (type === "add") {
      const updateResult = await Player.updateOne(
        { _id: playerId },
        { $addToSet: { favouriteGames: gameId } }
      );

      message = updateResult.modifiedCount > 0
        ? "Game added to favourites"
        : "Game already in favourites";

    } else if (type === "remove") {
      const updateResult = await Player.updateOne(
        { _id: playerId },
        { $pull: { favouriteGames: gameId } }
      );

      message = updateResult.modifiedCount > 0
        ? "Game removed from favourites"
        : "Game not found in favourites";
    }

    await player.save();

    res.status(200).json({ message: message });
  } catch (error) {
    next(error);
  }
};
