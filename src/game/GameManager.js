"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const KenoGames_1 = __importDefault(require("./KenoGames/KenoGames"));
const slotGame_1 = __importDefault(require("./slotGames/slotGame"));
class GameManager {
    constructor(currentGameData) {
        this.currentGameData = currentGameData;
        const currentGameType = currentGameData.gameSettings.id.substring(0, 2);
        if (currentGameType == "SL")
            this.currentGameType = new slotGame_1.default(currentGameData);
        if (currentGameType == "KN")
            this.currentGameType = new KenoGames_1.default(currentGameData);
    }
}
exports.default = GameManager;
