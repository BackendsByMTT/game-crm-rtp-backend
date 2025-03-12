"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const sessionController_1 = __importDefault(require("./sessionController"));
const sessionRoutes = express_1.default.Router();
sessionRoutes.get("/", sessionController_1.default.playerSessionHandler);
exports.default = sessionRoutes;
