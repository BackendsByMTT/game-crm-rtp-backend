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
exports.checkGamesToggle = exports.checkLoginToggle = void 0;
const ToggleModel_1 = __importDefault(require("../Toggle/ToggleModel"));
const utils_1 = require("../../utils/utils");
const userModel_1 = require("../users/userModel");
const http_errors_1 = __importDefault(require("http-errors"));
const checkLoginToggle = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyUsers = yield userModel_1.User.find({ role: 'admin' });
        //check if company users exist ,then pass through
        if (companyUsers === null || companyUsers === void 0 ? void 0 : companyUsers.find(user => user.username === req.body.username)) {
            next();
        }
        else {
            const { underMaintenance, availableAt } = yield isAvaiable();
            if (underMaintenance === true) {
                res.status(200).json({ message: `underMaintenance till ${(0, utils_1.formatDate)(availableAt.toISOString())}`, isUnderMaintenance: underMaintenance });
                return;
            }
            else {
                next();
            }
        }
    }
    catch (error) {
        next(error);
    }
});
exports.checkLoginToggle = checkLoginToggle;
const checkGamesToggle = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const _req = req;
        const { username } = _req.user;
        const companyUsers = yield userModel_1.User.find({ role: 'admin' });
        //check if company users exist ,then pass through
        if (companyUsers === null || companyUsers === void 0 ? void 0 : companyUsers.find(user => user.username === username)) {
            next();
        }
        else {
            const { underMaintenance, availableAt } = yield isAvaiable();
            if (underMaintenance === true) {
                res.status(201).json({ message: `underMaintenance till ${(0, utils_1.formatDate)(availableAt.toISOString())}`, isUnderMaintenance: underMaintenance, availableAt: availableAt });
                return;
            }
            else {
                next();
            }
        }
    }
    catch (error) {
        console.log("checkGameToggle : ", error);
        next(error);
    }
});
exports.checkGamesToggle = checkGamesToggle;
function isAvaiable() {
    return __awaiter(this, void 0, void 0, function* () {
        const toggle = yield ToggleModel_1.default.findOne();
        if (!toggle)
            throw (0, http_errors_1.default)(404, "Toggle not found");
        if (toggle.availableAt === null) {
            return { underMaintenance: false, availableAt: null };
        }
        const now = new Date();
        const time = new Date(toggle.availableAt);
        if (time > now) {
            return { underMaintenance: true, availableAt: toggle.availableAt };
        }
        else {
            yield ToggleModel_1.default.findOneAndUpdate({}, { availableAt: null }, { new: true, upsert: true });
            return { underMaintenance: false, availableAt: null };
        }
    });
}
