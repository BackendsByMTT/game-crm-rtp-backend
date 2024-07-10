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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addFavouriteGame = exports.uploadThubnail = exports.getGameById = exports.deleteGame = exports.updateGame = exports.GameController = void 0;
const gameModel_1 = require("./gameModel");
const gameModel_2 = __importDefault(require("./gameModel"));
const http_errors_1 = __importDefault(require("http-errors"));
const mongoose_1 = __importDefault(require("mongoose"));
const utils_1 = require("../../utils/utils");
const userModel_1 = require("../users/userModel");
class GameController {
    constructor() {
        this.getGames = this.getGames.bind(this);
        this.addGame = this.addGame.bind(this);
    }
    // GET : Games
    getGames(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const _req = req;
                const { category, platform } = req.query;
                const { username, role } = _req.user;
                if (!platform) {
                    throw (0, http_errors_1.default)(400, "Platform query parameter is required");
                }
                let matchStage = {};
                if (category && category !== "all" && category !== "fav") {
                    matchStage.category = category;
                }
                if (platform) {
                    if (platform === "crm") {
                        const games = yield gameModel_2.default.aggregate([{ $match: matchStage }]);
                        return res.status(200).json(games);
                    }
                    const platformDoc = yield gameModel_1.Platform.findOne({ name: platform }).populate("games");
                    if (!platformDoc) {
                        throw (0, http_errors_1.default)(404, `Platform ${platform} not found`);
                    }
                    // Use the game IDs from the platform for aggregation
                    matchStage._id = { $in: platformDoc.games.map(game => game._id) };
                }
                if (role === "player") {
                    if (category === "fav") {
                        const player = yield userModel_1.Player.findOne({ username }).populate("favouriteGames");
                        if (!player) {
                            throw (0, http_errors_1.default)(404, "Player not found");
                        }
                        console.log("Player : ", player);
                        const favouriteGames = yield gameModel_2.default.find({ _id: { $in: player.favouriteGames } });
                        console.log("FAv : ", favouriteGames);
                        return res.status(200).json({ featured: [], others: favouriteGames });
                    }
                    else {
                        const games = yield gameModel_2.default.aggregate([
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
                        return res.status(200).json(games[0]);
                    }
                }
                else if (role === "company") {
                    const games = yield gameModel_2.default.aggregate([{ $match: matchStage }]);
                    return res.status(200).json(games);
                }
                else {
                    return next((0, http_errors_1.default)(403, "Access denied: You don't have permission to access this resource."));
                }
            }
            catch (error) {
                next(error);
            }
        });
    }
    // POST : Add Game
    addGame(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = yield mongoose_1.default.startSession();
            session.startTransaction();
            try {
                const _req = req;
                const { role } = _req.user;
                if (role != "company") {
                    throw (0, http_errors_1.default)(401, "Access denied: You don't have permission to add games");
                }
                const { name, thumbnail, url, type, category, status, tagName, slug, platform } = req.body;
                if (!name ||
                    !thumbnail ||
                    !url ||
                    !type ||
                    !category ||
                    !status ||
                    !tagName ||
                    !slug ||
                    !req.file ||
                    !platform) {
                    throw (0, http_errors_1.default)(400, "All required fields must be provided, including the payout file and platform");
                }
                const existingGame = yield gameModel_2.default.findOne({ $or: [{ name }, { slug }] }).session(session);
                if (existingGame) {
                    throw (0, http_errors_1.default)(409, "Game with the same name or slug already exists");
                }
                // Find the platform
                const platformDoc = yield gameModel_1.Platform.findOne({ name: platform }).session(session);
                if (!platformDoc) {
                    throw (0, http_errors_1.default)(400, `Platform ${platform} not found`);
                }
                // Handle file for payout
                const jsonData = JSON.parse(req.file.buffer.toString("utf-8"));
                const newPayout = new gameModel_1.Payouts({
                    gameName: tagName,
                    data: jsonData,
                });
                yield newPayout.save({ session });
                const game = new gameModel_2.default({
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
                const savedGame = yield game.save({ session });
                platformDoc.games.push(savedGame._id);
                yield platformDoc.save({ session });
                yield session.commitTransaction();
                session.endSession();
                res.status(201).json(savedGame);
            }
            catch (error) {
                yield session.abortTransaction();
                session.endSession();
                next(error);
            }
        });
    }
    // POST : Add Platform
    addPlatform(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const _req = req;
                const { role } = _req.user;
                if (role != "company") {
                    throw (0, http_errors_1.default)(401, "Access denied: You don't have permission to add games");
                }
                const { name } = req.body;
                if (!name) {
                    throw (0, http_errors_1.default)(400, "Platform name is required");
                }
                const existingPlatform = yield gameModel_1.Platform.findOne({ name });
                if (existingPlatform) {
                    throw (0, http_errors_1.default)(400, "Platform with the same name already exists");
                }
                const newPlatform = new gameModel_1.Platform({ name, games: [] });
                const savedPlatform = yield newPlatform.save();
                res.status(201).json(savedPlatform);
            }
            catch (error) {
                console.error("Error adding platform:", error);
                next(error);
            }
        });
    }
    // GET : Get all Platform
    getPlatforms(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const _req = req;
                const { role } = _req.user;
                if (role != "company") {
                    throw (0, http_errors_1.default)(401, "Access denied: You don't have permission to add games");
                }
                const platforms = yield gameModel_1.Platform.find();
                res.status(200).json(platforms);
            }
            catch (error) {
                console.error("Error fetching platforms:", error);
                next(error);
            }
        });
    }
}
exports.GameController = GameController;
// DONE
const updateGame = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { gameId } = req.params;
        const _a = req.body, { creatorRole, status, slug } = _a, updateFields = __rest(_a, ["creatorRole", "status", "slug"]);
        if (!gameId) {
            throw (0, http_errors_1.default)(400, "Game ID is required");
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(gameId)) {
            throw (0, http_errors_1.default)(400, "Invalid Game ID format");
        }
        if (creatorRole !== "company") {
            throw (0, http_errors_1.default)(401, "Access denied: You don't have permission to update games");
        }
        // Check if the game exists
        const game = yield gameModel_2.default.findById(gameId);
        if (!game) {
            throw (0, http_errors_1.default)(404, "Game not found");
        }
        // Validate the status field
        if (status && !["active", "inactive"].includes(status)) {
            throw (0, http_errors_1.default)(400, "Invalid status value. It should be either 'active' or 'inactive'");
        }
        // Ensure slug is unique if it is being updated
        if (slug && slug !== game.slug) {
            const existingGameWithSlug = yield gameModel_2.default.findOne({ slug });
            if (existingGameWithSlug) {
                throw (0, http_errors_1.default)(400, "Slug must be unique");
            }
        }
        // Ensure only existing fields in the document are updated
        const fieldsToUpdate = Object.keys(updateFields).reduce((acc, key) => {
            if (game[key] !== undefined) {
                acc[key] = updateFields[key];
            }
            return acc;
        }, {});
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
                yield gameModel_1.Payouts.findByIdAndDelete(game.payout);
            }
            // Add the new payout
            const jsonData = JSON.parse(req.file.buffer.toString("utf-8"));
            const newPayout = new gameModel_1.Payouts({
                gameName: game.name,
                data: jsonData,
            });
            yield newPayout.save();
            fieldsToUpdate.payout = newPayout._id;
        }
        // If no valid fields to update, return an error
        if (Object.keys(fieldsToUpdate).length === 0) {
            throw (0, http_errors_1.default)(400, "No valid fields to update");
        }
        const updatedGame = yield gameModel_2.default.findByIdAndUpdate(gameId, { $set: fieldsToUpdate }, { new: true });
        res.status(200).json(updatedGame);
    }
    catch (error) {
        if (error instanceof mongoose_1.default.Error.CastError) {
            next((0, http_errors_1.default)(400, "Invalid Game ID"));
        }
        else {
            next(error);
        }
    }
});
exports.updateGame = updateGame;
// DONE
const deleteGame = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { gameId } = req.params;
        const { creatorRole } = req.body;
        if (!gameId) {
            throw (0, http_errors_1.default)(400, "Game ID is required");
        }
        if (creatorRole !== "company") {
            throw (0, http_errors_1.default)(401, "Access denied: You don't have permission to delete games");
        }
        const deletedGame = yield gameModel_2.default.findByIdAndDelete(gameId);
        if (!deletedGame) {
            throw (0, http_errors_1.default)(404, "Game not found");
        }
        res.status(200).json({ message: "Game deleted successfully" });
    }
    catch (error) {
        next(error);
    }
});
exports.deleteGame = deleteGame;
// DONE
const getGameById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { gameId } = req.params;
        if (!gameId) {
            throw (0, http_errors_1.default)(400, "Game ID is required");
        }
        const game = yield gameModel_2.default.findOne({ slug: gameId });
        console.log("Game : ", game);
        if (!game) {
            throw (0, http_errors_1.default)(404, "Game not found");
        }
        if (game.status === "active") {
            res.status(200).json({ url: game.url });
        }
        else {
            res
                .status(200)
                .json({ message: "This game is currently under maintenance" });
        }
    }
    catch (error) {
        next(error);
    }
});
exports.getGameById = getGameById;
const uploadThubnail = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.body.image) {
        return res.status(400).json({ error: "Please upload the image" });
    }
    try {
        const image = req.body.image;
        const imageUrl = yield (0, utils_1.uploadImage)(image);
        res.json({
            message: "File uploaded successfully",
            imageUrl: imageUrl,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to upload file" });
    }
});
exports.uploadThubnail = uploadThubnail;
const addFavouriteGame = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { playerId } = req.params;
        const { gameId, type } = req.body;
        if (!playerId || !gameId) {
            throw (0, http_errors_1.default)(400, "Player ID and Game ID are required");
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(playerId)) {
            throw (0, http_errors_1.default)(400, "Invalid Player ID format");
        }
        if (type !== "add" && type !== "remove") {
            throw (0, http_errors_1.default)(400, "Invalid type value. It should be either 'add' or 'remove'");
        }
        const player = yield userModel_1.Player.findById(playerId);
        if (!player) {
            throw (0, http_errors_1.default)(404, "Player not found");
        }
        let message;
        if (type === "add") {
            const updateResult = yield userModel_1.Player.updateOne({ _id: playerId }, { $addToSet: { favouriteGames: gameId } });
            message = updateResult.modifiedCount > 0
                ? "Game added to favourites"
                : "Game already in favourites";
        }
        else if (type === "remove") {
            const updateResult = yield userModel_1.Player.updateOne({ _id: playerId }, { $pull: { favouriteGames: gameId } });
            message = updateResult.modifiedCount > 0
                ? "Game removed from favourites"
                : "Game not found in favourites";
        }
        yield player.save();
        res.status(200).json({ message: message });
    }
    catch (error) {
        next(error);
    }
});
exports.addFavouriteGame = addFavouriteGame;