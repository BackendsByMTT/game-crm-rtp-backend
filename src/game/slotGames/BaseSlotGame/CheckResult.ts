

import { ScatterPayEntry, BonusPayEntry, specialIcons, bonusGameType, ResultType } from "../../Utils/gameUtils";
import BaseSlotGame from "./BaseSlotGame";
import { BonusGame, runMiniSpin } from "./BonusGame";
import { MiniSpinBonus } from "./gameType";
import { WinData } from "./WinData";

export class CheckResult {
    scatter: string;
    useScatter: boolean;
    jackpot: any;
    useJackpot: boolean;
    scatterPayTable: ScatterPayEntry[];
    bonusPaytable: BonusPayEntry[];
    reels: string[][];
    scatterWinSymbols: any[];
    jackpotWinSymbols: any[];
    winSeq: any;
    bonusResult: string[];
    currentGame: BaseSlotGame;
    bonusGame: BonusGame
    constructor(current) {
        current.settings._winData = new WinData(current);
        this.currentGame = current;
        this.scatter = specialIcons.scatter;
        this.jackpot = current.settings.jackpot;
        this.useJackpot = this.jackpot !== null;
        this.scatterPayTable = current.settings.scatterPayTable;
        this.bonusPaytable = current.settings.bonusPayTable;
        this.reels = current.settings.resultSymbolMatrix;
        this.scatterWinSymbols = [];
        this.jackpotWinSymbols = [];
        this.winSeq = null;
        this.bonusResult = [];
        this.bonusGame = this.bonusGame
        this.searchWinSymbols();
    }


    searchWinSymbols() {
        this.checkForWin();
        this.checkForFreeSpin();
        this.checkForBonus();
        this.checkForJackpot();
        this.checkForScatter();
        console.log(this.currentGame.settings.resultSymbolMatrix)

        this.currentGame.settings._winData.winningLines =
            this.currentGame.settings._winData.winningLines.filter(
                (value, index, array) => array.indexOf(value) === index
            );

        this.currentGame.settings._winData.updateBalance();

        if (!this.currentGame.settings.freeSpin.freeSpinStarted && this.currentGame.settings.freeSpin.freeSpinCount != 0)
            this.startFreeSpin();
        const winRate: number =
            (this.currentGame.playerData.haveWon / this.currentGame.playerData.totalbet) * 100;
        console.log(
            `Total Spend : ${this.currentGame.playerData.totalbet}  Total Won : ${this.currentGame.playerData.haveWon
            } 
        Current RTP for ${this.currentGame.currentGameData.username}: ${winRate.toFixed(2)}% `
        );
        // console.log(this.currentGame.player.playerData.rtpSpinCount, 'this.currentGame.player.playerData.rtpSpinCount');
        // console.log("Free spin Count", this.currentGame.player.playerData.totalSpin)
        console.log("_____________RESULT_END________________");
    }

    private checkForBonus() {
        if (!this.currentGame.settings.currentGamedata.bonus.isEnabled) return;
        if (this.currentGame.settings.freeSpin.freeSpinStarted) return

        let temp = this.findSymbol(specialIcons.bonus);



        if (this.currentGame.settings.bonus.symbolCount <= temp.length) {

            this.currentGame.settings._winData.winningSymbols.push(temp);
            this.currentGame.settings.bonus.start = true;
            this.currentGame.settings.noOfBonus++;


            if (this.currentGame.settings.currentGamedata.bonus.type == bonusGameType.tap) {
                this.bonusResult = this.currentGame.settings.bonus.game.generateData();
                this.currentGame.settings._winData.totalWinningAmount += this.currentGame.settings.bonus.game.setRandomStopIndex();
            }
            if (this.currentGame.settings.currentGamedata.bonus.type == bonusGameType.spin)
                this.currentGame.settings._winData.totalWinningAmount += this.currentGame.settings.bonus.game.setRandomStopIndex();

            //NOTE: minispin for fruity cocktail
            if (this.currentGame.settings.currentGamedata.bonus.type == bonusGameType.miniSpin) {
                const betPerLines = this.currentGame.settings.BetPerLines;
                this.currentGame.settings.currentGamedata.bonus.noOfItem = temp.length;
                const result = runMiniSpin(this.currentGame.settings.currentGamedata.bonus, betPerLines);
                this.bonusResult = result
                this.currentGame.settings._winData.totalWinningAmount += result.totalWinAmount;
            }
            if (this.currentGame.settings.currentGamedata.bonus.type == bonusGameType.layerTap) {
                const result = this.currentGame.settings.bonus.game.setRandomStopIndex(this.bonusResult)
                this.currentGame.settings._winData.totalWinningAmount += result.amount;
                this.bonusResult = result.selectedIndex
            }

        }
    }

