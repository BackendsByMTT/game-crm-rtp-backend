"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminController_1 = require("../admin/adminController");
const adminRoutes = express_1.default.Router();
const company = new adminController_1.AdminController();
adminRoutes.post('/request-otp', company.requestOTP);
adminRoutes.post('/verify-otp', company.verifyOTPAndCreateUser);
exports.default = adminRoutes;
