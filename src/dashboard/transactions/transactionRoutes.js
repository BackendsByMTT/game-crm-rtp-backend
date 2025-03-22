"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const transactionController_1 = require("./transactionController");
const checkUser_1 = require("../middleware/checkUser");
const checkRole_1 = require("../middleware/checkRole");
const transactionController = new transactionController_1.TransactionController();
const transactionRoutes = express_1.default.Router();
transactionRoutes.get("/all", checkUser_1.checkUser, (0, checkRole_1.checkRole)(["admin", "supermaster"]), transactionController.getAllTransactions);
transactionRoutes.get("/", checkUser_1.checkUser, (0, checkRole_1.checkRole)(["admin", "supermaster", "master", "distributor", "subdistributor", "store"]), transactionController.getTransactions);
transactionRoutes.get("/:subordinateId", checkUser_1.checkUser, transactionController.getTransactionsBySubId);
exports.default = transactionRoutes;
