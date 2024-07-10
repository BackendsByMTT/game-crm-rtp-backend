"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const middlware_1 = require("../middleware/middlware");
const gameController_1 = require("./gameController");
const multer_1 = __importDefault(require("multer"));
const checkUser_1 = require("../middleware/checkUser");
const gameController = new gameController_1.GameController();
const gameRoutes = express_1.default.Router();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// GET : Get all Games
gameRoutes.get("/", checkUser_1.checkUser, gameController.getGames);
// POST : Add a Game
gameRoutes.post("/", upload.single("file"), checkUser_1.checkUser, gameController.addGame);
// GET : Get All Platforms
gameRoutes.get("/platforms", checkUser_1.checkUser, gameController.getPlatforms);
// POST : Add a Platform
gameRoutes.post("/platforms", checkUser_1.checkUser, gameController.addPlatform);
gameRoutes.put("/:gameId", upload.single("file"), middlware_1.extractRoleFromCookie, gameController_1.updateGame);
gameRoutes.delete("/:gameId", middlware_1.extractRoleFromCookie, gameController_1.deleteGame);
gameRoutes.get("/:gameId", middlware_1.extractRoleFromCookie, gameController_1.getGameById);
gameRoutes.post("/thumbnail", middlware_1.extractRoleFromCookie, gameController_1.uploadThubnail);
gameRoutes.put("/favourite/:playerId", middlware_1.extractRoleFromCookie, gameController_1.addFavouriteGame);
exports.default = gameRoutes;