import { sessionManager } from "../../../dashboard/session/sessionManager";
import { currentGamedata } from "../../../Player";
import { RandomResultGenerator } from "../RandomResultGenerator";
import { initializeGameSettings, generateInitialReel, sendInitData, makePayLines, checkForWin } from "./helper";
import { SLBTSETTINGS } from "./types";

export class SLBT {
    public settings: SLBTSETTINGS;
    playerData = {
        haveWon: 0,
        currentWining: 0,
        totalbet: 0,
        rtpSpinCount: 0,
        totalSpin: 0,
        currentPayout: 0,
    };

    constructor(public currentGameData: currentGamedata) {
        this.settings = initializeGameSettings(currentGameData, this);
        generateInitialReel(this.settings)
        sendInitData(this)
        makePayLines(this)
    }

    get initSymbols() {
        const Symbols = [];
        this.currentGameData.gameSettings.Symbols.forEach((Element: Symbol) => {
            Symbols.push(Element);
        });
        return Symbols;
    }


    sendMessage(action: string, message: any) {
        this.currentGameData.sendMessage(action, message, true);
    }

    sendError(message: string) {
        this.currentGameData.sendError(message, true);
    }

    sendAlert(message: string) {
        this.currentGameData.sendAlert(message, true);
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
        this.settings.currentLines = data.currentLines;
        this.settings.BetPerLines = this.settings.currentGamedata.bets[data.currentBet];
        this.settings.currentBet = this.settings.BetPerLines
    }

    public async spinResult(): Promise<void> {
        try {
            const { username, credits } = this.getPlayerData();
            const platformSession = sessionManager.getPlayerPlatform(username);
            if (this.settings.currentBet > credits) return this.sendError("Low Balance");
            const isFreeSpin = this.settings.freeSpin.freeSpinCount > 0;
            if (isFreeSpin) {
                this.settings.freeSpin.freeSpinCount--;
                this.settings.freeSpin.useFreeSpin = false
            } else {
                console.log(`BALANCE: ${credits}`);
                await this.deductPlayerBalance(this.settings.currentBet);
                this.playerData.totalbet += this.settings.currentBet;
            }
            const spinId = platformSession.currentGameSession.createSpin();
            platformSession.currentGameSession.updateSpinField(spinId, 'betAmount', this.settings.currentBet);
            await new RandomResultGenerator(this);
            checkForWin(this);
            this.settings.freeSpin.useFreeSpin = this.settings.freeSpin.freeSpinCount > 0;
            platformSession.currentGameSession.updateSpinField(spinId, 'winAmount', this.playerData.currentWining);
        } catch (error) {
            console.error("Failed to generate spin results:", error);
            this.sendError("Spin error");
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



