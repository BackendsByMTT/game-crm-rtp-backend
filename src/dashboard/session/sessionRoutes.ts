import express from "express";
import sessionController from "./sessionController";
import { checkRole } from "../middleware/checkRole";
const sessionRoutes = express.Router();

sessionRoutes.get(
  "/",
sessionController.playerSessionHandler
);
export default sessionRoutes;