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
exports.GameController = void 0;
const gameModel_1 = require("./gameModel");
const http_errors_1 = __importDefault(require("http-errors"));
const mongoose_1 = __importDefault(require("mongoose"));
const userModel_1 = require("../users/userModel");
const cloudinary_1 = __importDefault(require("cloudinary"));
const config_1 = require("../../config/config");
cloudinary_1.default.v2.config({
    cloud_name: config_1.config.cloud_name,
    api_key: config_1.config.api_key,
    api_secret: config_1.config.api_secret,
});
class GameController {
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
    getGames(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const _req = req;
                const { category, platform } = req.query;
                const { username, role } = _req.user;
                if (!platform) {
                    throw (0, http_errors_1.default)(400, "Platform query parameter is required");
                }
                if (role === "player") {
                    if (category === "fav") {
                        const player = yield userModel_1.Player.findOne({ username });
                        if (!player) {
                            throw (0, http_errors_1.default)(404, "Player not found");
                        }
                        const favoriteGameIds = player.favouriteGames.map((game) => new mongoose_1.default.Types.ObjectId(game));
                        console.log("favoriteGameIds : ", favoriteGameIds);
                        const favoriteGames = yield gameModel_1.Platform.aggregate([
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
                        console.log("favoriteGames : ", (_a = favoriteGames[0]) === null || _a === void 0 ? void 0 : _a.games);
                        if (!favoriteGames.length) {
                            return res.status(200).json({ featured: [], others: [] });
                        }
                        return res
                            .status(200)
                            .json({ featured: [], others: (_b = favoriteGames[0]) === null || _b === void 0 ? void 0 : _b.games });
                    }
                    else {
                        const platformDoc = yield gameModel_1.Platform.aggregate([
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
                }
                else if (role === "company") {
                    const platformDoc = yield gameModel_1.Platform.aggregate([
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
                    const allGames = platformDoc.reduce((acc, platform) => acc.concat(platform.games), []);
                    return res.status(200).json(allGames);
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
    // GET : Get Game By Slug
    getGameBySlug(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { gameId: slug } = req.params;
                if (!slug) {
                    throw (0, http_errors_1.default)(400, "Slug parameter is required");
                }
                const platform = yield gameModel_1.Platform.aggregate([
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
                    throw (0, http_errors_1.default)(404, "Game not found");
                }
                const game = platform[0];
                if (game.status === "active") {
                    res.status(200).json({ url: game.url });
                }
                else {
                    res
                        .status(200)
                        .json({ message: "The game is currently under maintenance." });
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
            let thumbnailUploadResult;
            try {
                const _req = req;
                const { role } = _req.user;
                if (role != "company") {
                    throw (0, http_errors_1.default)(401, "Access denied: You don't have permission to add games");
                }
                const { name, url, type, category, status, tagName, slug, platform: platformName, } = req.body;
                console.log("Add : ", req.body);
                console.log("Thumb : ", req.files.thumbnail);
                console.log("payoutFile : ", req.files.payoutFile);
                if (!name ||
                    !url ||
                    !type ||
                    !category ||
                    !status ||
                    !tagName ||
                    !slug ||
                    !req.files.thumbnail ||
                    !req.files.payoutFile ||
                    !platformName) {
                    throw (0, http_errors_1.default)(400, "All required fields must be provided, including the payout file and platform");
                }
                const platform = yield gameModel_1.Platform.findOne({ name: platformName });
                if (!platform) {
                    throw (0, http_errors_1.default)(404, "Platform not found");
                }
                const existingGame = yield gameModel_1.Platform.aggregate([
                    { $match: { _id: platform._id } },
                    { $unwind: "$games" }, // Deconstruct the games array
                    { $match: { $or: [{ "games.name": name }, { "games.slug": slug }] } },
                    { $limit: 1 }, // Limit the result to 1 document for performance
                ]);
                if (existingGame.length > 0) {
                    throw (0, http_errors_1.default)(400, "Game already exists in the platform");
                }
                // Upload thumbnail to Cloudinary
                const thumbnailBuffer = req.files.thumbnail[0].buffer;
                try {
                    thumbnailUploadResult = yield new Promise((resolve, reject) => {
                        cloudinary_1.default.v2.uploader
                            .upload_stream({ resource_type: "image", folder: platformName }, (error, result) => {
                            if (error) {
                                return reject(error);
                            }
                            resolve(result);
                        })
                            .end(thumbnailBuffer);
                    });
                }
                catch (uploadError) {
                    throw (0, http_errors_1.default)(500, "Failed to upload thumbnail");
                }
                // Handle file for payout
                const jsonData = JSON.parse(req.files.payoutFile[0].buffer.toString("utf-8"));
                // Check if a Payout with the same gameName already exists
                let payoutId;
                let existingPayout = yield gameModel_1.Payouts.findOne({ gameName: tagName });
                if (existingPayout) {
                    payoutId = existingPayout._id;
                }
                else {
                    const newPayout = new gameModel_1.Payouts({
                        gameName: tagName,
                        data: jsonData,
                    });
                    yield newPayout.save({ session });
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
                platform.games.push(newGame);
                yield platform.save({ session });
                yield session.commitTransaction();
                session.endSession();
                res.status(201).json(platform);
            }
            catch (error) {
                yield session.abortTransaction();
                session.endSession();
                // If thumbnail was uploaded but an error occurred afterward, delete the thumbnail
                if (thumbnailUploadResult && thumbnailUploadResult.public_id) {
                    cloudinary_1.default.v2.uploader.destroy(thumbnailUploadResult.public_id, (destroyError, result) => {
                        if (destroyError) {
                            console.log("Failed to delete thumbnail from Cloudinary:", destroyError);
                        }
                        else {
                            console.log("Thumbnail deleted from Cloudinary:", result);
                        }
                    });
                }
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
                const platforms = yield gameModel_1.Platform.find().select("name");
                res.status(200).json(platforms);
            }
            catch (error) {
                console.error("Error fetching platforms:", error);
                next(error);
            }
        });
    }
    // PUT : Update a Game
    updateGame(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const session = yield mongoose_1.default.startSession();
            session.startTransaction();
            let thumbnailUploadResult;
            try {
                const _req = req;
                const { username, role } = _req.user;
                const { gameId } = req.params;
                const _e = req.body, { status, slug, platformName } = _e, updateFields = __rest(_e, ["status", "slug", "platformName"]);
                console.log("Update Game : ", req.body);
                if (!gameId) {
                    throw (0, http_errors_1.default)(400, "Game ID is required");
                }
                if (!mongoose_1.default.Types.ObjectId.isValid(gameId)) {
                    throw (0, http_errors_1.default)(400, "Invalid Game ID format");
                }
                if (role !== "company") {
                    throw (0, http_errors_1.default)(401, "Access denied: You don't have permission to update games");
                }
                const existingGame = yield gameModel_1.Platform.aggregate([
                    { $match: { name: platformName } },
                    { $unwind: "$games" },
                    { $match: { "games._id": new mongoose_1.default.Types.ObjectId(gameId) } },
                    { $limit: 1 },
                ]);
                if (!existingGame || existingGame.length === 0) {
                    throw (0, http_errors_1.default)(404, "Game not found");
                }
                const game = existingGame[0].games;
                // Validate the status field
                if (status && !["active", "inactive"].includes(status)) {
                    throw (0, http_errors_1.default)(400, "Invalid status value. It should be either 'active' or 'inactive'");
                }
                // Ensure slug is unique if it is being updated
                if (slug && slug !== game.slug) {
                    const existingGameWithSlug = yield gameModel_1.Platform.findOne({
                        "games.slug": slug,
                    });
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
                if ((_a = req.files) === null || _a === void 0 ? void 0 : _a.payoutFile) {
                    console.log("Payout FIle : ", (_b = req.files) === null || _b === void 0 ? void 0 : _b.payoutFile);
                    // Delete the old payout
                    if (game.payout) {
                        yield gameModel_1.Payouts.findByIdAndDelete(game.payout);
                    }
                    // Add the new payout
                    const jsonData = JSON.parse(req.files.payoutFile[0].buffer.toString("utf-8"));
                    const newPayout = new gameModel_1.Payouts({
                        gameName: game.tagName,
                        data: jsonData,
                    });
                    yield newPayout.save({ session });
                    fieldsToUpdate.payout = newPayout._id;
                }
                // Handle file for thumbnail update
                if ((_c = req.files) === null || _c === void 0 ? void 0 : _c.thumbnail) {
                    console.log("Thumb : ", (_d = req.files) === null || _d === void 0 ? void 0 : _d.thumbnail);
                    const thumbnailBuffer = req.files.thumbnail[0].buffer;
                    thumbnailUploadResult = yield new Promise((resolve, reject) => {
                        cloudinary_1.default.v2.uploader
                            .upload_stream({ resource_type: "image", folder: platformName }, (error, result) => {
                            if (error) {
                                return reject(error);
                            }
                            resolve(result);
                        })
                            .end(thumbnailBuffer);
                    });
                    fieldsToUpdate.thumbnail = thumbnailUploadResult.secure_url; // Save the Cloudinary URL
                }
                // If no valid fields to update, return an error
                if (Object.keys(fieldsToUpdate).length === 0) {
                    throw (0, http_errors_1.default)(400, "No valid fields to update");
                }
                const updatedPlatform = yield gameModel_1.Platform.findOneAndUpdate({
                    name: platformName,
                    "games._id": new mongoose_1.default.Types.ObjectId(gameId),
                }, {
                    $set: {
                        "games.$": Object.assign(Object.assign({}, game), fieldsToUpdate),
                    },
                }, { new: true, session });
                if (!updatedPlatform) {
                    throw (0, http_errors_1.default)(404, "Platform not found");
                }
                yield session.commitTransaction();
                res.status(200).json(updatedPlatform);
            }
            catch (error) {
                yield session.abortTransaction();
                if (thumbnailUploadResult && thumbnailUploadResult.public_id) {
                    cloudinary_1.default.v2.uploader.destroy(thumbnailUploadResult.public_id, (destroyError, result) => {
                        if (destroyError) {
                            console.log("Failed to delete thumbnail from Cloudinary:", destroyError);
                        }
                        else {
                            console.log("Thumbnail deleted from Cloudinary:", result);
                        }
                    });
                }
                if (error instanceof mongoose_1.default.Error.CastError) {
                    next((0, http_errors_1.default)(400, "Invalid Game ID"));
                }
                else {
                    next(error);
                }
            }
            finally {
                session.endSession();
            }
        });
    }
    // DELETE : Delete a Game by ID
    deleteGame(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = yield mongoose_1.default.startSession();
            session.startTransaction();
            try {
                const _req = req;
                const { role } = _req.user;
                const { gameId } = req.params;
                const { platformName } = req.query;
                if (!gameId) {
                    throw (0, http_errors_1.default)(400, "Game ID is required");
                }
                if (!mongoose_1.default.Types.ObjectId.isValid(gameId)) {
                    throw (0, http_errors_1.default)(400, "Invalid Game ID format");
                }
                if (role !== "company") {
                    throw (0, http_errors_1.default)(401, "Access denied: You don't have permission to delete games");
                }
                const platform = yield gameModel_1.Platform.findOne({ name: platformName });
                if (!platform) {
                    throw (0, http_errors_1.default)(404, "Platform not found");
                }
                const gameIndex = platform.games.findIndex((game) => game._id.equals(gameId));
                if (gameIndex === -1) {
                    throw (0, http_errors_1.default)(404, "Game not found");
                }
                const game = platform.games[gameIndex];
                // Delete the thumbnail from Cloudinary
                if (game.thumbnail) {
                    yield new Promise((resolve, reject) => {
                        cloudinary_1.default.v2.uploader.destroy(game.thumbnail, (error, result) => {
                            if (error) {
                                return reject(error);
                            }
                            resolve(result);
                        });
                    });
                }
                // Delete the payout document
                // if (game.payout) {
                //   await Payouts.findByIdAndDelete(game.payout)
                // }
                // Remove the game from platform's game array
                platform.games.splice(gameIndex, 1);
                yield platform.save({ session });
                yield session.commitTransaction();
                res.status(200).json({ message: "Game deleted successfully" });
            }
            catch (error) {
                yield session.abortTransaction();
                if (error instanceof mongoose_1.default.Error.CastError) {
                    next((0, http_errors_1.default)(400, "Invalid Game ID"));
                }
                else {
                    next(error);
                }
            }
            finally {
                session.endSession();
            }
        });
    }
    // PUT : Fav Game
    addFavouriteGame(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
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
                let updatedPlayer;
                if (type === "add") {
                    updatedPlayer = yield userModel_1.Player.findByIdAndUpdate(playerId, { $addToSet: { favouriteGames: gameId } }, { new: true });
                    message = updatedPlayer.favouriteGames.includes(gameId)
                        ? "Game added to favourites"
                        : "Game already in favourites";
                }
                else if (type === "remove") {
                    updatedPlayer = yield userModel_1.Player.findByIdAndUpdate(playerId, { $pull: { favouriteGames: gameId } }, { new: true });
                    message = !updatedPlayer.favouriteGames.includes(gameId)
                        ? "Game removed from favourites"
                        : "Game not found in favourites";
                }
                return res.status(200).json({ message, data: updatedPlayer });
            }
            catch (error) {
                next(error);
            }
        });
    }
}
exports.GameController = GameController;
