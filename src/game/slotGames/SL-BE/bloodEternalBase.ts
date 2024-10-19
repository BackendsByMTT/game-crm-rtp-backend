import { SLBESETTINGS } from "./types";
import { checkForWin, initializeGameSettings, makePayLines, sendInitData } from './helper'
import { currentGamedata } from "../../../Player";
import { RandomResultGenerator } from "../RandomResultGenerator";
/**
 * Represents the Blood Eternal Slot  Game Class for handling slot machine operations.
 */
export class SLBE {
    public settings: SLBESETTINGS;
    playerData = {
        haveWon: 0,
        currentWining: 0,
        totalbet: 0,
        rtpSpinCount: 0,
        totalSpin: 0
    };

    constructor(public currentGameData: currentGamedata) {
        this.settings = initializeGameSettings(currentGameData, this);
        sendInitData(this);
        makePayLines(this)
    }

    get initSymbols() {
        return this.currentGameData.gameSettings.Symbols;
    }

    sendMessage(action: string, message: any) {
        this.currentGameData.sendMessage(action, message);
    }

    sendError(message: string) {
        this.currentGameData.sendError(message);
    }

    sendAlert(message: string) {
        this.currentGameData.sendAlert(message);
    }

    updatePlayerBalance(amount: number) {
        this.currentGameData.updatePlayerBalance(amount);
    }

    deductPlayerBalance(amount: number) {
        this.currentGameData.deductPlayerBalance(amount);
    }

    getPlayerData() {
        return this.currentGameData.getPlayerData();
    }

    messageHandler(response: any) {
        switch (response.id) {
            case "SPIN":
                this.prepareSpin(response.data);
                this.getRTP(response.data.spins || 1);
                break;
        }
    }

    private prepareSpin(data: any) {
        this.settings.currentBet = this.settings.currentGamedata.bets[data.currentBet];
    }

    public async spinResult(): Promise<void> {
        try {
            const playerData = this.getPlayerData();
            if (this.settings.currentBet > playerData.credits) {
                this.sendError("Low Balance");
                return;
            }
            new RandomResultGenerator(this);
            this.playerData.totalbet += this.settings.currentBet;
            checkForWin(this)
        } catch (error) {
            this.sendError("Spin error");
            console.error("Failed to generate spin results:", error);
        }
    }
    private async getRTP(spins: number): Promise<void> {
        try {
            let spend: number = 0;
            let won: number = 0;
            this.playerData.rtpSpinCount = spins;
            for (let i = 0; i < this.playerData.rtpSpinCount; i++) {
                await this.spinResult();
                spend = this.playerData.totalbet;
                won = this.playerData.haveWon;
                console.log(`Spin ${i + 1} completed. ${this.playerData.totalbet} , ${won}`);
            }
            let rtp = 0;
            if (spend > 0) {
                rtp = won / spend;
            }
            console.log('RTP calculated:', rtp * 100);
            return;
        } catch (error) {
            console.error("Failed to calculate RTP:", error);
            this.sendError("RTP calculation error");
        }
    }

}