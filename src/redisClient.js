"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("./config/config");
const redisUrl = config_1.config.redis_url;
if (!redisUrl) {
    throw new Error("REDIS_URL environment variable is not set");
}
const pubClient = new ioredis_1.default(redisUrl);
pubClient.on('connect', () => {
    console.log('Connected to Redis on Render successfully!');
});
pubClient.on('error', (err) => {
    console.error('Redis connection error:', err);
});
exports.default = pubClient;
