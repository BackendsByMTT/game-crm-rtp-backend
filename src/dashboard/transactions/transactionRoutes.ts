import express from "express";
import {
  TransactionController,
  // getTransactionsByClientId,
} from "./transactionController";
import { checkUser } from "../middleware/checkUser";
import { checkRole } from "../middleware/checkRole";

const transactionController = new TransactionController()
const transactionRoutes = express.Router();

transactionRoutes.get("/all", checkUser, checkRole(["admin", "supermaster"]), transactionController.getAllTransactions)
transactionRoutes.get("/", checkUser, checkRole(["admin", "supermaster", "master", "distributor", "subdistributor", "store"]), transactionController.getTransactions);
transactionRoutes.get("/:subordinateId", checkUser, transactionController.getTransactionsBySubId);

export default transactionRoutes;
