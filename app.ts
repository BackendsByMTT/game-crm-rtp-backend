import cluster from "cluster";
import os from "os";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { setupMaster, setupWorker } from "@socket.io/sticky";
import { createAdapter, setupPrimary } from "@socket.io/cluster-adapter";
import svgCaptcha from "svg-captcha";
import createHttpError from "http-errors";
import connectDB from "./src/config/db";

// Import custom middleware and routes
import globalErrorHandler from "./src/dashboard/middleware/globalHandler";
import adminRoutes from "./src/dashboard/admin/adminRoutes";
import userRoutes from "./src/dashboard/users/userRoutes";
import transactionRoutes from "./src/dashboard/transactions/transactionRoutes";
import gameRoutes from "./src/dashboard/games/gameRoutes";
import payoutRoutes from "./src/dashboard/payouts/payoutRoutes";
import toggleRoutes from "./src/dashboard/Toggle/ToggleRoutes";
import sessionRoutes from "./src/dashboard/session/sessionRoutes";

// Import other utilities and controllers
import { config } from "./src/config/config";
import { checkUser } from "./src/dashboard/middleware/checkUser";
import { checkRole } from "./src/dashboard/middleware/checkRole";
import socketController from "./src/socket";

// Extend express-session type to include custom properties
declare module "express-session" {
  interface Session {
    captcha?: string;
  }
}

const numCPUs = os.cpus().length;

const startServer = async () => {
  await connectDB();

  if (cluster.isPrimary) {
    console.log(`primary ${process.pid} is running`);

    // try {
    //   console.log("Connected to database successfully");
    // } catch (error) {
    //   console.error("Database connection failed:", error);
    //   process.exit(1);
    // }

    const httpServer = createServer();

    setupMaster(httpServer, {
      loadBalancingMethod: "least-connection",
    });

    setupPrimary();

    const PORT = config.port;
    httpServer.listen(PORT, () => {
      console.log(`Primary load balancer running on port ${PORT}`);
    });

    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }

    cluster.on("exit", (worker) => {
      console.log(`Worker ${worker.process.pid} died. Restarting...`);
      cluster.fork();
    });

  } else {
    console.log(`Worker process ${process.pid} is running`);

    const app = express();

    // Middleware setup
    app.use(express.json({ limit: "25mb" }));
    app.use(express.urlencoded({ limit: "25mb", extended: true }));
    app.use(
      cors({
        origin: [`*.${config.hosted_url_cors}`, "https://game-crm-rtp-backend.onrender.com"],
        credentials: true,
      })
    );

    // Set custom headers for CORS
    app.use((req, res, next) => {
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      if (req.method === "OPTIONS") {
        return res.sendStatus(200);
      }
      next();
    });

    // Health check route
    app.get("/", (req: Request, res: Response) => {
      res.status(200).json({
        uptime: process.uptime(),
        message: "OK",
        timestamp: new Date().toLocaleDateString(),
        worker: process.pid,
        numCPUs: numCPUs,

      });
    });

    // Captcha route
    app.get("/captcha", async (req: Request, res: Response, next: NextFunction) => {
      try {
        const captcha = svgCaptcha.create();
        if (captcha) {
          req.session.captcha = captcha.text;
          res.status(200).json({ data: captcha.data });
        } else {
          throw createHttpError(404, "Error Generating Captcha, Please refresh!");
        }
      } catch (error) {
        next(error);
      }
    });

    // API routes
    app.use("/api/company", adminRoutes);
    app.use("/api/users", userRoutes);
    app.use("/api/transactions", transactionRoutes);
    app.use("/api/games", gameRoutes);
    app.use("/api/payouts", checkUser, checkRole(["admin"]), payoutRoutes);
    app.use("/api/toggle", checkUser, checkRole(["admin"]), toggleRoutes);
    app.use("/api/session", sessionRoutes);

    // Initialize HTTP server
    const httpServer = createServer(app);

    // Initialize Socket.IO
    const io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
      transports: ["websocket"],
      pingInterval: 60000,
      pingTimeout: 60000,
      allowEIO3: false,
    });

    // Setup cluster adapter and worker
    io.adapter(createAdapter());
    setupWorker(io);

    // Initialize Socket.IO logic
    socketController(io);

    // Global error handler
    app.use(globalErrorHandler);

    // Start the server
    // httpServer.listen(config.port, () => {
    //   console.log(`Worker process listening on port ${config.port}`);
    // });
  }
};

startServer().catch((error) => {
  console.error("Error starting server:", error);
});
