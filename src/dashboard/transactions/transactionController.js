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
exports.TransactionController = void 0;
const userModel_1 = require("../users/userModel");
const transactionModel_1 = __importDefault(require("./transactionModel"));
const http_errors_1 = __importDefault(require("http-errors"));
const mongoose_1 = __importDefault(require("mongoose"));
const transactionService_1 = __importDefault(require("./transactionService"));
const permissions_1 = require("../../utils/permissions");
class TransactionController {
    constructor() {
        this.transactionService = new transactionService_1.default();
        this.getTransactions = this.getTransactions.bind(this);
        this.getTransactionsBySubId = this.getTransactionsBySubId.bind(this);
        this.deleteTransaction = this.deleteTransaction.bind(this);
        this.getAllTransactions = this.getAllTransactions.bind(this);
    }
    /**
     * Creates a new transaction.
     */
    createTransaction(type, debtor, creditor, amount, session) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const transaction = yield this.transactionService.createTransaction(type, debtor, creditor, amount, session);
                return transaction;
            }
            catch (error) {
                console.error(`Error creating transaction: ${error.message}`);
                throw error;
            }
        });
    }
    /**
     * Retrieves transactions for the authenticated user.
     */
    getTransactions(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const _req = req;
                const { username, role } = _req.user;
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const search = req.query.search;
                const filter = req.query.filter || "";
                const sortOrder = req.query.sort === "desc" ? -1 : 1;
                const typeQuery = req.query.type;
                const startDate = req.query.startDate;
                const endDate = req.query.endDate;
                // console.log(startDate, endDate);
                let parsedData = {
                    role: "",
                    status: "",
                    totalRecharged: { From: 0, To: 0 },
                    totalRedeemed: { From: 0, To: 0 },
                    credits: { From: 0, To: 0 },
                    updatedAt: { From: new Date(), To: new Date() },
                    type: "",
                    amount: { From: 0, To: Infinity },
                };
                let type, updatedAt, amount;
                if (search) {
                    parsedData = JSON.parse(search);
                    if (parsedData) {
                        type = parsedData.type;
                        updatedAt = parsedData.updatedAt;
                        amount = parsedData.amount;
                    }
                }
                let query = {};
                if (!query.$and) {
                    query.$and = []; // Ensure $and array exists
                }
                // Handle date range filtering
                if (startDate || endDate) {
                    const dateFilter = {};
                    if (startDate) {
                        const parsedStartDate = new Date(startDate);
                        if (isNaN(parsedStartDate.getTime())) {
                            throw (0, http_errors_1.default)(400, "Invalid start date format");
                        }
                        parsedStartDate.setHours(0, 0, 0, 0);
                        dateFilter.$gte = parsedStartDate;
                    }
                    if (endDate) {
                        const parsedEndDate = new Date(endDate);
                        if (isNaN(parsedEndDate.getTime())) {
                            throw (0, http_errors_1.default)(400, "Invalid end date format");
                        }
                        parsedEndDate.setHours(23, 59, 59, 999);
                        dateFilter.$lte = parsedEndDate;
                        // Validate date range
                        if (dateFilter.$gte && dateFilter.$gte > parsedEndDate) {
                            throw (0, http_errors_1.default)(400, "Start date cannot be after end date");
                        }
                    }
                    query.$and.push({ createdAt: dateFilter });
                }
                // Handle role-based filtering without overwriting $and
                if (role !== "admin" || !typeQuery) {
                    query.$and.push({
                        $or: [{ debtor: username }, { creditor: username }],
                    });
                }
                if (typeQuery) {
                    query.$and.push({ type: typeQuery });
                }
                else if (type) {
                    query.$and.push({ type: type });
                }
                if (filter) {
                    query.$and.push({
                        $or: [
                            { creditor: { $regex: filter, $options: "i" } },
                            { debtor: { $regex: filter, $options: "i" } },
                        ],
                    });
                }
                if (updatedAt) {
                    const fromDate = new Date(parsedData.updatedAt.From);
                    const toDate = new Date(parsedData.updatedAt.To) || new Date();
                    fromDate.setHours(0, 0, 0, 0);
                    toDate.setHours(23, 59, 59, 999);
                    query.$and.push({
                        updatedAt: {
                            $gte: fromDate,
                            $lte: toDate,
                        },
                    });
                }
                if (amount) {
                    query.$and.push({
                        amount: {
                            $gte: parsedData.amount.From,
                            $lte: parsedData.amount.To,
                        },
                    });
                }
                const totalTransactions = yield transactionModel_1.default.countDocuments(query);
                const totalPages = Math.ceil(totalTransactions / limit);
                if (totalTransactions === 0) {
                    return res.status(200).json({
                        transactions: [],
                        totalTransactions: 0,
                        totalPages: 0,
                        currentPage: 0,
                        outOfRange: false,
                    });
                }
                if (page > totalPages && totalPages !== 0) {
                    return res.status(400).json({
                        message: `Page number ${page} is out of range. There are only ${totalPages} pages available.`,
                        totalTransactions,
                        totalPages,
                        currentPage: page,
                        transactions: [],
                    });
                }
                const transactions = yield transactionModel_1.default.find(query)
                    .sort({ createdAt: sortOrder })
                    .skip((page - 1) * limit)
                    .limit(limit);
                // console.log(totalTransactions);
                res.status(200).json({
                    totalTransactions,
                    totalPages,
                    currentPage: page,
                    transactions,
                });
            }
            catch (error) {
                console.error(`Error fetching transactions: ${error.message}`);
                next(error);
            }
        });
    }
    /**
     * Retrieves transactions for a specific client.
     */
    getTransactionsBySubId(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const _req = req;
                const { username, role } = _req.user;
                const { subordinateId } = req.params;
                const startDate = req.query.startDate;
                const endDate = req.query.endDate;
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const sortOrder = req.query.sort === "desc" ? -1 : 1; // Default to ascending order
                console.log("getTransactionsBySubId : ");
                const user = yield userModel_1.User.findOne({ username });
                const subordinate = (yield userModel_1.User.findOne({ _id: subordinateId })) ||
                    (yield userModel_1.Player.findOne({ _id: subordinateId }));
                if (!user) {
                    throw (0, http_errors_1.default)(404, "Unable to find logged in user");
                }
                if (!subordinate) {
                    throw (0, http_errors_1.default)(404, "User not found");
                }
                let query = {};
                // Add date range filtering
                if (startDate || endDate) {
                    query.createdAt = {};
                    if (startDate) {
                        const parsedStartDate = new Date(startDate);
                        if (isNaN(parsedStartDate.getTime())) {
                            throw (0, http_errors_1.default)(400, "Invalid start date format");
                        }
                        parsedStartDate.setHours(0, 0, 0, 0);
                        query.createdAt.$gte = parsedStartDate;
                    }
                    if (endDate) {
                        const parsedEndDate = new Date(endDate);
                        if (isNaN(parsedEndDate.getTime())) {
                            throw (0, http_errors_1.default)(400, "Invalid end date format");
                        }
                        parsedEndDate.setHours(23, 59, 59, 999);
                        query.createdAt.$lte = parsedEndDate;
                        if (query.createdAt.$gte && query.createdAt.$gte > parsedEndDate) {
                            throw (0, http_errors_1.default)(400, "Start date cannot be after end date");
                        }
                    }
                }
                if (user.role === "supermaster" ||
                    user.subordinates.includes(new mongoose_1.default.Types.ObjectId(subordinateId))) {
                    const { transactions, totalTransactions, totalPages, currentPage, outOfRange, } = yield this.transactionService.getTransactions(subordinate.username, page, limit, query, "createdAt", sortOrder);
                    if (outOfRange) {
                        return res.status(400).json({
                            message: `Page number ${page} is out of range. There are only ${totalPages} pages available.`,
                            totalTransactions,
                            totalPages,
                            currentPage: page,
                            transactions: [],
                        });
                    }
                    res.status(200).json({
                        totalTransactions,
                        totalPages,
                        currentPage,
                        transactions,
                    });
                }
                else {
                    throw (0, http_errors_1.default)(403, "Forbidden: You do not have the necessary permissions to access this resource.");
                }
            }
            catch (error) {
                console.error(`Error fetching transactions by client ID: ${error.message}`);
                next(error);
            }
        });
    }
    getAllTransactions(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const _req = req;
                const { username, role } = _req.user;
                const currentUser = yield userModel_1.User.findOne({ username: username, role: role });
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const search = req.query.search;
                const filter = req.query.filter || "";
                const sortOrder = req.query.sort === "desc" ? -1 : 1; // Default to ascending order
                const skip = (page - 1) * limit;
                const startDate = req.query.startDate;
                const endDate = req.query.endDate;
                let parsedData = {
                    role: "",
                    status: "",
                    totalRecharged: { From: 0, To: 0 },
                    totalRedeemed: { From: 0, To: 0 },
                    credits: { From: 0, To: 0 },
                    updatedAt: { From: new Date(), To: new Date() },
                    type: "",
                    amount: { From: 0, To: Infinity },
                };
                let type, updatedAt, amount;
                if (search) {
                    parsedData = JSON.parse(search);
                    if (parsedData) {
                        type = parsedData.type;
                        updatedAt = parsedData.updatedAt;
                        amount = parsedData.amount;
                    }
                }
                let query = {};
                if (startDate || endDate || (parsedData === null || parsedData === void 0 ? void 0 : parsedData.updatedAt)) {
                    query.updatedAt = {};
                    if (startDate) {
                        const parsedStartDate = new Date(startDate);
                        if (isNaN(parsedStartDate.getTime())) {
                            throw (0, http_errors_1.default)(400, "Invalid start date format");
                        }
                        parsedStartDate.setHours(0, 0, 0, 0);
                        query.updatedAt.$gte = parsedStartDate;
                    }
                    else if ((_a = parsedData === null || parsedData === void 0 ? void 0 : parsedData.updatedAt) === null || _a === void 0 ? void 0 : _a.From) {
                        const fromDate = new Date(parsedData.updatedAt.From);
                        fromDate.setHours(0, 0, 0, 0);
                        query.updatedAt.$gte = fromDate;
                    }
                    if (endDate) {
                        const parsedEndDate = new Date(endDate);
                        if (isNaN(parsedEndDate.getTime())) {
                            throw (0, http_errors_1.default)(400, "Invalid end date format");
                        }
                        parsedEndDate.setHours(23, 59, 59, 999);
                        query.updatedAt.$lte = parsedEndDate;
                    }
                    else if ((_b = parsedData === null || parsedData === void 0 ? void 0 : parsedData.updatedAt) === null || _b === void 0 ? void 0 : _b.To) {
                        const toDate = new Date(parsedData.updatedAt.To);
                        toDate.setHours(23, 59, 59, 999);
                        query.updatedAt.$lte = toDate;
                    }
                    if (query.updatedAt.$gte && query.updatedAt.$lte &&
                        query.updatedAt.$gte > query.updatedAt.$lte) {
                        throw (0, http_errors_1.default)(400, "Start date cannot be after end date");
                    }
                }
                if (type) {
                    query.type = type;
                }
                if (filter) {
                    query.$or = [
                        { creditor: { $regex: filter, $options: "i" } },
                        { debtor: { $regex: filter, $options: "i" } },
                    ];
                }
                if (updatedAt) {
                    const fromDate = new Date(parsedData.updatedAt.From);
                    const toDate = parsedData.updatedAt.To
                        ? new Date(parsedData.updatedAt.To)
                        : new Date();
                    fromDate.setHours(0, 0, 0, 0);
                    toDate.setHours(23, 59, 59, 999);
                    query.updatedAt = {
                        $gte: fromDate,
                        $lte: toDate,
                    };
                }
                if (amount) {
                    query.amount = {
                        $gte: parsedData.amount.From,
                        $lte: parsedData.amount.To,
                    };
                }
                // If the user is not an admin, only return transactions that involve the user or their subordinates
                if (!(0, permissions_1.isAdmin)(currentUser)) {
                    const allSubordinateIds = yield this.getAllSubordinateIds(currentUser._id, currentUser.role);
                    query.$or = [
                        { creditor: { $in: [currentUser.username, ...allSubordinateIds] } },
                        { debtor: { $in: [currentUser.username, ...allSubordinateIds] } },
                    ];
                }
                const totalTransactions = yield transactionModel_1.default.countDocuments(query);
                const totalPages = Math.ceil(totalTransactions / limit);
                // Check if the requested page is out of range
                if (page > totalPages && totalPages !== 0) {
                    return res.status(400).json({
                        message: `Page number ${page} is out of range. There are only ${totalPages} pages available.`,
                        totalTransactions,
                        totalPages,
                        currentPage: page,
                        transactions: [],
                    });
                }
                const transactions = yield transactionModel_1.default.find(query)
                    .sort({ "createdAt": sortOrder }) // Sort by the specified field and order
                    .skip(skip)
                    .limit(limit);
                res.status(200).json({
                    totalTransactions,
                    totalPages,
                    currentPage: page,
                    transactions,
                });
            }
            catch (error) {
                console.error(`Error fetching all transactions by client ID: ${error}`);
                console.log(error);
                next(error);
            }
        });
    }
    /**
     * Deletes a transaction.
     */
    deleteTransaction(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const { id } = req.params;
            const session = yield mongoose_1.default.startSession();
            session.startTransaction();
            try {
                if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                    throw (0, http_errors_1.default)(400, "Invalid transaction ID");
                }
                const deletedTransaction = yield this.transactionService.deleteTransaction(id, session);
                if (deletedTransaction instanceof mongoose_1.default.Query) {
                    const result = yield deletedTransaction.lean().exec();
                    if (!result) {
                        throw (0, http_errors_1.default)(404, "Transaction not found");
                    }
                    res.status(200).json({ message: "Transaction deleted successfully" });
                }
                else {
                    if (!deletedTransaction) {
                        throw (0, http_errors_1.default)(404, "Transaction not found");
                    }
                    res.status(200).json({ message: "Transaction deleted successfully" });
                }
            }
            catch (error) {
                yield session.abortTransaction();
                session.endSession();
                console.error(`Error deleting transaction: ${error.message}`);
                next(error);
            }
        });
    }
    getAllSubordinateIds(userId, role) {
        return __awaiter(this, void 0, void 0, function* () {
            let allSubordinateIds = [];
            if (role === "store") {
                // Fetch subordinates from the Player collection
                const directSubordinates = yield userModel_1.Player.find({ createdBy: userId }, { _id: 1 });
                const directSubordinateIds = directSubordinates.map(sub => sub._id);
                allSubordinateIds = [...directSubordinateIds];
            }
            else {
                // Fetch subordinates from the User collection
                const directSubordinates = yield userModel_1.User.find({ createdBy: userId }, { _id: 1, role: 1 });
                const directSubordinateIds = directSubordinates.map(sub => sub._id);
                allSubordinateIds = [...directSubordinateIds];
                // If the role is company, also fetch subordinates from the Player collection
                if (role === "supermaster") {
                    const directPlayerSubordinates = yield userModel_1.Player.find({ createdBy: userId }, { _id: 1 });
                    const directPlayerSubordinateIds = directPlayerSubordinates.map(sub => sub._id);
                    allSubordinateIds = [...allSubordinateIds, ...directPlayerSubordinateIds];
                }
                for (const sub of directSubordinates) {
                    const subSubordinateIds = yield this.getAllSubordinateIds(sub._id, sub.role);
                    allSubordinateIds = [...allSubordinateIds, ...subSubordinateIds];
                }
            }
            return allSubordinateIds;
        });
    }
}
exports.TransactionController = TransactionController;
