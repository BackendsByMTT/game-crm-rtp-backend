"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const KenoBaseGame_1 = __importDefault(require("./KenoBaseGame/KenoBaseGame"));
class KenoGameManager {
    constructor(currentGameData) {
        this.currentGameData = currentGameData;
        console.log(currentGameData.gameSettings.id);
        if (!currentGameData.gameSettings.isSpecial) {
            this.currentGame = new KenoBaseGame_1.default(currentGameData);
        }
        else {
            console.log("Special Game KNEOOOO ");
        }
    }
}
exports.default = KenoGameManager;
