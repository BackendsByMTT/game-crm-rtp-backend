"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const payoutController_1 = __importDefault(require("./payoutController"));
const multer_1 = __importDefault(require("multer"));
const payoutRoutes = express_1.default.Router();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// Create a new payout
payoutRoutes.post("/", upload.fields([{ name: "payoutFile" }]), payoutController_1.default.uploadNewVersion);
// Get Payout
payoutRoutes.get('/', payoutController_1.default.getPayouts);
// Get Payout versions name of a Game
payoutRoutes.get("/:tagName", payoutController_1.default.getPayoutVersionName);
// Update Active Payout version
payoutRoutes.patch("/:tagName", payoutController_1.default.updateActivePayout);
// Delete a payout by ID
payoutRoutes.delete("/:tagName/:version", payoutController_1.default.deletePayout);
exports.default = payoutRoutes;