    private checkForFreeSpin() {
        let temp = this.findSymbol(specialIcons.FreeSpin);

        if (temp.length > (5 - this.currentGame.settings.freeSpin.freeSpinMuiltiplier.length)) {
            console.log("!!!! FREEE SPINNN !!!!!"
            );

            const freeSpins = this.accessData(this.currentGame.settings.freeSpin.symbolID, temp.length)
            this.currentGame.settings.freeSpin.freeSpinStarted = true;
            this.currentGame.settings.freeSpin.freeSpinsAdded = true;

            this.currentGame.settings.freeSpin.freeSpinCount += freeSpins;
            this.currentGame.playerData.totalSpin += freeSpins;
            this.currentGame.playerData.rtpSpinCount += freeSpins;
            this.currentGame.settings._winData.winningSymbols.push(temp);
        }
    }
    

    //check for win function
    private checkForWin() {
        try {
            const winningLines = [];
            let totalPayout = 0;
            this.currentGame.settings.lineData.forEach((line, index) => {
                const firstSymbolPosition = line[0];
                let firstSymbol = this.currentGame.settings.resultSymbolMatrix[firstSymbolPosition][0];

                if (this.currentGame.settings.wildSymbol.useWild && firstSymbol === this.currentGame.settings.wildSymbol.SymbolID.toString()) {
                    firstSymbol = this.findFirstNonWildSymbol(line);
                }

                if (Object.values(specialIcons).includes(this.currentGame.settings.currentGamedata.Symbols[firstSymbol].Name as specialIcons)) {
                    // console.log("Special Icon Matched : ", this.currentGame.settings.currentGamedata.Symbols[firstSymbol].Name)
                    return;
                }

                const { isWinningLine, matchCount, matchedIndices } = this.checkLineSymbols(firstSymbol, line);
                if (isWinningLine && matchCount >= 3) {
                    const symbolMultiplier = this.accessData(firstSymbol, matchCount);
                    console.log(matchedIndices)
                    if (symbolMultiplier > 0) {
                        totalPayout += symbolMultiplier;
                        this.currentGame.settings._winData.winningLines.push(index);
                        winningLines.push({
                            line,
                            symbol: firstSymbol,
                            multiplier: symbolMultiplier,
                            matchCount
                        });
                        console.log(`Line ${index + 1}:`, line);
                        console.log(`Payout for Line ${index + 1}:`, 'payout', symbolMultiplier);
                        const formattedIndices = matchedIndices.map(({ col, row }) => `${col},${row}`);
                        const validIndices = formattedIndices.filter(index => index.length > 2);
                        if (validIndices.length > 0) {
                            this.currentGame.settings._winData.winningSymbols.push(validIndices);
                        }
                    }
                }
            });

            this.currentGame.settings._winData.totalWinningAmount = totalPayout * this.currentGame.settings.BetPerLines
            return winningLines;
        } catch (error) {
            console.error("Error in checkForWin", error);
            return [];
        }
    }



