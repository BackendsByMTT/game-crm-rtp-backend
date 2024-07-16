import express from "express";
import { extractRoleFromCookie, validateApiKey } from "../middleware/middlware";
import { GameController } from "./gameController";
import multer from "multer";
import { checkUser } from "../middleware/checkUser";

const gameController = new GameController()
const gameRoutes = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET : Get all Games
gameRoutes.get("/", validateApiKey, checkUser, gameController.getGames);

// POST : Add a Game
gameRoutes.post('/', upload.fields([{ name: 'thumbnail' }, { name: 'payoutFile' }]), checkUser, gameController.addGame);

// GET : Get All Platforms
gameRoutes.get("/platforms", checkUser, gameController.getPlatforms)

// POST : Add a Platform
gameRoutes.post("/platforms", checkUser, gameController.addPlatform)


gameRoutes.put("/:gameId", upload.fields([{ name: 'thumbnail' }, { name: 'payoutFile' }]), checkUser, gameController.updateGame);

gameRoutes.delete("/:gameId", checkUser, gameController.deleteGame);
gameRoutes.get("/:gameId", validateApiKey, extractRoleFromCookie, gameController.getGameBySlug);
gameRoutes.put(
  "/favourite/:playerId",
  extractRoleFromCookie,
  gameController.addFavouriteGame
);


export default gameRoutes;