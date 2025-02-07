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
exports.UserController = void 0;
const utils_1 = require("../../utils/utils");
const http_errors_1 = __importDefault(require("http-errors"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../../config/config");
const bcrypt_1 = __importDefault(require("bcrypt"));
const mongoose_1 = __importDefault(require("mongoose"));
const userModel_1 = require("./userModel");
const userService_1 = __importDefault(require("./userService"));
const transactionModel_1 = __importDefault(require("../transactions/transactionModel"));
const sessionManager_1 = require("../session/sessionManager");
const permissions_1 = require("../../utils/permissions");
class UserController {
    constructor() {
        this.userService = new userService_1.default();
        this.loginUser = this.loginUser.bind(this);
        this.createUser = this.createUser.bind(this);
        this.getCurrentUser = this.getCurrentUser.bind(this);
        this.getAllSubordinates = this.getAllSubordinates.bind(this);
        this.getAllPlayers = this.getAllPlayers.bind(this);
        this.getSubordinateById = this.getSubordinateById.bind(this);
        this.deleteUser = this.deleteUser.bind(this);
        this.updateClient = this.updateClient.bind(this);
        this.getReport = this.getReport.bind(this);
        this.getASubordinateReport = this.getASubordinateReport.bind(this);
        this.getCurrentUserSubordinates =
            this.getCurrentUserSubordinates.bind(this);
        this.generatePassword = this.generatePassword.bind(this);
        this.logoutUser = this.logoutUser.bind(this);
    }
    checkUser(username, role) {
        return __awaiter(this, void 0, void 0, function* () {
            let user = null;
            if (role === "player") {
                user = yield this.userService.findPlayerByUsername(username);
            }
            else {
                user = yield this.userService.findUserByUsername(username);
            }
            if (!user) {
                return null; // User not found
            }
            return user;
        });
    }
    static getSubordinateRoles(role) {
        return this.rolesHierarchy[role] || [];
    }
    static isRoleValid(role, subordinateRole) {
        return this.getSubordinateRoles(role).includes(subordinateRole);
    }
    static getStartAndEndOfPeriod(type) {
        const start = new Date();
        const end = new Date();
        switch (type) {
            case "weekly":
                start.setDate(start.getDate() - start.getDay()); // set to start of the week
                start.setHours(0, 0, 0, 0);
                end.setDate(end.getDate() + (6 - end.getDay())); // set to end of the week
                end.setHours(23, 59, 59, 999);
                break;
            case "monthly":
                start.setDate(1); // set to start of the month
                start.setHours(0, 0, 0, 0);
                end.setMonth(end.getMonth() + 1);
                end.setDate(0); // set to end of the month
                end.setHours(23, 59, 59, 999);
                break;
            case "daily":
            default:
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
        }
        return { start, end };
    }
    generatePassword(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
            const uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            const digitChars = "0123456789";
            const specialChars = '!@#$%^&()_/,.?":{}|<>';
            let password = "";
            password += this.userService.getRandomChar(lowercaseChars);
            password += this.userService.getRandomChar(uppercaseChars);
            password += this.userService.getRandomChar(digitChars);
            password += this.userService.getRandomChar(specialChars);
            const remainingLength = 8 - password.length;
            for (let i = 0; i < remainingLength; i++) {
                const randomSet = Math.floor(Math.random() * 3);
                if (randomSet === 0) {
                    password += this.userService.getRandomChar(lowercaseChars);
                }
                else if (randomSet === 1) {
                    password += this.userService.getRandomChar(uppercaseChars);
                }
                else {
                    password += this.userService.getRandomChar(digitChars);
                }
            }
            password = this.userService.shuffleString(password);
            res.status(200).json({ password });
        });
    }
    loginUser(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { username, password } = req.body;
                if (!username || !password) {
                    throw (0, http_errors_1.default)(400, "Username, password are required");
                }
                let user = (yield userModel_1.User.findOne({ username })) || (yield userModel_1.Player.findOne({ username }));
                if (!user) {
                    throw (0, http_errors_1.default)(401, "User not found");
                }
                const isPasswordValid = yield bcrypt_1.default.compare(password, user.password);
                if (!isPasswordValid) {
                    throw (0, http_errors_1.default)(401, "Invalid username or password");
                }
                if (user.role === "player") {
                    yield userModel_1.Player.updateOne({ _id: user._id }, { $set: { lastLogin: new Date(), $inc: { loginTimes: 1 } } });
                }
                else {
                    yield userModel_1.User.updateOne({ _id: user._id }, {
                        $set: { lastLogin: new Date(), $inc: { loginTimes: 1 } }
                    });
                }
                const token = jsonwebtoken_1.default.sign({ id: user._id, username: user.username, role: user.role }, config_1.config.jwtSecret, { expiresIn: "7d" });
                res.cookie("userToken", token, {
                    maxAge: 1000 * 60 * 60 * 24 * 7,
                    httpOnly: true,
                    sameSite: "none",
                });
                const socketUser = sessionManager_1.sessionManager.getPlayerPlatform(username);
                if (((_a = socketUser === null || socketUser === void 0 ? void 0 : socketUser.platformData.socket) === null || _a === void 0 ? void 0 : _a.connected) || (socketUser === null || socketUser === void 0 ? void 0 : socketUser.gameData.socket)) {
                    throw (0, http_errors_1.default)(403, "Already logged in on another browser or tab.");
                }
                if (socketUser === null || socketUser === void 0 ? void 0 : socketUser.gameData.socket) {
                    throw (0, http_errors_1.default)(403, "You Are Already Playing on another browser or tab.");
                }
                res.status(200).json({
                    message: "Login successful",
                    token: token,
                    role: user.role,
                });
            }
            catch (error) {
                console.error("Login error:", error);
                next(error);
            }
        });
    }
    logoutUser(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const _req = req;
                const { username, role } = _req.user;
                if (!username) {
                    throw (0, http_errors_1.default)(400, "Username is required");
                }
                // Clear the user token cookie
                res.clearCookie("userToken", {
                    httpOnly: true,
                    sameSite: "none",
                });
                res.status(200).json({
                    message: "Logout successful",
                });
            }
            catch (error) {
                console.log(error);
                next(error);
            }
        });
    }
    createUser(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = yield mongoose_1.default.startSession();
            session.startTransaction();
            try {
                const _req = req;
                const { user } = req.body;
                const { username, role } = _req.user;
                if (!user ||
                    !user.name ||
                    !user.username ||
                    !user.password ||
                    !user.role ||
                    user.credits === undefined) {
                    throw (0, http_errors_1.default)(400, "All required fields must be provided");
                }
                let currentUser = yield this.userService.findUserByUsername(username, session);
                if (!currentUser) {
                    throw (0, http_errors_1.default)(404, "Current User not found");
                }
                // if (!UserController.hasAccess(currentUser, user.role)) {
                //   throw createHttpError(403, `You cannot create a ${user.role}`);
                // }
                let existingUser = (yield this.userService.findPlayerByUsername(user.username, session)) ||
                    (yield this.userService.findUserByUsername(user.username, session));
                if (existingUser) {
                    throw (0, http_errors_1.default)(409, "User already exists");
                }
                const hashedPassword = yield bcrypt_1.default.hash(user.password, 10);
                let newUser;
                if (user.role === "player") {
                    newUser = yield this.userService.createPlayer(Object.assign(Object.assign({}, user), { createdBy: currentUser._id }), 0, hashedPassword, session);
                }
                else {
                    newUser = yield this.userService.createUser(Object.assign(Object.assign({}, user), { createdBy: currentUser._id }), 0, hashedPassword, session);
                }
                if (user.credits > 0) {
                    const transaction = yield this.userService.createTransaction("recharge", currentUser, newUser, user.credits, session);
                    newUser.transactions.push(transaction._id);
                    currentUser.transactions.push(transaction._id);
                }
                yield newUser.save({ session });
                currentUser.subordinates.push(newUser._id);
                yield currentUser.save({ session });
                yield session.commitTransaction();
                res.status(201).json(newUser);
            }
            catch (error) {
                next(error);
            }
            finally {
                session.endSession();
            }
        });
    }
    getCurrentUser(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const _req = req;
                const { username, role } = _req.user;
                let user = yield this.checkUser(username, role);
                if (!user) {
                    throw (0, http_errors_1.default)(404, `${username} not found`);
                }
                res.status(200).json(user);
            }
            catch (error) {
                next(error);
            }
        });
    }
    getAllSubordinates(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log("GET ALL SUBORDINATES");
                const _req = req;
                const { username: currentUsername, role: currentUserRole } = _req.user;
                const currentUser = yield this.checkUser(currentUsername, currentUserRole);
                if (!currentUser) {
                    throw (0, http_errors_1.default)(404, "User not found");
                }
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const skip = (page - 1) * limit;
                const sortOrder = req.query.sort === "desc" ? -1 : 1; // Default to ascending order
                const filter = req.query.filter || "";
                const search = req.query.search;
                let parsedData = {
                    role: "",
                    status: "",
                    totalRecharged: { From: 0, To: Infinity },
                    totalRedeemed: { From: 0, To: Infinity },
                    credits: { From: 0, To: Infinity },
                    updatedAt: { From: null, To: null },
                    type: "",
                    amount: { From: 0, To: 0 },
                };
                let role, status, redeem, recharge, credits;
                if (search) {
                    parsedData = JSON.parse(search);
                    if (parsedData) {
                        role = parsedData.role;
                        status = parsedData.status;
                        redeem = parsedData.totalRedeemed;
                        recharge = parsedData.totalRecharged;
                        credits = parsedData.credits;
                    }
                }
                let query = {};
                if (filter) {
                    query.username = { $regex: filter, $options: "i" };
                }
                if (role) {
                    query.role = { $ne: currentUser.role, $eq: role };
                }
                else if (!role) {
                    query.role = { $ne: currentUser.role };
                }
                if (status) {
                    query.status = status;
                }
                if (parsedData.totalRecharged) {
                    query.totalRecharged = {
                        $gte: parsedData.totalRecharged.From,
                        $lte: parsedData.totalRecharged.To,
                    };
                }
                if (parsedData.totalRedeemed) {
                    query.totalRedeemed = {
                        $gte: parsedData.totalRedeemed.From,
                        $lte: parsedData.totalRedeemed.To,
                    };
                }
                if (parsedData.credits) {
                    query.credits = {
                        $gte: parsedData.credits.From,
                        $lte: parsedData.credits.To,
                    };
                }
                // If the user is not an admin, fetch all direct and indirect subordinates
                if (!(0, permissions_1.isAdmin)(currentUser)) {
                    const allSubordinateIds = yield this.userService.getAllSubordinateIds(currentUser._id, currentUser.role);
                    query._id = { $in: allSubordinateIds };
                }
                // Aggregation pipeline for User collection
                const userPipeline = [
                    { $match: query },
                    { $project: { _id: 1, name: 1, username: 1, status: 1, totalRedeemed: 1, totalRecharged: 1, credits: 1, createdAt: 1, role: 1 } }
                ];
                // Combined pipeline with $unionWith for PlayerModel collection
                const combinedPipeline = [
                    ...userPipeline,
                    {
                        $unionWith: {
                            coll: "players", // Replace with the actual MongoDB collection name for PlayerModel
                            pipeline: [
                                { $match: query },
                                { $project: { _id: 1, name: 1, username: 1, status: 1, totalRedeemed: 1, totalRecharged: 1, credits: 1, createdAt: 1, role: 1 } }
                            ]
                        }
                    },
                    { $sort: { createdAt: sortOrder } }, // Global sorting
                    { $skip: skip }, // Pagination: skip to the correct page
                    { $limit: limit } // Pagination: limit the number of results
                ];
                // Execute the aggregation pipeline
                const subordinates = yield userModel_1.User.aggregate(combinedPipeline);
                // Calculate total counts
                const userCount = yield userModel_1.User.countDocuments(query);
                const playerCount = yield userModel_1.Player.countDocuments(query);
                const totalSubordinates = userCount + playerCount;
                const totalPages = Math.ceil(totalSubordinates / limit);
                // Response for no data
                if (totalSubordinates === 0) {
                    return res.status(200).json({
                        message: "No subordinates found",
                        totalSubordinates: 0,
                        totalPages: 0,
                        currentPage: 0,
                        subordinates: []
                    });
                }
                // Validate requested page number
                if (page > totalPages) {
                    return res.status(400).json({
                        message: `Page number ${page} is out of range. There are only ${totalPages} pages available.`,
                        totalSubordinates,
                        totalPages,
                        currentPage: page,
                        subordinates: []
                    });
                }
                // Success response
                res.status(200).json({
                    totalSubordinates,
                    totalPages,
                    currentPage: page,
                    subordinates
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    getAllPlayers(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const activePlayers = new Set();
                sessionManager_1.sessionManager.getPlatformSessions().forEach((value, key) => {
                    activePlayers.add({ username: key, currentGame: value.currentGameData.gameId });
                });
                const _req = req;
                const { username: currentUsername, role: currentUserRole } = _req.user;
                const currentUser = yield this.checkUser(currentUsername, currentUserRole);
                if (!currentUser) {
                    throw (0, http_errors_1.default)(404, "User not found");
                }
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const skip = (page - 1) * limit;
                const filter = req.query.filter || "";
                const search = req.query.search;
                let parsedData = {
                    role: "",
                    status: "",
                    totalRecharged: { From: 0, To: Infinity },
                    totalRedeemed: { From: 0, To: Infinity },
                    credits: { From: 0, To: Infinity },
                    updatedAt: { From: null, To: null },
                    type: "",
                    amount: { From: 0, To: 0 },
                };
                let role, status, redeem, recharge, credits;
                if (search) {
                    parsedData = JSON.parse(search);
                    if (parsedData) {
                        role = parsedData.role;
                        status = parsedData.status;
                        redeem = parsedData.totalRedeemed;
                        recharge = parsedData.totalRecharged;
                        credits = parsedData.credits;
                    }
                }
                let query = {
                    username: { $in: Array.from(activePlayers).map((player) => player.username) },
                };
                if (filter) {
                    query.username.$regex = filter;
                    query.username.$options = "i";
                }
                if (role) {
                    query.role = role;
                }
                if (status) {
                    query.status = status;
                }
                if (parsedData.totalRecharged) {
                    query.totalRecharged = {
                        $gte: parsedData.totalRecharged.From,
                        $lte: parsedData.totalRecharged.To,
                    };
                }
                if (parsedData.totalRedeemed) {
                    query.totalRedeemed = {
                        $gte: parsedData.totalRedeemed.From,
                        $lte: parsedData.totalRedeemed.To,
                    };
                }
                if (parsedData.credits) {
                    query.credits = {
                        $gte: parsedData.credits.From,
                        $lte: parsedData.credits.To,
                    };
                }
                // If the user is not an admin, fetch all direct and indirect players
                if (!(0, permissions_1.isAdmin)(currentUser)) {
                    const allPlayerSubordinateIds = yield (0, utils_1.getAllPlayerSubordinateIds)(currentUser._id, currentUser.role);
                    query.createdBy = { $in: allPlayerSubordinateIds };
                }
                const playerCount = yield userModel_1.Player.countDocuments(query);
                const totalPages = Math.ceil(playerCount / limit);
                if (playerCount === 0) {
                    return res.status(200).json({
                        message: "No players found",
                        totalSubordinates: 0,
                        totalPages: 0,
                        currentPage: 0,
                        subordinates: [],
                    });
                }
                if (page > totalPages) {
                    return res.status(400).json({
                        message: `Page number ${page} is out of range. There are only ${totalPages} pages available.`,
                        totalSubordinates: playerCount,
                        totalPages,
                        currentPage: page,
                        subordinates: [],
                    });
                }
                const players = yield userModel_1.Player.find(query).skip(skip).limit(limit);
                const playersWithGameInfo = players.map(player => {
                    const activePlayer = Array.from(activePlayers).find((ap) => ap.username === player.username);
                    return Object.assign(Object.assign({}, player.toObject()), { currentGame: (activePlayer === null || activePlayer === void 0 ? void 0 : activePlayer.currentGame) || 'inactive' });
                });
                res.status(200).json({
                    totalSubordinates: playerCount,
                    totalPages,
                    currentPage: page,
                    subordinates: playersWithGameInfo,
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    getCurrentUserSubordinates(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const _req = req;
                const { username, role } = _req.user;
                const { id } = req.query;
                const currentUser = yield this.checkUser(username, role);
                if (!currentUser) {
                    throw (0, http_errors_1.default)(401, "User not found");
                }
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const skip = (page - 1) * limit;
                const sortOrder = req.query.sort === "desc" ? -1 : 1; // Default to ascending
                let userToCheck = currentUser;
                if (id) {
                    userToCheck = (yield userModel_1.User.findById(id)) || (yield userModel_1.Player.findById(id));
                    if (!userToCheck) {
                        return res.status(404).json({ message: "User not found" });
                    }
                }
                let filterRole, status, redeem, recharge, credits;
                const filter = req.query.filter || "";
                const search = req.query.search;
                let parsedData = {
                    role: "",
                    status: "",
                    totalRecharged: { From: 0, To: Infinity },
                    totalRedeemed: { From: 0, To: Infinity },
                    credits: { From: 0, To: Infinity },
                    updatedAt: { From: new Date(), To: new Date() },
                    type: "",
                    amount: { From: 0, To: 0 },
                };
                if (search) {
                    parsedData = JSON.parse(search);
                    if (parsedData) {
                        filterRole = parsedData.role;
                        status = parsedData.status;
                        redeem = parsedData.totalRedeemed;
                        recharge = parsedData.totalRecharged;
                        credits = parsedData.credits;
                    }
                }
                let query = {};
                query.createdBy = userToCheck._id;
                if (filter) {
                    query.username = { $regex: filter, $options: "i" };
                }
                if (filterRole) {
                    query.role = { $ne: currentUser.role, $eq: filterRole };
                }
                else if (!filterRole) {
                    query.role = { $ne: currentUser.role };
                }
                if (status) {
                    query.status = status;
                }
                if (parsedData.totalRecharged) {
                    query.totalRecharged = {
                        $gte: parsedData.totalRecharged.From,
                        $lte: parsedData.totalRecharged.To,
                    };
                }
                if (parsedData.totalRedeemed) {
                    query.totalRedeemed = {
                        $gte: parsedData.totalRedeemed.From,
                        $lte: parsedData.totalRedeemed.To,
                    };
                }
                if (parsedData.credits) {
                    query.credits = {
                        $gte: parsedData.credits.From,
                        $lte: parsedData.credits.To,
                    };
                }
                // Aggregation pipeline
                const userPipeline = [
                    { $match: query },
                    { $project: { _id: 1, name: 1, username: 1, status: 1, totalRedeemed: 1, totalRecharged: 1, credits: 1, createdAt: 1, role: 1 } }
                ];
                const combinedPipeline = [
                    ...userPipeline,
                    {
                        $unionWith: {
                            coll: "players", // Replace with the actual collection name for PlayerModel
                            pipeline: [
                                { $match: query },
                                { $project: { _id: 1, name: 1, username: 1, status: 1, totalRedeemed: 1, totalRecharged: 1, credits: 1, createdAt: 1, role: 1 } }
                            ]
                        }
                    },
                    { $sort: { "createdAt": sortOrder } }, // Global sorting
                    { $skip: skip }, // Pagination
                    { $limit: limit } // Pagination
                ];
                // Execute the aggregation
                const subordinates = yield userModel_1.User.aggregate(combinedPipeline);
                // Total counts
                const userCount = yield userModel_1.User.countDocuments(query);
                const playerCount = yield userModel_1.Player.countDocuments(query);
                const totalSubordinates = userCount + playerCount;
                const totalPages = Math.ceil(totalSubordinates / limit);
                // Handle no results
                if (totalSubordinates === 0) {
                    return res.status(200).json({
                        message: "No subordinates found",
                        totalSubordinates: 0,
                        totalPages: 0,
                        currentPage: 0,
                        subordinates: [],
                    });
                }
                // Handle out-of-range page
                if (page > totalPages) {
                    return res.status(400).json({
                        message: `Page number ${page} is out of range. There are only ${totalPages} pages available.`,
                        totalSubordinates,
                        totalPages,
                        currentPage: page,
                        subordinates: [],
                    });
                }
                // Return response
                res.status(200).json({
                    totalSubordinates,
                    totalPages,
                    currentPage: page,
                    subordinates,
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    deleteUser(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const _req = req;
                const { username, role } = _req.user;
                const { clientId } = req.params;
                if (!clientId) {
                    throw (0, http_errors_1.default)(400, "Client Id is required");
                }
                const clientObjectId = new mongoose_1.default.Types.ObjectId(clientId);
                let admin = yield this.userService.findUserByUsername(username);
                if (!admin) {
                    throw (0, http_errors_1.default)(404, "User Not Found");
                }
                const client = (yield this.userService.findUserById(clientObjectId)) ||
                    (yield this.userService.findPlayerById(clientObjectId));
                if (!client) {
                    throw (0, http_errors_1.default)(404, "User not found");
                }
                if (!(0, permissions_1.hasPermission)(admin, `${client.role}s`, 'x')) {
                    throw (0, http_errors_1.default)(403, `Access denied. You don't have permission to delete ${client.username}.`);
                }
                if (client instanceof userModel_1.User) {
                    yield this.userService.deleteUserById(clientObjectId);
                }
                else if (client instanceof userModel_1.Player) {
                    yield this.userService.deletePlayerById(clientObjectId);
                }
                admin.subordinates = admin.subordinates.filter((id) => !id.equals(clientObjectId));
                yield admin.save();
                res.status(200).json({ message: "Client deleted successfully" });
            }
            catch (error) {
                next(error);
            }
        });
    }
    updateClient(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const _req = req;
                const { username, role } = _req.user;
                const { clientId } = req.params;
                const { status, credits, password } = req.body;
                if (!clientId) {
                    throw (0, http_errors_1.default)(400, "Client Id is required");
                }
                const clientObjectId = new mongoose_1.default.Types.ObjectId(clientId);
                let admin = (yield this.userService.findUserByUsername(username)) || (yield this.userService.findPlayerByUsername(username));
                if (!admin) {
                    throw (0, http_errors_1.default)(404, "User not found");
                }
                const client = (yield this.userService.findUserById(clientObjectId)) || (yield this.userService.findPlayerById(clientObjectId));
                if (!client) {
                    throw (0, http_errors_1.default)(404, "Client not found");
                }
                if (!(0, permissions_1.hasPermission)(admin, `${client.role}s`, "w")) {
                    throw (0, http_errors_1.default)(403, "Access denied. You don't have permission to update users.");
                }
                if (status) {
                    (0, utils_1.updateStatus)(client, status);
                }
                if (password) {
                    yield (0, utils_1.updatePassword)(client, password);
                }
                if (credits) {
                    credits.amount = Number(credits.amount);
                    yield (0, utils_1.updateCredits)(client, admin, credits);
                }
                yield admin.save();
                yield client.save();
                res.status(200).json({ message: "Client updated successfully", client });
            }
            catch (error) {
                console.log("Error in updating : ", error);
                next(error);
            }
        });
    }
    getSubordinateById(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const _req = req;
                const { subordinateId } = req.params;
                const { username: loggedUserName, role: loggedUserRole } = _req.user;
                const subordinateObjectId = new mongoose_1.default.Types.ObjectId(subordinateId);
                const loggedUser = yield this.userService.findUserByUsername(loggedUserName);
                let user;
                user = (yield this.userService.findUserById(subordinateObjectId)) || (yield this.userService.findPlayerById(subordinateObjectId));
                if (!user) {
                    throw (0, http_errors_1.default)(404, "User not found");
                }
                if (loggedUserRole === "admin" ||
                    loggedUser.subordinates.includes(subordinateObjectId) ||
                    user._id.toString() == loggedUser._id.toString()) {
                    let client;
                    switch (user.role) {
                        case "admin":
                            client = yield userModel_1.User.findById(subordinateId).populate({
                                path: "transactions",
                                model: transactionModel_1.default,
                            });
                            const userSubordinates = yield userModel_1.User.find({
                                createdBy: subordinateId,
                            });
                            const playerSubordinates = yield userModel_1.Player.find({
                                createdBy: subordinateId,
                            });
                            client = client.toObject();
                            client.subordinates = [...userSubordinates, ...playerSubordinates];
                            break;
                        case "store":
                            client = yield userModel_1.User.findById(subordinateId)
                                .populate({ path: "subordinates", model: userModel_1.Player })
                                .populate({ path: "transactions", model: transactionModel_1.default });
                            break;
                        case "player":
                            client = user;
                            break;
                        default:
                            client = yield userModel_1.User.findById(subordinateObjectId)
                                .populate({ path: "transactions", model: transactionModel_1.default })
                                .populate({ path: "subordinates", model: userModel_1.User });
                    }
                    if (!client) {
                        throw (0, http_errors_1.default)(404, "Client not found");
                    }
                    res.status(200).json(client);
                }
                else {
                    throw (0, http_errors_1.default)(403, "Forbidden: You do not have the necessary permissions to access this resource.");
                }
            }
            catch (error) {
                next(error);
            }
        });
    }
    getReport(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                const _req = req;
                const { username, role } = _req.user;
                const { type, userId } = req.query;
                const { start, end } = UserController.getStartAndEndOfPeriod(type);
                const currentUser = yield userModel_1.User.findOne({ username });
                if (!currentUser) {
                    throw (0, http_errors_1.default)(401, "User not found");
                }
                let targetUser = currentUser;
                if (userId) {
                    let subordinate = yield userModel_1.User.findById(userId);
                    if (!subordinate) {
                        subordinate = yield userModel_1.Player.findById(userId);
                        if (!subordinate) {
                            throw (0, http_errors_1.default)(404, "Subordinate user not found");
                        }
                    }
                    targetUser = subordinate;
                }
                if (targetUser.role === "admin") {
                    // Total Recharge Amount
                    const totalRechargedAmt = yield transactionModel_1.default.aggregate([
                        {
                            $match: {
                                $and: [
                                    {
                                        createdAt: {
                                            $gte: start,
                                            $lte: end,
                                        },
                                    },
                                    {
                                        type: "recharge",
                                    },
                                ],
                            },
                        },
                        {
                            $group: {
                                _id: null,
                                totalAmount: {
                                    $sum: "$amount",
                                },
                            },
                        },
                    ]);
                    // Total Redeem Amount
                    const totalRedeemedAmt = yield transactionModel_1.default.aggregate([
                        {
                            $match: {
                                $and: [
                                    {
                                        createdAt: {
                                            $gte: start,
                                            $lte: end,
                                        },
                                    },
                                    {
                                        type: "redeem",
                                    },
                                ],
                            },
                        },
                        {
                            $group: {
                                _id: null,
                                totalAmount: {
                                    $sum: "$amount",
                                },
                            },
                        },
                    ]);
                    const users = yield userModel_1.User.aggregate([
                        {
                            $match: {
                                $and: [
                                    {
                                        role: { $ne: targetUser.role },
                                    },
                                    {
                                        createdAt: { $gte: start, $lte: end },
                                    },
                                ],
                            },
                        },
                        {
                            $group: {
                                _id: "$role",
                                count: { $sum: 1 },
                            },
                        },
                    ]);
                    const players = yield userModel_1.Player.countDocuments({
                        role: "player",
                        createdAt: { $gte: start, $lte: end },
                    });
                    const counts = users.reduce((acc, curr) => {
                        acc[curr._id] = curr.count;
                        return acc;
                    }, {});
                    counts["player"] = players;
                    // Transactions
                    const transactions = yield transactionModel_1.default.find({
                        createdAt: { $gte: start, $lte: end },
                    })
                        .sort({ createdAt: -1 })
                        .limit(9);
                    return res.status(200).json({
                        username: targetUser.username,
                        credits: targetUser.credits,
                        role: targetUser.role,
                        recharge: ((_a = totalRechargedAmt[0]) === null || _a === void 0 ? void 0 : _a.totalAmount) || 0,
                        redeem: ((_b = totalRedeemedAmt[0]) === null || _b === void 0 ? void 0 : _b.totalAmount) || 0,
                        users: counts,
                        transactions: transactions,
                    });
                }
                else {
                    const [userRechargeAmt, userRedeemAmt, userTransactions, users] = yield Promise.all([
                        transactionModel_1.default.aggregate([
                            {
                                $match: {
                                    $and: [
                                        {
                                            createdAt: {
                                                $gte: start,
                                                $lte: end,
                                            },
                                        },
                                        {
                                            type: "recharge",
                                        },
                                        {
                                            debtor: targetUser.username,
                                        }
                                    ],
                                },
                            },
                            {
                                $group: {
                                    _id: null,
                                    totalAmount: { $sum: "$amount" },
                                },
                            },
                        ]),
                        transactionModel_1.default.aggregate([
                            {
                                $match: {
                                    $and: [
                                        {
                                            createdAt: {
                                                $gte: start,
                                                $lte: end,
                                            },
                                        },
                                        {
                                            type: "redeem",
                                        },
                                        {
                                            creditor: targetUser.username,
                                        }
                                    ],
                                },
                            },
                            {
                                $group: {
                                    _id: null,
                                    totalAmount: { $sum: "$amount" },
                                },
                            },
                        ]),
                        transactionModel_1.default.find({
                            $or: [
                                { debtor: targetUser.username },
                                { creditor: targetUser.username },
                            ],
                            createdAt: { $gte: start, $lte: end },
                        })
                            .sort({ createdAt: -1 }),
                        (targetUser.role === "store" || targetUser.role === "player") ?
                            userModel_1.Player.aggregate([
                                {
                                    $match: {
                                        $and: [
                                            {
                                                createdBy: targetUser._id,
                                            },
                                            {
                                                createdAt: { $gte: start, $lte: end },
                                            }
                                        ],
                                    },
                                },
                                {
                                    $group: {
                                        _id: "$status",
                                        count: { $sum: 1 },
                                    },
                                },
                            ]) :
                            userModel_1.User.aggregate([
                                {
                                    $match: {
                                        $and: [
                                            {
                                                createdBy: targetUser._id,
                                            },
                                            {
                                                createdAt: { $gte: start, $lte: end },
                                            }
                                        ],
                                    },
                                },
                                {
                                    $group: {
                                        _id: "$status",
                                        count: { $sum: 1 },
                                    },
                                },
                            ])
                    ]);
                    const counts = users.reduce((acc, curr) => {
                        if (curr._id === "active") {
                            acc.active += curr.count;
                        }
                        else {
                            acc.inactive += curr.count;
                        }
                        return acc;
                    }, { active: 0, inactive: 0 });
                    const result = {
                        username: targetUser.username,
                        credits: targetUser.credits,
                        role: targetUser.role,
                        recharge: ((_c = userRechargeAmt[0]) === null || _c === void 0 ? void 0 : _c.totalAmount) || 0,
                        redeem: ((_d = userRedeemAmt[0]) === null || _d === void 0 ? void 0 : _d.totalAmount) || 0,
                        users: counts,
                        transactions: userTransactions,
                    };
                    return res.status(200).json(result);
                }
            }
            catch (error) {
                next(error);
            }
        });
    }
    getASubordinateReport(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const _req = req;
                const { username: loggedUsername, role: loggedUserRole } = _req.user;
                const { subordinateId } = req.params;
                const { type } = req.query;
                const { start, end } = UserController.getStartAndEndOfPeriod(type);
                const subordinateObjectId = new mongoose_1.default.Types.ObjectId(subordinateId);
                // Fetch subordinate details
                let subordinate = (yield userModel_1.User.findById(subordinateObjectId)) || (yield userModel_1.Player.findById(subordinateObjectId));
                if (!subordinate) {
                    throw (0, http_errors_1.default)(404, "Subordinate not found");
                }
                // Fetch transactions where the subordinate is either the creditor or the debtor
                const transactions = yield transactionModel_1.default.find({
                    $or: [
                        { creditor: subordinate.username },
                        { debtor: subordinate.username }
                    ],
                    createdAt: { $gte: start, $lte: end }
                });
                // Aggregate the total credits given and money spent today
                const totalCreditsGivenToday = transactions
                    .filter(t => t.creditor === subordinate.username)
                    .reduce((sum, t) => sum + t.amount, 0);
                const totalMoneySpentToday = transactions
                    .filter(t => t.debtor === subordinate.username)
                    .reduce((sum, t) => sum + t.amount, 0);
                // Fetch users and players created by this subordinate today
                const [usersCreatedToday, playersCreatedToday] = yield Promise.all([
                    userModel_1.User.find({ createdBy: subordinate._id, createdAt: { $gte: start, $lte: end } }),
                    userModel_1.Player.find({ createdBy: subordinate._id, createdAt: { $gte: start, $lte: end } })
                ]);
                const report = {
                    creditsGiven: totalCreditsGivenToday,
                    moneySpent: totalMoneySpentToday,
                    transactions,
                    users: usersCreatedToday,
                    players: playersCreatedToday,
                };
                res.status(200).json(report);
            }
            catch (error) {
                console.log(error);
                next(error);
            }
        });
    }
}
exports.UserController = UserController;
UserController.rolesHierarchy = {
    admin: ["supermaster", "master", "distributor", "subdistributor", "store", "player"],
    supermaster: ["master", "distributor", "subdistributor", "store", "player"],
    master: ["distributor"],
    distributor: ["subdistributor"],
    subdistributor: ["store"],
    store: ["player"],
};