    //checking matching lines with first symbol and wild subs
    private checkLineSymbols(firstSymbol: string, line: number[]): { isWinningLine: boolean, matchCount: number, matchedIndices: { col: number, row: number }[] } {
        try {

            const wildSymbol = this.currentGame.settings.wildSymbol.SymbolID.toString() || "";
            let matchCount = 1;
            let currentSymbol = firstSymbol;
            const matchedIndices: { col: number, row: number }[] = [{ col: 0, row: line[0] }];

            for (let i = 1; i < line.length; i++) {
                const rowIndex = line[i];
                const symbol = this.currentGame.settings.resultSymbolMatrix[rowIndex][i];

                if (symbol === undefined) {
                    console.error(`Symbol at position [${rowIndex}, ${i}] is undefined.`);
                    return { isWinningLine: false, matchCount: 0, matchedIndices: [] };
                }

                // if (i === 1 && currentSymbol !== wildSymbol) {

                //     break;
                // }

                if (symbol === currentSymbol || symbol === wildSymbol) {
                    matchCount++;
                    matchedIndices.push({ col: i, row: rowIndex });
                } else if (currentSymbol === wildSymbol) {
                    currentSymbol = symbol;
                    matchCount++;
                    matchedIndices.push({ col: i, row: rowIndex });
                } else {
                    break;
                }
            }

            return { isWinningLine: matchCount >= 3, matchCount, matchedIndices };
        } catch (error) {
            console.error('Error in checkLineSymbols:', error);
            return { isWinningLine: false, matchCount: 0, matchedIndices: [] };
        }
    }


    //checking first non wild symbol in lines which start with wild symbol
    private findFirstNonWildSymbol(line) {
        try {
            const wildSymbol = this.currentGame.settings.wildSymbol.SymbolID.toString();
            for (let i = 0; i < line.length; i++) {
                const rowIndex = line[i];
                const symbol = this.currentGame.settings.resultSymbolMatrix[rowIndex][i];
                if (symbol !== wildSymbol) {
                    return symbol;
                }
            }
            return wildSymbol;
        } catch (error) {
            // console.error("Error in findFirstNonWildSymbol:");
            return null;
        }
    }

    //payouts to user according to symbols count in matched lines
    private accessData(symbol, matchCount) {
        try {
            // console.log("Symbol:",symbol);

            const symbolData = this.currentGame.settings.currentGamedata.Symbols.find(s => s.Id.toString() === symbol.toString());
            if (symbolData) {
                const multiplierArray = symbolData.multiplier;
                if (multiplierArray && multiplierArray[5 - matchCount]) {
                    if (symbol == this.currentGame.settings.freeSpin.symbolID) {
                        return multiplierArray[5 - matchCount][1];
                    } else if (symbol == this.currentGame.settings.scatter.symbolID) {
                        return multiplierArray[5 - matchCount][0];
                    }
                    {
                        return multiplierArray[5 - matchCount][0]
                    }
                }
            }
            return 0;
        } catch (error) {
            // console.error("Error in accessData:");
            return 0;
        }
    }

    //special case for Scatter
    private checkForScatter() {
        this.scatterWinSymbols = [];
        if (this.currentGame.settings.scatter.useScatter) {
            console.log("SCATTER2")
            let temp = this.findSymbol(specialIcons.scatter);

            if (temp.length > (5 - this.currentGame.settings.scatter.multiplier.length)) {
                const winningAmount = this.accessData(this.currentGame.settings.scatter.symbolID, temp.length);
                this.currentGame.settings._winData.totalWinningAmount += winningAmount * this.currentGame.settings.BetPerLines;
                this.currentGame.settings._winData.winningSymbols.push(temp);

            }
        }
    }

