import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import globalErrorHandler from "./dashboard/middleware/globalHandler";
import companyRoutes from "./dashboard/company/companyRoutes";
import userRoutes from "./dashboard/users/userRoutes";
import transactionRoutes from "./dashboard/transactions/transactionRoutes";
import gameRoutes from "./dashboard/games/gameRoutes";
import { config } from "./config/config";
import svgCaptcha from "svg-captcha";
import createHttpError from "http-errors";
import socketController from "./socket";
import { checkAdmin } from "./dashboard/middleware/checkAdmin";
import payoutRoutes from "./dashboard/payouts/payoutRoutes";
import { checkUser } from "./dashboard/middleware/checkUser";
import toggleRoutes from "./dashboard/Toggle/ToggleRoutes";
import openChromePages from "./chromeController"
declare module "express-session" {
  interface Session {
    captcha?: string;
  }
}


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Set EJS as the view engine
app.set("view engine", "ejs");
app.set("views", "./views");
app.post("/open-pages", async (req: Request, res: Response) => {
  const { ids } = req.body;
  const idArray = ids.split(",").map((id: string) => id.trim());
  try {
    await openChromePages(idArray);
    res.send("Chrome pages opened successfully!");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("An error occurred while opening Chrome pages.");
  }
});
app.get('/testing/:id', (req, res) => {
  const { id } = req.params;
  res.render('testing', { id });
});

//Cloudinary configs
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});



app.use(cors({
  origin: [`*.${config.hosted_url_cors}`, 'https://game-crm-rtp-backend.onrender.com']
}));


const server = createServer(app);

// HEALTH ROUTES
app.get("/", (req, res, next) => {
  const health = {
    uptime: process.uptime(),
    message: "OK",
    timestamp: new Date().toLocaleDateString(),
  };
  res.status(200).json(health);
});

app.get("/captcha", async (req: Request, res: Response, next: NextFunction) => {
  try {
    var captcha = svgCaptcha.create();
    if (captcha) {
      req.session.captcha = captcha.text;
      res.status(200).json(captcha.data);
    } else {
      throw createHttpError(404, "Error Generating Captcha, Please refresh!");
    }
  } catch (error) {
    next(error);
  }
});
// Route to render an EJS template
app.get("/template", (req, res) => {
  const data = { title: "Welcome", message: "Hello,Welcome to Underpin Games Testing Environment!" };
  res.render("index", data);
});
app.use("/api/company", companyRoutes);
app.use("/api/users", userRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/payouts", checkUser, checkAdmin, payoutRoutes)
app.use("/api/toggle", checkUser, checkAdmin, toggleRoutes);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

socketController(io);

app.use(globalErrorHandler);

export default server;
