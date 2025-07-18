import { createClient, RedisClientType } from "redis";
import dotenv from "dotenv";

dotenv.config();

class RedisClient {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

    this.client = createClient({
      url: redisUrl,
      password: process.env.REDIS_PASSWORD || undefined,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
      },
    });

    this.client.on("error", (err) => {
      console.error("❌ Redis Client Error:", err);
      this.isConnected = false;
    });

    this.client.on("connect", () => {
      console.log("🔄 Redis Client connecting...");
    });

    this.client.on("ready", () => {
      console.log("✅ Redis Client connected and ready");
      this.isConnected = true;
    });

    this.client.on("end", () => {
      console.log("🔌 Redis Client connection ended");
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      console.error("❌ Failed to connect to Redis:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      this.isConnected = false;
    } catch (error) {
      console.error("❌ Failed to disconnect from Redis:", error);
      throw error;
    }
  }

  // Session management methods
  async setSession(
    sessionId: string,
    data: any,
    ttlSeconds: number = 86400
  ): Promise<void> {
    try {
      await this.client.setEx(
        `session:${sessionId}`,
        ttlSeconds,
        JSON.stringify(data)
      );
    } catch (error) {
      console.error("❌ Failed to set session:", error);
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<any | null> {
    try {
      const data = await this.client.get(`session:${sessionId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("❌ Failed to get session:", error);
      return null;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.client.del(`session:${sessionId}`);
    } catch (error) {
      console.error("❌ Failed to delete session:", error);
      throw error;
    }
  }

  // Caching methods
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
    } catch (error) {
      console.error("❌ Failed to set cache:", error);
      throw error;
    }
  }

  async get(key: string): Promise<any | null> {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("❌ Failed to get cache:", error);
      return null;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error("❌ Failed to delete cache:", error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error("❌ Failed to check key existence:", error);
      return false;
    }
  }

  // Utility methods
  isReady(): boolean {
    return this.isConnected;
  }

  async ping(): Promise<string> {
    try {
      return await this.client.ping();
    } catch (error) {
      console.error("❌ Redis ping failed:", error);
      throw error;
    }
  }

  // Recommendation caching methods
  async cacheRecommendations(
    userId: string,
    type: string,
    recommendations: any[],
    ttlSeconds: number = 3600
  ): Promise<void> {
    const key = `recommendations:${userId}:${type}`;
    await this.set(key, recommendations, ttlSeconds);
  }

  async getCachedRecommendations(
    userId: string,
    type: string
  ): Promise<any[] | null> {
    const key = `recommendations:${userId}:${type}`;
    return await this.get(key);
  }

  // Analytics caching methods
  async cacheAnalytics(
    userId: string,
    analytics: any,
    ttlSeconds: number = 1800
  ): Promise<void> {
    const key = `analytics:${userId}`;
    await this.set(key, analytics, ttlSeconds);
  }

  async getCachedAnalytics(userId: string): Promise<any | null> {
    const key = `analytics:${userId}`;
    return await this.get(key);
  }
}

// Create singleton instance
const redisClient = new RedisClient();

export default redisClient;
