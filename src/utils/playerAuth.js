"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPlayerToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const verifyPlayerToken = (socket) => {
    return new Promise((resolve, reject) => {
        const token = socket.handshake.auth.token;
        if (token) {
            jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET, (err, decoded) => {
                if (err) {
                    console.error("Token verification failed:", err.message);
                    reject(new Error("You are not authenticated"));
                }
                else {
                    resolve(decoded);
                }
            });
        }
        else {
            reject(new Error("No authentication token provided"));
        }
    });
};
exports.verifyPlayerToken = verifyPlayerToken;
