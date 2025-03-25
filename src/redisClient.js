"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subClient = exports.pubClient = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("./config/config");
const redisUrl = config_1.config.redis_url;
if (!redisUrl) {
    throw new Error("REDIS_URL is not set in environment variables");
}
const pubClient = new ioredis_1.default(redisUrl);
exports.pubClient = pubClient;
const subClient = pubClient.duplicate();
exports.subClient = subClient;
pubClient.on("connect", () => {
    console.log("✅ Connected to Redis successfully!");
});
pubClient.on("error", (err) => {
    console.error("❌ Redis connection error:", err);
});
