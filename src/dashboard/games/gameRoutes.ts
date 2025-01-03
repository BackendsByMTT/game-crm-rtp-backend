import express from "express";
import { extractRoleFromCookie, validateApiKey } from "../middleware/middlware";
import { GameController } from "../../dashboard/games/gameController";
import multer from "multer";
import { checkUser } from "../middleware/checkUser";
import { checkGamesToggle } from "../middleware/checkToggle";
import { checkRole } from "../middleware/checkRole";

const gameController = new GameController()
const gameRoutes = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit


// GET : Get all Games
gameRoutes.get("/", validateApiKey, checkUser, checkRole(['admin', 'supermaster', 'player']), checkGamesToggle, gameController.getGames);

// POST : Add a Game
gameRoutes.post('/', upload.fields([{ name: 'thumbnail' }, { name: 'payoutFile' }]), checkUser, checkRole(["admin"]), gameController.addGame);

// GET : Get All Platforms
gameRoutes.get("/platforms", checkUser, checkRole(["admin"]), gameController.getPlatforms)

// POST : Add a Platform
gameRoutes.post("/platforms", checkUser, checkRole(["admin"]), gameController.addPlatform)


gameRoutes.put("/:gameId", upload.fields([{ name: 'thumbnail' }, { name: 'payoutFile' }]), checkUser, checkRole(["admin"]), gameController.updateGame);

gameRoutes.delete("/:gameId", checkUser, checkRole(["admin"]), gameController.deleteGame);
gameRoutes.get("/:gameId", validateApiKey, checkUser, checkRole(["player"]), gameController.getGameBySlug);
gameRoutes.put(
  "/favourite/:playerId",
  checkUser,
  checkRole(["player"]),
  gameController.addFavouriteGame
);


export default gameRoutes;
