"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const verifyToken = (req, res, next) => {
    // console.log("Req : ", req.headers.cookie);
    var _a, _b;
    const cookie = (_b = (_a = req.headers.cookie) === null || _a === void 0 ? void 0 : _a.split("; ").find((row) => row.startsWith("userToken="))) === null || _b === void 0 ? void 0 : _b.split("=")[1];
    console.log("COOKIES : " + cookie);
    if (cookie) {
        jsonwebtoken_1.default.verify(cookie, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                console.error("Token verification failed:", err.message);
                return res.status(401).json({ error: "You are not authenticated" });
            }
            else {
                req.body = Object.assign(Object.assign({}, req.body), { username: decoded.username, creatorDesignation: decoded.designation });
                console.log("Authenticated successfully");
                // console.log(decoded, "cookie decoded");
                next();
            }
        });
    }
    else {
        return res.status(401).json({ error: "No authentication token provided" });
    }
};
exports.verifyToken = verifyToken;
