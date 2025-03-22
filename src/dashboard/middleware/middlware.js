"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateApiKey = validateApiKey;
exports.extractRoleFromCookie = extractRoleFromCookie;
const config_1 = require("../../config/config");
const http_errors_1 = __importDefault(require("http-errors"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function validateApiKey(req, res, next) {
    if (!config_1.config.companyApiKey) {
        return next((0, http_errors_1.default)(403, "Invalid API key"));
    }
    next();
}
function extractRoleFromCookie(req, res, next) {
    var _a, _b;
    const cookie = (_b = (_a = req.headers.cookie) === null || _a === void 0 ? void 0 : _a.split("; ").find((row) => row.startsWith("userToken="))) === null || _b === void 0 ? void 0 : _b.split("=")[1];
    const authHeaders = req.headers.authorization;
    const token = cookie || (authHeaders && authHeaders.startsWith("Bearer") && authHeaders.split(" ")[1]);
    if (token) {
        jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                if (err.name === "TokenExpiredError") {
                    console.error("Token expired:", err.message);
                    return next((0, http_errors_1.default)(401, "Token has expired"));
                }
                else {
                    console.error("Token verification failed:", err.message);
                    return next((0, http_errors_1.default)(401, "You are not authenticated"));
                }
            }
            else {
                req.body = Object.assign(Object.assign({}, req.body), { creatorUsername: decoded.username, creatorRole: decoded.role });
                console.log(decoded.username);
                console.log("Authenticated successfully");
                next();
            }
        });
    }
    else {
        next((0, http_errors_1.default)(401, "Unauthorized: No role found in cookies"));
    }
}
