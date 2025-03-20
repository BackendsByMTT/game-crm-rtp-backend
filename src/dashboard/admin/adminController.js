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
exports.AdminController = void 0;
const http_errors_1 = __importDefault(require("http-errors"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const mongoose_1 = __importDefault(require("mongoose"));
const otpUtils_1 = require("./otpUtils");
const config_1 = require("../../config/config");
const userModel_1 = require("../users/userModel");
class AdminController {
    constructor() {
        this.requestOTP = this.requestOTP.bind(this.requestOTP);
        this.verifyOTPAndCreateUser = this.verifyOTPAndCreateUser.bind(this.verifyOTPAndCreateUser);
    }
    // Request OTP after user submits registration form
    requestOTP(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const { user } = req.body;
            if (!user) {
                return next((0, http_errors_1.default)(400, 'User details are required'));
            }
            const email = config_1.config.sentToemail;
            const otp = (0, otpUtils_1.generateOTP)();
            // Store OTP with an expiration time
            AdminController.otpStore.set(email, { otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
            try {
                console.time('sendOTP');
                yield (0, otpUtils_1.sendOTP)(email, otp);
                console.timeEnd('sendOTP');
                res.status(200).json({ message: 'OTP sent' });
            }
            catch (error) {
                console.error('Error sending OTP:', error);
                next((0, http_errors_1.default)(500, 'Failed to send OTP'));
            }
        });
    }
    // Verify OTP and create user
    verifyOTPAndCreateUser(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const { otp, user } = req.body;
            const receiverEmail = config_1.config.sentToemail;
            const storedOTP = AdminController.otpStore.get(receiverEmail);
            if (!otp || !user) {
                return next((0, http_errors_1.default)(400, 'OTP and user details are required'));
            }
            if (!storedOTP || new Date() > storedOTP.expiresAt) {
                return next((0, http_errors_1.default)(400, 'OTP has expired or is invalid'));
            }
            if (storedOTP.otp !== otp) {
                return next((0, http_errors_1.default)(400, 'Invalid OTP'));
            }
            // Clear OTP after successful verification
            AdminController.otpStore.delete(receiverEmail);
            const session = yield mongoose_1.default.startSession();
            session.startTransaction();
            try {
                if (!user.name || !user.username || !user.password) {
                    throw (0, http_errors_1.default)(400, "All required fields must be provided");
                }
                const existingAdmin = yield userModel_1.User.findOne({ username: user.username }).session(session);
                if (existingAdmin) {
                    throw (0, http_errors_1.default)(409, 'Admin already exists');
                }
                const hashedPassword = yield bcrypt_1.default.hash(user.password, 10);
                const newUser = new userModel_1.User(Object.assign(Object.assign({}, user), { credits: Infinity, createdBy: null, password: hashedPassword }));
                yield newUser.save({ session });
                yield session.commitTransaction();
                res.status(201).json(newUser);
            }
            catch (error) {
                console.error('Error verifying OTP and creating user:', error);
                yield session.abortTransaction();
                next(error);
            }
            finally {
                session.endSession();
            }
        });
    }
}
exports.AdminController = AdminController;
AdminController.otpStore = new Map();
