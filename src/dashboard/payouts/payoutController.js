"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_errors_1 = __importDefault(require("http-errors"));
const mongoose_1 = __importDefault(require("mongoose"));
const payoutModel_1 = __importDefault(require("./payoutModel"));
const path_1 = __importDefault(require("path"));
const gameModel_1 = require("../games/gameModel");
const sessionManager_1 = require("../session/sessionManager");
class PayoutsController {
    uploadNewVersion(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = yield mongoose_1.default.startSession();
            session.startTransaction();
            try {
                const { tagName, platform: platformName } = req.body;
                const files = req.files.payoutFile;
                if (!files || files.length === 0) {
                    throw (0, http_errors_1.default)(400, "No files uploaded");
                }
                const payoutFile = files[0];
                const payoutJSONData = JSON.parse(payoutFile.buffer.toString("utf-8"));
                let payoutFileName = path_1.default.parse(payoutFile.originalname).name;
                const payout = yield payoutModel_1.default.findOne({ gameName: tagName });
                if (!payout) {
                    throw (0, http_errors_1.default)(404, "Resource not found");
                }
                // Increment latest version
                payout.latestVersion += 1;
                const newVersion = payout.latestVersion;
                const contentId = new mongoose_1.default.Types.ObjectId();
                const newContent = {
                    _id: contentId,
                    name: `${payoutFileName}-${newVersion}`,
                    data: payoutJSONData,
                    version: newVersion,
                    createdAt: new Date(),
                };
                yield payoutModel_1.default.updateOne({ gameName: tagName }, { $push: { content: newContent }, $set: { latestVersion: newVersion } }, { session });
                const platform = yield gameModel_1.Platform.findOneAndUpdate({ name: platformName, "games.tagName": tagName }, { $set: { "games.$.payout": contentId } }, { new: true, session });
                if (!platform) {
                    throw (0, http_errors_1.default)(404, "Platform or game not found");
                }
                for (const [username, playerSocket] of sessionManager_1.sessionManager.getPlatformSessions()) {
                    const gameId = payoutFileName.split('_')[0];
                    if (playerSocket.currentGameData.gameId === gameId) {
                        playerSocket.currentGameData.currentGameManager.currentGameType.currentGame.initialize(payoutJSONData);
                    }
                }
                yield session.commitTransaction();
                session.endSession();
                res.status(201).json({ message: "New Version Added" });
            }
            catch (error) {
                yield session.abortTransaction();
                session.endSession();
                next(error);
            }
        });
    }
    getPayouts(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                res.status(200).json({ message: "You might requires some parameters" });
            }
            catch (error) {
                next(error);
            }
        });
    }
    getPayoutVersionName(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { tagName } = req.params;
                const { platformName } = req.query;
                if (!tagName || !platformName) {
                    throw (0, http_errors_1.default)(401, "Please provide a tag name param and platfrom name ");
                }
                // Get the platform and active payout for the specified game and platform
                const platform = yield gameModel_1.Platform.findOne({ name: platformName, "games.tagName": tagName }, { "games.$": 1 });
                if (!platform) {
                    return next((0, http_errors_1.default)(404, "Platform or game not found"));
                }
                const game = platform.games[0];
                const activePayoutId = game.payout;
                // Get all payout versions for the specified game
                const payouts = yield payoutModel_1.default.aggregate([
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
                    return next((0, http_errors_1.default)(404, "Game payout not found"));
                }
                const versions = payouts.map((item) => ({
                    name: item.content.name,
                    createdAt: item.content.createdAt, // Include createdAt in the response
                    isActive: item.content._id.equals(activePayoutId),
                }));
                res.status(200).json(versions);
            }
            catch (error) {
                next(error);
            }
        });
    }
    getPayoutVersionData(tagName, versionId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const payout = yield payoutModel_1.default.findOne({ gameName: tagName, "content._id": versionId }, { "content.$": 1, _id: 0 });
                if (!payout || payout.content.length === 0) {
                    throw (0, http_errors_1.default)(404, "Payout version not found");
                }
                const payoutData = payout.content[0].data;
                //
                if (!payoutData) {
                    throw (0, http_errors_1.default)(404, "Payout data not found for the specified version.");
                }
                return payoutData;
            }
            catch (error) {
                throw error;
            }
        });
    }
    updateActivePayout(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { tagName } = req.params;
                const { version, platform: platformName } = req.body;
                // Validate input presence
                if (!version) {
                    return next((0, http_errors_1.default)(400, "Missing version"));
                }
                if (!tagName) {
                    return next((0, http_errors_1.default)(400, "Missing tagName"));
                }
                if (!platformName) {
                    return next((0, http_errors_1.default)(400, "Missing platform"));
                }
                // Find the game payouts
                const gamePayouts = yield payoutModel_1.default.findOne({ gameName: tagName });
                if (!gamePayouts) {
                    throw (0, http_errors_1.default)(404, "Payout not found");
                }
                // Find the specific version in content
                const payout = gamePayouts.content.find((item) => item.name === version);
                if (!payout) {
                    throw (0, http_errors_1.default)(404, "Version not found");
                }
                // Find the platform and check if the current payout version is already the same
                const platform = yield gameModel_1.Platform.findOne({
                    name: platformName,
                    "games.tagName": tagName,
                });
                if (!platform) {
                    return next((0, http_errors_1.default)(404, "Platform or game not found"));
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
                yield gameModel_1.Platform.updateOne({ _id: platform._id, "games.tagName": tagName }, { $set: { "games.$.payout": payout._id } });
                const targetPayoutId = payout._id.toString();
                const currentUpdatedPayout = yield payoutModel_1.default.aggregate([
                    { $match: { gameName: tagName } },
                    { $unwind: "$content" },
                    { $unwind: "$content.data" },
                    {
                        $project: {
                            gameName: 1,
                            "content.name": 1,
                            "content.data": 1,
                            "content._id": 1,
                        }
                    },
                    { $sort: { "content.createdAt": -1 } }
                ]);
                const matchingPayout = currentUpdatedPayout.find(payout => payout.content._id.toString() === targetPayoutId);
                for (const [username, playerSocket] of sessionManager_1.sessionManager.getPlatformSessions()) {
                    const gameId = tagName;
                    if (playerSocket.currentGameData.gameId === gameId) {
                        playerSocket.currentGameData.gameSettings;
                        // initialize(matchingPayout.content.data)
                    }
                }
                res.status(200).json({ message: "Game payout version updated" });
            }
            catch (error) {
                console.error(error);
                next(error);
            }
        });
    }
    deletePayout(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = yield mongoose_1.default.startSession();
            session.startTransaction();
            try {
                const { tagName, version } = req.params;
                // Find the document and check the content array length
                const payoutDoc = yield payoutModel_1.default.findOne({ gameName: tagName });
                if (!payoutDoc) {
                    throw (0, http_errors_1.default)(404, "Game not found");
                }
                const contentCount = payoutDoc.content.length;
                if (contentCount <= 1) {
                    throw (0, http_errors_1.default)(400, "Cannot delete the only remaining content");
                }
                // Check if the version exists in the content array and get the version ID
                const versionExists = payoutDoc.content.find((content) => content.name === version);
                if (!versionExists) {
                    throw (0, http_errors_1.default)(404, "Version not found");
                }
                // Check if any game in the Platform collection is using this payout version
                const gameUsingPayout = yield gameModel_1.Platform.findOne({
                    "games.tagName": tagName,
                    "games.payout": versionExists._id,
                }).session(session);
                if (gameUsingPayout) {
                    throw (0, http_errors_1.default)(400, "Cannot delete the version as it is currently in use");
                }
                // Perform the update operation
                yield payoutModel_1.default.findOneAndUpdate({ gameName: tagName }, { $pull: { content: { name: version } } }, { new: true, session });
                yield session.commitTransaction();
                session.endSession();
                res.status(200).json({ message: "Payout Version deleted successfully" });
            }
            catch (error) {
                yield session.abortTransaction();
                session.endSession();
                next(error);
            }
        });
    }
}
exports.default = new PayoutsController();
