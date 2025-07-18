import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { testConnection } from "./database/connection";
import redisClient from "./database/redis";
import { requestIdMiddleware } from "./middleware/requestId";
import { RateLimiter } from "./middleware/rateLimiter";
import { getSecurityMiddleware } from "./middleware/security";
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import plaidRoutes from "./routes/plaid";
import creditCardRoutes from "./routes/creditCards";
import analyticsRoutes from "./routes/analyticsRoutes";
import recommendationRoutes from "./routes/recommendations";
import WebSocketService from "./services/WebSocketService";

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize WebSocket service
const webSocketService = new WebSocketService(server);

// Add WebSocket service to app for use by other modules
app.set('webSocketService', webSocketService);

// Security middleware
const securityMiddleware = getSecurityMiddleware();
securityMiddleware.forEach(middleware => app.use(middleware));

// Request ID middleware
app.use(requestIdMiddleware);

// Rate limiting
app.use(RateLimiter.generalLimiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Credit Card Recommendations API",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/plaid", plaidRoutes);
app.use("/api/cards", creditCardRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/recommendations", recommendationRoutes);

app.get("/api", (req, res) => {
  res.json({ message: "Credit Card Recommendations API v1.0" });
});

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong!",
        timestamp: new Date().toISOString(),
      },
    });
  }
);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
      timestamp: new Date().toISOString(),
    },
  });
});

// Initialize connections and start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Connect to Redis
    await redisClient.connect();

    // Start the server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔗 API Health Check: http://localhost:${PORT}/health`);
      console.log(`⚡ WebSocket service initialized`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("🛑 SIGTERM received, shutting down gracefully...");
  await redisClient.disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("🛑 SIGINT received, shutting down gracefully...");
  await redisClient.disconnect();
  process.exit(0);
});

startServer();

export default app;
