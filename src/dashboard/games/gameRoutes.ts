import express from "express";
import { extractRoleFromCookie, validateApiKey } from "../middleware/middlware";
import { GameController } from "../../dashboard/games/gameController";
import multer from "multer";
import { checkUser } from "../middleware/checkUser";
import { checkGamesToggle } from "../middleware/checkToggle";

const gameController = new GameController()
const gameRoutes = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit


// GET : Get all Games
gameRoutes.get("/", validateApiKey, checkUser,checkGamesToggle, gameController.getGames);

// POST : Add a Game
gameRoutes.post('/', upload.fields([{ name: 'thumbnail' }, { name: 'payoutFile' }]), checkUser, gameController.addGame);

// GET : Get All Platforms
gameRoutes.get("/platforms", checkUser, gameController.getPlatforms)

// POST : Add a Platform
gameRoutes.post("/platforms", checkUser, gameController.addPlatform)


gameRoutes.put("/:gameId", upload.fields([{ name: 'thumbnail' }, { name: 'payoutFile' }]), checkUser, gameController.updateGame);

gameRoutes.delete("/:gameId", checkUser, gameController.deleteGame);
gameRoutes.get("/:gameId", validateApiKey, checkUser, gameController.getGameBySlug);
gameRoutes.put(
  "/favourite/:playerId",
  extractRoleFromCookie,
  gameController.addFavouriteGame
);


export default gameRoutes;
