"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRole = checkRole;
const http_errors_1 = __importDefault(require("http-errors"));
function checkRole(allowedRoles) {
    return (req, res, next) => {
        const _req = req;
        const { role } = _req.user;
        if (!allowedRoles.includes(role)) {
            return next((0, http_errors_1.default)(403, "Access denied. You don't have permission to access this resource."));
        }
        next();
    };
}
