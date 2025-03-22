"use strict";
//routes for toggle
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleRoutes = void 0;
const express_1 = __importDefault(require("express"));
const ToggleController_1 = require("./ToggleController");
const toggleController = new ToggleController_1.ToggleController();
exports.toggleRoutes = express_1.default.Router();
exports.toggleRoutes.put("/", toggleController.putToggle);
exports.toggleRoutes.get("/", toggleController.getToggle);
exports.default = exports.toggleRoutes;
