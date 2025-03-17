"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../../config/config");
const socketAuth = (socket, next) => {
    try {
        // Extract token from handshake auth
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error: Token missing'));
        }
        // Verify token and decode token
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        // Extrack user agent
        const userAgent = socket.handshake.headers['user-agent'];
        // Attach user details to socket
        socket.data.user = {
            username: decoded.username,
            role: decoded.role,
            userAgent
        };
        next(); // Proceed to next middleware
    }
    catch (error) {
        console.error('Socket authentication failed:', error.message);
        next(new Error('Authentication error: Invalid token'));
    }
};
exports.socketAuth = socketAuth;
