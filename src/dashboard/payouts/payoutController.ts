import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import mongoose from "mongoose";
import Payouts from "./payoutModel";
import path from "path";
import { Platform } from "../games/gameModel";
import { ObjectId } from "mongodb";

interface GameRequest extends Request {
  files?: {
    [fieldname: string]: Express.Multer.File[];
  };
}

class PayoutsController {
  async uploadNewVersion(req: GameRequest, res: Response, next: NextFunction) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { tagName, platform: platformName } = req.body;
      const files = req.files.payoutFile;

      if (!files || files.length === 0) {
        throw createHttpError(400, "No files uploaded");
      }

      const payoutFile = files[0];
      const payoutJSONData = JSON.parse(payoutFile.buffer.toString("utf-8"));
      let payoutFileName = path.parse(payoutFile.originalname).name;

      const payout = await Payouts.findOne({ gameName: tagName });

      if (!payout) {
        throw createHttpError(404, "Resource not found");
      }

      // Increment latest version
      payout.latestVersion += 1;
      const newVersion = payout.latestVersion;

      const contentId = new mongoose.Types.ObjectId();

      const newContent = {
        _id: contentId,
        name: `${payoutFileName}-${newVersion}`,
        data: payoutJSONData,
        version: newVersion,
        createdAt: new Date(),
      };

      await Payouts.updateOne(
        { gameName: tagName },
        { $push: { content: newContent }, $set: { latestVersion: newVersion } },
        { session }
      );

      const platform = await Platform.findOneAndUpdate(
        { name: platformName, "games.tagName": tagName },
        { $set: { "games.$.payout": contentId } },
        { new: true, session }
      );

      if (!platform) {
        throw createHttpError(404, "Platform or game not found");
      }
      await session.commitTransaction();
      session.endSession();

      res.status(201).json({ message: "New Version Added" });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      next(error);
    }
  }

  async getPayouts(req: GameRequest, res: Response, next: NextFunction) {
    try {
      res.status(200).json({ message: "You might requires some parameters" });
    } catch (error) {
      next(error);
    }
  }

  async getPayoutVersionName(
    req: GameRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { tagName } = req.params;
      const { platformName } = req.query;

      if (!tagName || !platformName) {
        throw createHttpError(
          401,
          "Please provide a tag name param and platfrom name "
        );
      }

      // Get the platform and active payout for the specified game and platform
      const platform = await Platform.findOne(
        { name: platformName, "games.tagName": tagName },
        { "games.$": 1 }
      );

      if (!platform) {
        return next(createHttpError(404, "Platform or game not found"));
      }

      const game = platform.games[0];
      const activePayoutId = game.payout;

      // Get all payout versions for the specified game
      const payouts = await Payouts.aggregate([
        { $match: { gameName: tagName } },
        { $unwind: "$content" },
        { $sort: { "content.createdAt": -1 } }, // Sort by createdAt in ascending order
        {
          $project: {
            _id: 0,
            "content.name": 1,
            "content._id": 1,
            "content.createdAt": 1,
          },
        },
      ]);

      // Check if payouts exist
      if (!payouts || payouts.length === 0) {
        return next(createHttpError(404, "Game payout not found"));
      }

      const versions = payouts.map((item) => ({
        name: item.content.name,
        createdAt: item.content.createdAt, // Include createdAt in the response
        isActive: item.content._id.equals(activePayoutId),
      }));

      res.status(200).json(versions);
    } catch (error) {
      next(error);
    }
  }

  async getPayoutVersionData(tagName: string, versionId: ObjectId) {
    try {
      const payout = await Payouts.findOne(
        { gameName: tagName, "content._id": versionId },
        { "content.$": 1, _id: 0 }
      );

      if (!payout || payout.content.length === 0) {
        throw createHttpError(404, "Payout version not found");
      }

      const payoutData = payout.content[0].data;

      //

      if (!payoutData) {
        throw createHttpError(
          404,
          "Payout data not found for the specified version."
        );
      }

      return payoutData;
    } catch (error) {
      throw error;
    }
  }

  async updateActivePayout(
    req: GameRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { tagName } = req.params;
      const { version, platform: platformName } = req.body;

      // Validate input presence
      if (!version) {
        return next(createHttpError(400, "Missing version"));
      }
      if (!tagName) {
        return next(createHttpError(400, "Missing tagName"));
      }
      if (!platformName) {
        return next(createHttpError(400, "Missing platform"));
      }

      // Find the game payouts
      const gamePayouts = await Payouts.findOne({ gameName: tagName });
      if (!gamePayouts) {
        throw createHttpError(404, "Payout not found");
      }

      // Find the specific version in content
      const payout = gamePayouts.content.find((item) => item.name === version);
      if (!payout) {
        throw createHttpError(404, "Version not found");
      }

      // Find the platform and check if the current payout version is already the same
      const platform = await Platform.findOne({
        name: platformName,
        "games.tagName": tagName,
      });
      if (!platform) {
        return next(createHttpError(404, "Platform or game not found"));
      }

      const game = platform.games.find((game) => game.tagName === tagName);
      if (game && game.payout.equals(payout._id)) {
        return res
          .status(200)
          .json({
            message: `Version '${version}' is already the active payout for game '${tagName}' on platform '${platformName}'`,
          });
      }

      // Update the platform's game payout
      await Platform.updateOne(
        { _id: platform._id, "games.tagName": tagName },
        { $set: { "games.$.payout": payout._id } }
      );

      res.status(200).json({ message: "Game payout version updated" });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  async deletePayout(req: GameRequest, res: Response, next: NextFunction) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { tagName, version } = req.params;

      // Find the document and check the content array length
      const payoutDoc = await Payouts.findOne({ gameName: tagName });

      if (!payoutDoc) {
        throw createHttpError(404, "Game not found");
      }

      const contentCount = payoutDoc.content.length;

      if (contentCount <= 1) {
        throw createHttpError(400, "Cannot delete the only remaining content");
      }

      // Check if the version exists in the content array and get the version ID
      const versionExists = payoutDoc.content.find(
        (content) => content.name === version
      );

      if (!versionExists) {
        throw createHttpError(404, "Version not found");
      }

      // Check if any game in the Platform collection is using this payout version
      const gameUsingPayout = await Platform.findOne({
        "games.tagName": tagName,
        "games.payout": versionExists._id,
      }).session(session);

      if (gameUsingPayout) {
        throw createHttpError(
          400,
          "Cannot delete the version as it is currently in use"
        );
      }

      // Perform the update operation
      await Payouts.findOneAndUpdate(
        { gameName: tagName },
        { $pull: { content: { name: version } } },
        { new: true, session }
      );

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({ message: "Payout Version deleted successfully" });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      next(error);
    }
  }
}

export default new PayoutsController();
