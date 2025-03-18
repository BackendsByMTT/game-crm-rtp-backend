import { createClient, RedisClientType } from "redis";
import { config } from "./config";

class RedisClient {
    private static instance: RedisClient;
    public pubClient: RedisClientType;
    public subClient: RedisClientType;

    private constructor() {
        this.pubClient = createClient({ url: config.redis_url });
        this.subClient = this.pubClient.duplicate();
    }

    public static getInstance(): RedisClient {
        if (!RedisClient.instance) {
            RedisClient.instance = new RedisClient();
        }
        return RedisClient.instance;
    }

    public async connect(retries = 5, delay = 5000): Promise<void> {
        for (let i = 0; i < retries; i++) {
            try {
                await this.pubClient.connect();
                await this.subClient.connect();
                console.log("✅ Redis clients connected");
                return;
            } catch (err) {
                console.error(`❌ Redis connection attempt ${i + 1} failed. Retrying in ${delay / 1000}s...`);
                await new Promise((res) => setTimeout(res, delay));
            }
        }

        console.error("❌ Redis connection failed after multiple attempts. Exiting...");
        process.exit(1); // Exit if all retries fail
    }
}

export const redisClient = RedisClient.getInstance();
