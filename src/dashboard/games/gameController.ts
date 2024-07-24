import { NextFunction, Request, Response } from "express";
import { Platform, Payouts } from "./gameModel";
import createHttpError from "http-errors";
import mongoose from "mongoose";
import { AuthRequest } from "../../utils/utils";
import { Player } from "../users/userModel";
import cloudinary from "cloudinary";
import { config } from "../../config/config";

cloudinary.v2.config({
  cloud_name: config.cloud_name,
  api_key: config.api_key,
  api_secret: config.api_secret,
});

interface GameRequest extends Request {
  files?: {
    [fieldname: string]: Express.Multer.File[];
  };
}

export class GameController {
  constructor() {
    this.getGames = this.getGames.bind(this);
    this.getGameBySlug = this.getGameBySlug.bind(this);
    this.addGame = this.addGame.bind(this);
    this.addPlatform = this.addPlatform.bind(this);
    this.getPlatforms = this.getPlatforms.bind(this);
    this.updateGame = this.updateGame.bind(this);
    this.deleteGame = this.deleteGame.bind(this);
    this.addFavouriteGame = this.addFavouriteGame.bind(this);
  }

  // GET : Get Games
  async getGames(req: Request, res: Response, next: NextFunction) {
    try {
      const _req = req as AuthRequest;
      const { category, platform } = req.query as {
        category?: string;
        platform: string;
      };
      const { username, role } = _req.user;

      if (!platform) {
        throw createHttpError(400, "Platform query parameter is required");
      }

      if (role === "player") {
        if (category === "fav") {
          const player = await Player.findOne({ username });
          if (!player) {
            throw createHttpError(404, "Player not found");
          }

          const favoriteGameIds = player.favouriteGames.map(
            (game) => new mongoose.Types.ObjectId(game)
          );
          console.log("favoriteGameIds : ", favoriteGameIds);

          const favoriteGames = await Platform.aggregate([
            { $match: { name: platform } },
            { $unwind: "$games" },
            { $match: { "games._id": { $in: favoriteGameIds } } },
            {
              $group: {
                _id: "$_id",
                games: { $push: "$games" },
              },
            },
            { $project: { "games.url": 0 } },
          ]);

          console.log("favoriteGames : ", favoriteGames[0]?.games);

          if (!favoriteGames.length) {
            return res.status(200).json({ featured: [], others: [] });
          }

          return res
            .status(200)
            .json({ featured: [], others: favoriteGames[0]?.games });
        } else {
          const platformDoc = await Platform.aggregate([
            { $match: { name: platform } },
            { $unwind: "$games" },
            {
              $match: category !== "all" ? { "games.category": category } : {},
            },
            { $sort: { "games.createdAt": -1 } },
            {
              $group: {
                _id: "$_id",
                games: { $push: "$games" },
              },
            },
            { $project: { "games.url": 0 } },
          ]);

          if (!platformDoc.length) {
            return res.status(200).json([]); // Return an empty array if no games are found
          }

          const games = platformDoc[0].games;
          const featured = games.slice(0, 5);
          const others = games.slice(5);

          return res.status(200).json({ featured, others });
        }
      } else if (role === "company") {
        const platformDoc = await Platform.aggregate([
          {
            $match: category !== "all" ? { name: category } : {},
          },
          { $unwind: "$games" },
          { $sort: { "games.createdAt": -1 } },
          {
            $group: {
              _id: "$_id",
              games: { $push: "$games" },
            },
          },
        ]);

        // Flatten the array of games from multiple platforms if category is "all"
        const allGames = platformDoc.reduce(
          (acc, platform) => acc.concat(platform.games),
          []
        );
        return res.status(200).json(allGames);
      } else {
        return next(
          createHttpError(
            403,
            "Access denied: You don't have permission to access this resource."
          )
        );
      }
    } catch (error) {
      next(error);
    }
  }

  // GET : Get Game By Slug
  async getGameBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { gameId: slug } = req.params;

      if (!slug) {
        throw createHttpError(400, "Slug parameter is required");
      }

      const platform = await Platform.aggregate([
        { $unwind: "$games" },
        { $match: { "games.slug": slug } },
        {
          $project: {
            _id: 0,
            url: "$games.url",
            status: "$games.status",
          },
        },
      ]);

