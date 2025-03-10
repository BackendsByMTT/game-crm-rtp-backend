"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformSessionModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const JackpotSchema = new mongoose_1.Schema({
    amountWon: { type: Number, required: true }
}, { _id: false });
const ScatterSchema = new mongoose_1.Schema({
    amountWon: { type: Number, required: true },
}, { _id: false });
const BonusSchema = new mongoose_1.Schema({
    amountWon: { type: Number, required: true },
}, { _id: false });
const SpecialFeaturesSchema = new mongoose_1.Schema({
    jackpot: { type: JackpotSchema, required: false },
    scatter: { type: ScatterSchema, required: false },
    bonus: { type: BonusSchema, required: false },
}, { _id: false });
const SpinDataSchema = new mongoose_1.Schema({
    spinId: { type: String, required: true },
    betAmount: { type: Number, required: true },
    winAmount: { type: Number, required: true },
    specialFeatures: { type: SpecialFeaturesSchema, required: false },
}, { _id: false });
const GameSessionSchema = new mongoose_1.Schema({
    gameId: { type: String, required: true },
    gameName: { type: String, required: true },
    sessionId: { type: String, required: true },
    entryTime: { type: Date, required: true },
    exitTime: { type: Date, default: null },
    creditsAtEntry: { type: Number, required: true },
    creditsAtExit: { type: Number, default: 0 },
    totalSpins: { type: Number, default: 0 },
    totalBetAmount: { type: Number, default: 0 },
    totalWinAmount: { type: Number, default: 0 },
    spinData: { type: [SpinDataSchema], default: [] },
    sessionDuration: { type: Number, default: 0 },
}, { _id: false });
const PlatformSessionSchema = new mongoose_1.Schema({
    playerId: { type: String, required: true },
    managerName: { type: String, required: true },
    initialCredits: { type: Number, required: true },
    currentCredits: { type: Number, required: true },
    entryTime: { type: Date, required: true },
    exitTime: { type: Date, default: null },
    currentRTP: { type: Number, default: 0 },
    gameSessions: { type: [GameSessionSchema], default: [] }, // Multiple game sessions as an array
}, { timestamps: true });
exports.PlatformSessionModel = mongoose_1.default.model('PlatformSession', PlatformSessionSchema);
