import { currentGamedata } from "../../../Player";
import { RandomResultGenerator } from "../RandomResultGenerator";
import { initializeGameSettings, generateInitialReel, sendInitData } from "./helper";
import { SLPMSETTINGS } from "./types";
export class SLPM {
    public settings: SLPMSETTINGS;
    playerData = {
        haveWon: 0,
        currentWining: 0,
        totalbet: 0,
        rtpSpinCount: 0,
        totalSpin: 0,
        currentPayout: 0
    };

    constructor(public currentGameData: currentGamedata) {
        this.settings = initializeGameSettings(currentGameData, this);
        generateInitialReel(this.settings)
        sendInitData(this)
    }

    get initSymbols() {
        const Symbols = [];
        this.currentGameData.gameSettings.Symbols.forEach((Element: Symbol) => {
            Symbols.push(Element);
        });
        return Symbols;
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
                this.spinResult();
                break;
        }
    }
    private prepareSpin(data: any) {
        this.settings.currentLines = data.currentLines;
        this.settings.BetPerLines = this.settings.currentGamedata.bets[data.currentBet];
        this.settings.currentBet = this.settings.BetPerLines * this.settings.currentLines;
    }

    private async spinResult() {
        try {
            const playerData = this.getPlayerData();
            if (this.settings.currentBet > playerData.credits) {
                this.sendError("Low Balance");
                return;
            }
            new RandomResultGenerator(this);
        } catch (error) {
            this.sendError("Spin error");
            console.error("Failed to generate spin results:", error);
        }
    }
}