      if (!platform || platform.length === 0) {
        throw createHttpError(404, "Game not found");
      }

      const game = platform[0];

      if (game.status === "active") {
        res.status(200).json({ url: game.url });
      } else {
        res
          .status(200)
          .json({ message: "The game is currently under maintenance." });
      }
    } catch (error) {
      next(error);
    }
  }

  // POST : Add Game
  async addGame(req: GameRequest, res: Response, next: NextFunction) {
    const session = await mongoose.startSession();
    session.startTransaction();

    let thumbnailUploadResult: cloudinary.UploadApiResponse | undefined;

    try {
      const _req = req as AuthRequest;
      const { role } = _req.user;

      if (role != "company") {
        throw createHttpError(
          401,
          "Access denied: You don't have permission to add games"
        );
      }

      const {
        name,
        url,
        type,
        category,
        status,
        tagName,
        slug,
        platform: platformName,
      } = req.body;
      console.log("Add : ", req.body);
      console.log("Thumb : ", req.files.thumbnail);
      console.log("payoutFile : ", req.files.payoutFile);

      if (
        !name ||
        !url ||
        !type ||
        !category ||
        !status ||
        !tagName ||
        !slug ||
        !req.files.thumbnail ||
        !req.files.payoutFile ||
        !platformName
      ) {
        throw createHttpError(
          400,
          "All required fields must be provided, including the payout file and platform"
        );
      }

      const platform = await Platform.findOne({ name: platformName });
      if (!platform) {
        throw createHttpError(404, "Platform not found");
      }

      const existingGame = await Platform.aggregate([
        { $match: { _id: platform._id } },
        { $unwind: "$games" }, // Deconstruct the games array
        { $match: { $or: [{ "games.name": name }, { "games.slug": slug }] } },
        { $limit: 1 }, // Limit the result to 1 document for performance
      ]);

      if (existingGame.length > 0) {
        throw createHttpError(400, "Game already exists in the platform");
      }

      // Upload thumbnail to Cloudinary
      const thumbnailBuffer = req.files.thumbnail[0].buffer;
      try {
        thumbnailUploadResult = await new Promise<cloudinary.UploadApiResponse>(
          (resolve, reject) => {
            cloudinary.v2.uploader
              .upload_stream(
                { resource_type: "image", folder: platformName },
                (error, result) => {
                  if (error) {
                    return reject(error);
                  }
                  resolve(result as cloudinary.UploadApiResponse);
                }
              )
              .end(thumbnailBuffer);
          }
        );
      } catch (uploadError) {
        throw createHttpError(500, "Failed to upload thumbnail");
      }

      // Handle file for payout
      const jsonData = JSON.parse(
        req.files.payoutFile[0].buffer.toString("utf-8")
      );

      // Check if a Payout with the same gameName already exists
      let payoutId;

      let existingPayout = await Payouts.findOne({ gameName: tagName });
      if (existingPayout) {
        payoutId = existingPayout._id;
      } else {
        const newPayout = new Payouts({
          gameName: tagName,
          data: jsonData,
        });
        await newPayout.save({ session });
        payoutId = newPayout._id;
      }

      const newGame = {
        name,
        thumbnail: thumbnailUploadResult.secure_url,
        url,
        type,
        category,
        status,
        tagName,
        slug,
        payout: payoutId,
      };

      platform.games.push(newGame as any);
      await platform.save({ session });

      await session.commitTransaction();
      session.endSession();

      res.status(201).json(platform);
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      // If thumbnail was uploaded but an error occurred afterward, delete the thumbnail
      if (thumbnailUploadResult && thumbnailUploadResult.public_id) {
        cloudinary.v2.uploader.destroy(
          thumbnailUploadResult.public_id,
          (destroyError, result) => {
            if (destroyError) {
              console.log(
                "Failed to delete thumbnail from Cloudinary:",
                destroyError
              );
            } else {
              console.log("Thumbnail deleted from Cloudinary:", result);
            }
          }
        );
      }

      next(error);
    }
  }

  // POST : Add Platform
  async addPlatform(req: Request, res: Response, next: NextFunction) {
    try {
      const _req = req as AuthRequest;
      const { role } = _req.user;

      if (role != "company") {
        throw createHttpError(
          401,
          "Access denied: You don't have permission to add games"
        );
      }

      const { name } = req.body;

      if (!name) {
        throw createHttpError(400, "Platform name is required");
      }

      const existingPlatform = await Platform.findOne({ name });
      if (existingPlatform) {
        throw createHttpError(
          400,
          "Platform with the same name already exists"
        );
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
        throw createHttpError(
          401,
          "Access denied: You don't have permission to add games"
        );
      }

      const platforms = await Platform.find().select("name");
      res.status(200).json(platforms);
    } catch (error) {
      console.error("Error fetching platforms:", error);
      next(error);
    }
  }

  // PUT : Update a Game
  async updateGame(req: GameRequest, res: Response, next: NextFunction) {
    const session = await mongoose.startSession();
    session.startTransaction();

    let thumbnailUploadResult: cloudinary.UploadApiResponse | undefined;

    try {
      const _req = req as AuthRequest;
      const { username, role } = _req.user;
      const { gameId } = req.params;
      const { status, slug, platformName, ...updateFields } = req.body;
      console.log("Update Game : ", req.body);

      if (!gameId) {
        throw createHttpError(400, "Game ID is required");
      }

      if (!mongoose.Types.ObjectId.isValid(gameId)) {
        throw createHttpError(400, "Invalid Game ID format");
      }

      if (role !== "company") {
        throw createHttpError(
          401,
          "Access denied: You don't have permission to update games"
        );
      }

      const existingGame = await Platform.aggregate([
        { $match: { name: platformName } },
        { $unwind: "$games" },
        { $match: { "games._id": new mongoose.Types.ObjectId(gameId) } },
        { $limit: 1 },
      ]);

      if (!existingGame || existingGame.length === 0) {
        throw createHttpError(404, "Game not found");
      }

      const game = existingGame[0].games;

      // Validate the status field
      if (status && !["active", "inactive"].includes(status)) {
        throw createHttpError(
          400,
          "Invalid status value. It should be either 'active' or 'inactive'"
        );
      }

      // Ensure slug is unique if it is being updated
      if (slug && slug !== game.slug) {
        const existingGameWithSlug = await Platform.findOne({
          "games.slug": slug,
        });
        if (existingGameWithSlug) {
          throw createHttpError(400, "Slug must be unique");
        }
      }

      // Ensure only existing fields in the document are updated
      const fieldsToUpdate = Object.keys(updateFields).reduce(
        (acc: any, key) => {
          if (game[key] !== undefined) {
            acc[key] = updateFields[key];
          }
          return acc;
        },
        {} as { [key: string]: any }
      );

      // Include status and slug fields if they are valid
      if (status) {
        fieldsToUpdate.status = status;
      }
      if (slug) {
        fieldsToUpdate.slug = slug;
      }

      // Handle file for payout update
      if (req.files?.payoutFile) {
        console.log("Payout FIle : ", req.files?.payoutFile);

        // Delete the old payout
        if (game.payout) {
          await Payouts.findByIdAndDelete(game.payout);
        }

        // Add the new payout
        const jsonData = JSON.parse(
          req.files.payoutFile[0].buffer.toString("utf-8")
        );
        const newPayout = new Payouts({
          gameName: game.tagName,
          data: jsonData,
        });

        await newPayout.save({ session });
        fieldsToUpdate.payout = newPayout._id;
      }

      // Handle file for thumbnail update
      if (req.files?.thumbnail) {
        console.log("Thumb : ", req.files?.thumbnail);

        const thumbnailBuffer = req.files.thumbnail[0].buffer;

        thumbnailUploadResult = await new Promise<cloudinary.UploadApiResponse>(
          (resolve, reject) => {
            cloudinary.v2.uploader
              .upload_stream(
                { resource_type: "image", folder: platformName },
                (error, result) => {
                  if (error) {
                    return reject(error);
                  }
                  resolve(result as cloudinary.UploadApiResponse);
                }
              )
              .end(thumbnailBuffer);
          }
        );

        fieldsToUpdate.thumbnail = thumbnailUploadResult.secure_url; // Save the Cloudinary URL
      }

      // If no valid fields to update, return an error
      if (Object.keys(fieldsToUpdate).length === 0) {
        throw createHttpError(400, "No valid fields to update");
      }

      const updatedPlatform = await Platform.findOneAndUpdate(
        {
          name: platformName,
          "games._id": new mongoose.Types.ObjectId(gameId),
        },
        {
          $set: {
            "games.$": { ...game, ...fieldsToUpdate },
          },
        },
        { new: true, session }
      );

      if (!updatedPlatform) {
        throw createHttpError(404, "Platform not found");
      }

      await session.commitTransaction();
      res.status(200).json(updatedPlatform);
    } catch (error) {
      await session.abortTransaction();

      if (thumbnailUploadResult && thumbnailUploadResult.public_id) {
        cloudinary.v2.uploader.destroy(
          thumbnailUploadResult.public_id,
          (destroyError, result) => {
            if (destroyError) {
              console.log(
                "Failed to delete thumbnail from Cloudinary:",
                destroyError
              );
            } else {
              console.log("Thumbnail deleted from Cloudinary:", result);
            }
          }
        );
      }

      if (error instanceof mongoose.Error.CastError) {
        next(createHttpError(400, "Invalid Game ID"));
      } else {
        next(error);
      }
    } finally {
      session.endSession();
    }
  }

  // DELETE : Delete a Game by ID
  async deleteGame(req: GameRequest, res: Response, next: NextFunction) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const _req = req as AuthRequest;
      const { role } = _req.user;
      const { gameId } = req.params;
      const { platformName } = req.query;

      if (!gameId) {
        throw createHttpError(400, "Game ID is required");
      }

      if (!mongoose.Types.ObjectId.isValid(gameId)) {
        throw createHttpError(400, "Invalid Game ID format");
      }

      if (role !== "company") {
        throw createHttpError(
          401,
          "Access denied: You don't have permission to delete games"
        );
      }

      const platform = await Platform.findOne({ name: platformName });
      if (!platform) {
        throw createHttpError(404, "Platform not found");
      }

      const gameIndex = platform.games.findIndex((game: any) =>
        game._id.equals(gameId)
      );
      if (gameIndex === -1) {
        throw createHttpError(404, "Game not found");
      }

      const game = platform.games[gameIndex];

      // Delete the thumbnail from Cloudinary
      if (game.thumbnail) {
        await new Promise<cloudinary.UploadApiResponse>((resolve, reject) => {
          cloudinary.v2.uploader.destroy(game.thumbnail, (error, result) => {
            if (error) {
              return reject(error);
            }
            resolve(result as cloudinary.UploadApiResponse);
          });
        });
      }

      // Delete the payout document
      // if (game.payout) {
      //   await Payouts.findByIdAndDelete(game.payout)
      // }

      // Remove the game from platform's game array
      platform.games.splice(gameIndex, 1);
      await platform.save({ session });

      await session.commitTransaction();
      res.status(200).json({ message: "Game deleted successfully" });
    } catch (error) {
      await session.abortTransaction();
      if (error instanceof mongoose.Error.CastError) {
        next(createHttpError(400, "Invalid Game ID"));
      } else {
        next(error);
      }
    } finally {
      session.endSession();
    }
  }

  // PUT : Fav Game
  async addFavouriteGame(req: Request, res: Response, next: NextFunction) {
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
      let updatedPlayer;

      if (type === "add") {
        updatedPlayer = await Player.findByIdAndUpdate(
          playerId,
          { $addToSet: { favouriteGames: gameId } },
          { new: true }
        );

        message = updatedPlayer.favouriteGames.includes(gameId)
          ? "Game added to favourites"
          : "Game already in favourites";
      } else if (type === "remove") {
        updatedPlayer = await Player.findByIdAndUpdate(
          playerId,
          { $pull: { favouriteGames: gameId } },
          { new: true }
        );

        message = !updatedPlayer.favouriteGames.includes(gameId)
          ? "Game removed from favourites"
          : "Game not found in favourites";
      }

      return res.status(200).json({ message, data: updatedPlayer });
    } catch (error) {
      next(error);
    }
  }
}
