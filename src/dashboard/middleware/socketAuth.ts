import { Socket } from "socket.io";
import jwt from 'jsonwebtoken';
import { config } from "../../config/config";

interface DecodedToken {
    username: string;
    role: string;
}

export const socketAuth = (socket: Socket, next: (err?: Error) => void) => {
    try {
        // Extract token from handshake auth
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error: Token missing'));
        }

        // Verify token and decode token
        const decoded = jwt.verify(token, config.jwtSecret) as DecodedToken;

        // Extrack user agent
        const userAgent = socket.handshake.headers['user-agent'];

        // Attach user details to socket
        socket.data.user = {
            username: decoded.username,
            role: decoded.role,
            userAgent
        };
        next(); // Proceed to next middleware
    } catch (error) {
        console.error('Socket authentication failed:', error.message);
        next(new Error('Authentication error: Invalid token'));
    }
}