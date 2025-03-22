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
exports.TransactionService = void 0;
const http_errors_1 = __importDefault(require("http-errors"));
const transactionModel_1 = __importDefault(require("./transactionModel"));
const userModel_1 = require("../users/userModel");
const sessionManager_1 = require("../session/sessionManager");
const permissions_1 = require("../../utils/permissions");
class TransactionService {
    createTransaction(type, manager, client, amount, session) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if the client is currently in a game via socket connection
            const socketUser = sessionManager_1.sessionManager.getPlayerPlatform(client.username);
            if (socketUser === null || socketUser === void 0 ? void 0 : socketUser.gameData.socket) {
                throw (0, http_errors_1.default)(403, "The client must exit their current game session before initiating a transaction.");
            }
            if (!(0, permissions_1.hasPermission)(manager, `${client.role}s`, "w")) {
                throw (0, http_errors_1.default)(403, "You do not have permission to perform this action.");
            }
            if (type === "recharge") {
                if (manager.credits < amount) {
                    throw (0, http_errors_1.default)(400, "Insufficient credits available for recharge.");
                }
                client.credits += amount;
                client.totalRecharged += amount;
                manager.credits -= amount;
            }
            else if (type === "redeem") {
                if (client.credits < amount) {
                    throw (0, http_errors_1.default)(400, "Client does not have enough credits to redeem.");
                }
                client.credits -= amount;
                client.totalRedeemed += amount;
                manager.credits += amount;
            }
            else {
                throw (0, http_errors_1.default)(400, "Invalid transaction type specified.");
            }
            const transaction = new transactionModel_1.default({
                debtor: type === "recharge" ? manager.username : client.username,
                creditor: type === "recharge" ? client.username : manager.username,
                type: type,
                amount: amount,
                createdAt: new Date(),
            });
            // Update SlotGame instance if the client is currently in a game
            // const socketUser = users.get(client.username);
            // if (socketUser?.currentGame) {
            //   socketUser.currentGame.player.credits = client.credits;
            //   socketUser.currentGame.sendMessage(messageType.CREDITSUPDATE, socketUser.currentGame.player.credits)
            // }
            yield transaction.save({ session });
            return transaction;
        });
    }
    getTransactions(username, page, limit, query, sortField, sortOrder) {
        return __awaiter(this, void 0, void 0, function* () {
            const skip = (page - 1) * limit;
            const user = (yield userModel_1.User.findOne({ username })) || (yield userModel_1.Player.findOne({ username }));
            if (!user) {
                throw new Error("User not found");
            }
            const totalTransactions = yield transactionModel_1.default.countDocuments(Object.assign({ $or: [{ debtor: user.username }, { creditor: user.username }] }, query));
            const totalPages = Math.ceil(totalTransactions / limit);
            if (totalTransactions === 0) {
                return {
                    transactions: [],
                    totalTransactions: 0,
                    totalPages: 0,
                    currentPage: 0,
                    outOfRange: false,
                };
            }
            if (page > totalPages && totalPages !== 0) {
                return {
                    transactions: [],
                    totalTransactions,
                    totalPages,
                    currentPage: page,
                    outOfRange: true,
                };
            }
            const transactions = yield transactionModel_1.default.find({
                $and: [
                    {
                        $or: [{ debtor: user.username }, { creditor: user.username }],
                    },
                    query,
                ],
            })
                .sort({ [sortField]: sortOrder }) // Explicit cast to Record<string, SortOrder>
                .skip((page - 1) * limit)
                .limit(limit);
            console.log("transactions", {
                totalTransactions,
                totalPages,
                currentPage: page,
                outOfRange: false,
            });
            return {
                transactions,
                totalTransactions,
                totalPages,
                currentPage: page,
                outOfRange: false,
            };
        });
    }
    deleteTransaction(id, session) {
        return transactionModel_1.default.findByIdAndDelete(id).session(session);
    }
}
exports.TransactionService = TransactionService;
exports.default = TransactionService;
