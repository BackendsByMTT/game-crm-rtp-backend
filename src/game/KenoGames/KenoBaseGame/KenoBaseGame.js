"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const sessionManager_1 = require("../../../dashboard/session/sessionManager");
const utils_1 = require("../../../utils/utils");
const helper_1 = require("./helper");
/**
 * Class representing the base game logic for Keno.
 * Implements the RequiredSocketMethods interface.
 */
class KenoBaseGame {
    /**
     * Creates an instance of KenoBaseGame.
     * @param currentGameData - The current game data.
     */
    constructor(currentGameData) {
        this.currentGameData = currentGameData;
        this.playerData = {
            hasWon: 0,
            currentWinning: 0,
            totalBet: 0,
            totalSpins: 0,
        };
        this.settings = (0, helper_1.initializeGameSettings)(currentGameData, this);
        (0, helper_1.sendInitData)(this);
    }
    /**
     * Sends a message to the player.
     * @param action - The action type.
     * @param payload - The message payload.
     */
    sendMessage(action, payload) {
        this.currentGameData.sendMessage(action, payload, true);
    }
    /**
     * Sends an error message to the player.
     * @param errorMessage - The error message.
     */
    sendError(errorMessage) {
        this.currentGameData.sendError(errorMessage, true);
    }
    /**
     * Sends an alert message to the player.
     * @param alertMessage - The alert message.
     */
    sendAlert(alertMessage) {
        this.currentGameData.sendAlert(alertMessage, true);
    }
    /**
     * Updates the player's balance.
     * @param amount - The amount to update.
     */
    updatePlayerBalance(amount) {
        this.currentGameData.updatePlayerBalance(amount);
    }
    /**
     * Deducts an amount from the player's balance.
     * @param amount - The amount to deduct.
     */
    deductPlayerBalance(amount) {
        this.currentGameData.deductPlayerBalance(amount);
    }
    /**
     * Retrieves the player's data.
     * @returns The player's data.
     */
    getPlayerData() {
        return this.currentGameData.getPlayerData();
    }
    /**
     * Prepares the spin with the given data.
     * @param spinData - The data for the spin.
     */
    prepareDraw(drawData) {
        this.settings.currentBet = this.settings.bets[drawData.currentBet];
        this.settings.picks = drawData.picks;
    }
    /**
     * Handles incoming messages.
     * @param message - The incoming message.
     */
    messageHandler(message) {
        switch (message.id) {
            case "SPIN":
                this.prepareDraw(message.data);
                this.settings.forRTP = false;
                this.spinResult();
                break;
            case "GENRTP":
                this.settings.forRTP = true;
                this.prepareDraw(message.data);
                this.getRTP(message.data.spins || 1);
                break;
            default:
                console.warn(`Unhandled message ID: ${message.id}`);
                this.sendError(`Unhandled message ID: ${message.id}`);
                break;
        }
    }
    /**
     * Generates the RTP (Return to Player) for a given number of spins.
     * @param spins - The number of spins.
     */
    getRTP(draws) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let response = [];
                let hitsLength = [];
                for (let i = 1; i <= this.settings.maximumPicks; i++) {
                    let totalWin = 0;
                    let totalBet = 0;
                    let hitCounts = [];
                    for (let j = 0; j < draws; j++) {
                        this.settings.picks = (0, helper_1.getNNumbers)(this.settings.total, i);
                        yield this.spinResult();
                        hitCounts.push(this.settings.hits.length);
                        totalWin = (0, utils_1.precisionRound)(totalWin + this.playerData.currentWinning, 5);
                        totalBet = (0, utils_1.precisionRound)(totalBet + this.settings.currentBet, 5);
                    }
                    response.push(`RTP for ${i} picks is ${(0, utils_1.precisionRound)((totalWin / totalBet) * 100, 5)}%`);
                    hitsLength.push(hitCounts);
                }
                console.log(response.join('\n'));
                // writeMultipleArraysToCSV("hitFreqKeno.csv", hitsLength);
                // // testing gen paytable
                // generatePaytableJSON(80, 20, 10, 85, examplePayoutMultiplier, "paytable.json");
            }
            catch (error) {
                console.error("Failed to generate RTP:", error);
            }
        });
    }
    /**
     * Executes the spin result logic.
     */
    spinResult() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const playerData = this.getPlayerData();
                const platformSession = sessionManager_1.sessionManager.getPlayerPlatform(playerData.username);
                if (this.settings.currentBet > playerData.credits) {
                    this.sendError("Low Balance");
                    return;
                }
                const { currentBet } = this.settings;
                this.deductPlayerBalance(currentBet);
                this.playerData.totalBet = (0, utils_1.precisionRound)(this.playerData.totalBet + currentBet, 5);
                const spinId = platformSession.currentGameSession.createSpin();
                platformSession.currentGameSession.updateSpinField(spinId, 'betAmount', this.settings.currentBet);
                (0, helper_1.checkForWin)(this);
                const winAmount = this.playerData.currentWinning;
                platformSession.currentGameSession.updateSpinField(spinId, 'winAmount', winAmount);
            }
            catch (error) {
                this.sendError("Spin error");
                console.error("Failed to generate spin results:", error);
            }
        });
    }
}
exports.default = KenoBaseGame;
