import { sessionManager } from "../../../dashboard/session/sessionManager";
import { currentGamedata } from "../../../Player";
import { RandomResultGenerator } from "../RandomResultGenerator";
import { getGambleResult } from "./gamble";
import { initializeGameSettings, generateInitialReel, sendInitData, makePayLines, checkForWin } from "./helper";
import { SLSMSETTINGS } from "./types";

export class SLSM {
    public settings: SLSMSETTINGS;
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
        //filter symbols which appear only in base game
        const baseGameSymbol = this.currentGameData.gameSettings.Symbols.filter((symbol) => !symbol.isBonusGameSymbol || symbol.isSpecialSymbol)
        baseGameSymbol.forEach((Element: Symbol) => {
            Symbols.push(Element);
        });
        return Symbols;
    }


    get initBonusSymbols() {
        const Symbols = [];
        //filter symbols which appear only in base game
        const bonusGameSymbol = this.currentGameData.gameSettings.Symbols.filter((symbol) => symbol.isBonusGameSymbol || symbol.isSpecialSymbol)
        bonusGameSymbol.forEach((Element: Symbol) => {
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
            case "GAMBLEINIT":
                this.deductPlayerBalance(this.playerData.currentWining);
                this.playerData.haveWon -= this.playerData.currentWining;
                // this.sendMessage("gambleInitData", sendData);
                break;

            case "GAMBLERESULT":
                let result = getGambleResult({ selected: response.cardType });
                //calculate payout
                switch (result.playerWon) {
                    case true:
                        this.playerData.currentWining *= 2
                        result.balance = this.getPlayerData().credits + this.playerData.currentWining
                        result.currentWinning = this.playerData.currentWining
                        break;
                    case false:
                        result.currentWinning = 0;
                        result.balance = this.getPlayerData().credits;
                        this.playerData.currentWining = 0;
                        break;
                }

                this.sendMessage("GambleResult", result) // result card 

                break;
            case "GAMBLECOLLECT":
                this.playerData.haveWon += this.playerData.currentWining;
                this.updatePlayerBalance(this.playerData.currentWining);
                this.sendMessage("GambleCollect", {
                    currentWinning: this.playerData.currentWining,
                    balance: this.getPlayerData().credits
                }) // balance , currentWinning
                break;
            default:
                console.warn(`Unhandled message ID: ${response.id}`);
                this.sendError(`Unhandled message ID: ${response.id}`);
                break;
        }
    }
    private prepareSpin(data: any) {
        this.settings.currentLines = data.currentLines;
        this.settings.BetPerLines = this.settings.currentGamedata.bets[data.currentBet];
        this.settings.currentBet = this.settings.BetPerLines;
    }


    public async spinResult(): Promise<void> {
        try {
            const playerData = this.getPlayerData();
            const platformSession = sessionManager.getPlayerPlatform(playerData.username);

            if (this.settings.currentBet > playerData.credits) {
                console.log(this.settings.currentBet + playerData.credits)
                this.sendError("Low Balance");
                return;
            }
            if (!this.settings.freeSpin.useFreeSpin) {
                await this.deductPlayerBalance(this.settings.currentBet);
                
                // Ensure the totalbet is limited to 4 decimal places
                this.playerData.totalbet = parseFloat(
                    (this.playerData.totalbet + this.settings.currentBet).toFixed(4)
                );
            
            }
            

            const spinId = platformSession.currentGameSession.createSpin();
            platformSession.currentGameSession.updateSpinField(spinId, 'betAmount', this.settings.currentBet);


            await new RandomResultGenerator(this);
            checkForWin(this)

            const winAmount = this.playerData.currentWining;
            platformSession.currentGameSession.updateSpinField(spinId, 'winAmount', winAmount);

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



