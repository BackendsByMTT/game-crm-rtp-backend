import mongoose, { Model, Schema } from "mongoose";
import { IBonus, IGameSession, IJackpot, IScatter, ISpecialFeatures, ISpinData } from "./sessionTypes";

const JackpotSchema: Schema<IJackpot> = new Schema({
    amountWon: { type: Number, required: true }
}, { _id: false });

const ScatterSchema: Schema<IScatter> = new Schema({
    amountWon: { type: Number, required: true },
}, { _id: false });

const BonusSchema: Schema<IBonus> = new Schema({
    amountWon: { type: Number, required: true },
}, { _id: false });

const SpecialFeaturesSchema: Schema<ISpecialFeatures> = new Schema({
    jackpot: { type: JackpotSchema, required: false },
    scatter: { type: ScatterSchema, required: false },
    bonus: { type: BonusSchema, required: false },
}, { _id: false });

const SpinDataSchema: Schema<ISpinData> = new Schema({
    spinId: { type: String, required: true },
    betAmount: { type: Number, required: true },
    winAmount: { type: Number, required: true },
    specialFeatures: { type: SpecialFeaturesSchema, required: false },
}, { _id: false });

const GameSessionSchema: Schema<IGameSession> = new Schema({
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

const PlatformSessionSchema: Schema = new Schema({
    playerId: { type: String, required: true },
    managerName: { type: String, required: true },
    initialCredits: { type: Number, required: true },
    currentCredits: { type: Number, required: true },
    entryTime: { type: Date, required: true },
    exitTime: { type: Date, default: null },
    currentRTP: { type: Number, default: 0 },
    gameSessions: { type: [GameSessionSchema], default: [] },  // Multiple game sessions as an array
}, { timestamps: true });



export const PlatformSessionModel: Model<Document> = mongoose.model<Document>('PlatformSession', PlatformSessionSchema);