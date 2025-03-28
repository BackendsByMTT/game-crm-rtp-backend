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
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = void 0;
const redis_1 = require("redis");
const config_1 = require("./config");
class RedisClient {
    constructor() {
        this.pubClient = (0, redis_1.createClient)({ url: config_1.config.redis_url });
        this.subClient = this.pubClient.duplicate();
    }
    static getInstance() {
        if (!RedisClient.instance) {
            RedisClient.instance = new RedisClient();
        }
        return RedisClient.instance;
    }
    connect() {
        return __awaiter(this, arguments, void 0, function* (retries = 5, delay = 5000) {
            for (let i = 0; i < retries; i++) {
                try {
                    yield this.pubClient.connect();
                    yield this.subClient.connect();
                    console.log("✅ Redis clients connected");
                    return;
                }
                catch (err) {
                    console.error(`❌ Redis connection attempt ${i + 1} failed. Retrying in ${delay / 1000}s...`);
                    yield new Promise((res) => setTimeout(res, delay));
                }
            }
            console.error("❌ Redis connection failed after multiple attempts. Exiting...");
            process.exit(1); // Exit if all retries fail
        });
    }
}
exports.redisClient = RedisClient.getInstance();