    //special case for Jackpot
    private checkForJackpot() {
        if (this.useJackpot) {
            var temp = this.findSymbol(specialIcons.jackpot);
            if (temp.length > 0) this.jackpotWinSymbols.push(...temp);
            if (
                this.jackpot.symbolsCount > 0 &&
                this.jackpot.symbolsCount == this.jackpotWinSymbols.length
            ) {
                // console.log("!!!!!JACKPOT!!!!!");
                this.currentGame.settings._winData.winningSymbols.push(this.jackpotWinSymbols);
                this.currentGame.settings._winData.totalWinningAmount += this.jackpot.defaultAmount * this.currentGame.settings.BetPerLines;;
                this.currentGame.settings._winData.jackpotwin += this.jackpot.defaultAmount * this.currentGame.settings.BetPerLines;;
            }
        }
    }
    //finding Symbols for special case element
    private findSymbol(SymbolName: string) {
        let symbolId: number = -1;
        let foundArray = [];
        this.currentGame.settings.currentGamedata.Symbols.forEach((element) => {
            if (SymbolName == element.Name) symbolId = element.Id;
        });
        for (let i = 0; i < this.currentGame.settings.resultSymbolMatrix.length; i++) {
            for (let j = 0; j < this.currentGame.settings.resultSymbolMatrix[i].length; j++) {
                if (this.currentGame.settings.resultSymbolMatrix[i][j] == symbolId.toString())
                    foundArray.push(j.toString() + "," + i.toString());
            }
        }
        return foundArray;
    }

    makeResultJson(isResult: ResultType, iconsToFill: number[][] = []) {
        //TODO : Try to send the jackpot win data without initializie a variable;
        this.currentGame.settings._winData.totalWinningAmount =
            Math.round(this.currentGame.settings._winData.totalWinningAmount * 100) / 100;
        const ResultData = {
            GameData: {
                ResultReel: this.currentGame.settings.resultSymbolMatrix,
                linesToEmit: this.currentGame.settings._winData.winningLines,
                symbolsToEmit: this.currentGame.settings._winData.winningSymbols,
                WinAmout: this.currentGame.settings._winData.totalWinningAmount,
                freeSpins: {
                    count: this.currentGame.settings.freeSpin.freeSpinCount,
                    isNewAdded: this.currentGame.settings.freeSpin.freeSpinsAdded
                },
                jackpot: this.currentGame.settings._winData.jackpotwin,
                isBonus: this.currentGame.settings.bonus.start,
                BonusStopIndex: this.currentGame.settings.bonus.stopIndex,
                BonusResult: this.bonusResult,
            },
            PlayerData: {
                Balance: this.currentGame.getPlayerData().credits,
                totalbet: this.currentGame.playerData.totalbet,
                haveWon: this.currentGame.playerData.haveWon,
                currentWining: this.currentGame.playerData.currentWining

            }
        };
        // this.currentGame.updateDatabase()
        if (isResult == ResultType.normal)
            this.currentGame.sendMessage("ResultData", ResultData);
        if (isResult == ResultType.moolah) {
            ResultData.GameData['iconstoFill'] = iconsToFill;
            this.currentGame.sendMessage("MoolahResultData", ResultData);

        }
    }

    // private removeRecurringIndexSymbols(symbolsToEmit: string[][]): string[][] {
    //     const seen = new Set<string>();
    //     const result: string[][] = [];

    //     symbolsToEmit.forEach((subArray) => {
    //         if (!Array.isArray(subArray)) {
    //             return;
    //         }
    //         const uniqueSubArray: string[] = [];
    //         subArray.forEach((symbol) => {
    //             if (!seen.has(symbol)) {
    //                 seen.add(symbol);
    //                 uniqueSubArray.push(symbol);
    //             }
    //         });
    //         if (uniqueSubArray.length > 0) {
    //             result.push(uniqueSubArray);
    //         }
    //     });

    //     return result;
    // }


    private startFreeSpin() {
        this.currentGame.sendMessage('StartedFreeSpin', {})
        this.currentGame.settings.freeSpin.freeSpinStarted = true;
        this.currentGame.sendMessage("StoppedFreeSpins", {});
    }
}
