import { WinData } from "../BaseSlotGame/WinData";
import { convertSymbols, UiInitData,shuffleArray } from "../../Utils/gameUtils";
import { SLCRZ } from "./crazy777Base";
import { WINNINGTYPE } from "./types";

export function initializeGameSettings(gameData: any, gameInstance: SLCRZ) {
    return {
        id: gameData.gameSettings.id,
        isSpecial: gameData.gameSettings.isSpecial,
        matrix: gameData.gameSettings.matrix,
        bets: gameData.gameSettings.bets,
        Symbols: gameInstance.initSymbols,
        resultSymbolMatrix: [],
        currentGamedata: gameData.gameSettings,
        _winData: new WinData(gameInstance),
        canmatch: [],
        mixedPayout: 0,
        currentBet: 0,
        currentLines: 0,
        BetPerLines: 0,
        reels: [],
        defaultPayout: gameData.gameSettings.defaultPayout,
        SpecialType: gameData.gameSettings.SpecialType,
        isSpecialCrz: gameData.gameSettings.isSpecialCrz,
        freeSpinCount: 0,
        isFreeSpin: false,

    };
}

export function generateInitialReel(gameSettings: any): string[][] {
    const reels = [[], [], [], []];
    gameSettings.Symbols.forEach(symbol => {
        for (let i = 0; i < 4; i++) {
            const count = symbol.reelInstance[i] || 0;
            for (let j = 0; j < count; j++) {
                reels[i].push(symbol.Id);
            }
        }
    });
    reels.forEach(reel => {
        shuffleArray(reel);
    });
    return reels;
}

export function sendInitData(gameInstance: SLCRZ) {
    UiInitData.paylines = convertSymbols(gameInstance.settings.Symbols);
    const credits = gameInstance.getPlayerData().credits
    const Balance = credits.toFixed(2)
    const reels = generateInitialReel(gameInstance.settings);
    gameInstance.settings.reels = reels;
    const dataToSend = {
        GameData: {
            // Reel: reels,
            Bets: gameInstance.settings.currentGamedata.bets,
        },
        UIData: UiInitData,
        PlayerData: {
            Balance: Balance,
            haveWon: gameInstance.playerData.haveWon,
            currentWining: gameInstance.playerData.currentWining,
            totalbet: gameInstance.playerData.totalbet,
        },
    };
    gameInstance.sendMessage("InitData", dataToSend);
}



export function calculatePayout(gameInstance: SLCRZ, symbols: any[], symbolId: number, winType: string): number {
    try {
        const symbol = gameInstance.settings.Symbols.find(sym => sym.Id === symbolId);
        if (!symbol) {
            throw new Error(`Symbol with Id ${symbolId} not found.`);
        }

        let payout = 0;
        switch (winType) {
            case WINNINGTYPE.REGULAR:
                payout = symbol.payout * gameInstance.settings.BetPerLines;
                gameInstance.playerData.currentWining = payout
                break;

            case WINNINGTYPE.MIXED:
                payout = symbol.mixedPayout * gameInstance.settings.BetPerLines;
                gameInstance.playerData.currentWining = payout
                break;

            default:
                throw new Error(`Invalid winType: ${winType}`);
        }
        return payout;
    } catch (error) {
        console.error("Error calculating payout:", error.message);
        return 0;
    }
}

export enum EXTRASYMBOL {
    MULTIPLY = 'MULTIPLY',
    ADD = 'ADD',
    RESPIN = 'RESPIN'
}

export function applyExtraSymbolEffect(gameInstance: SLCRZ, payout: number, extraSymbolId: number): number {
    try {
        const extraSymbol = gameInstance.settings.Symbols.find(sym => sym.Id === extraSymbolId);

        if (!extraSymbol) {
            throw new Error(`Extra symbol with Id ${extraSymbolId} not found.`);
        }

        if (!extraSymbol.isSpecialCrz) {
            console.log("No special effect from the extra symbol.");
            return payout;
        }

        switch (extraSymbol.SpecialType) {
            case EXTRASYMBOL.MULTIPLY:
                console.log(`Special MULTIPLY: Multiplying payout by ${extraSymbol.payout}`);
                return payout * extraSymbol.payout;

            case EXTRASYMBOL.ADD:
                console.log(`Special ADD: Adding extra payout based on bet.`);
                const additionalPayout = extraSymbol.payout * gameInstance.settings.BetPerLines;
                return payout + additionalPayout;

            case EXTRASYMBOL.RESPIN:
                gameInstance.settings.isFreeSpin = true;
                const freeSpinCount = Math.floor(Math.random() * 3) + 3;
                gameInstance.settings.freeSpinCount = freeSpinCount;
                return payout;

            default:
                throw new Error(`Invalid SpecialType: ${extraSymbol.SpecialType}`);
        }
    } catch (error) {
        console.error("Error applying extra symbol effect:", error.message);
        return payout;
    }
}

export function checkWinningCondition(
    gameInstance: SLCRZ,
    row: any[]
): { winType: string; symbolId?: number } {
    try {
        if (row.length === 0) {
            throw new Error("Row is empty, cannot check winning condition.");
        }
        const firstSymbolId = row[0];
        const firstSymbol = gameInstance.settings.Symbols.find(
            (sym: any) => sym.Id === firstSymbolId
        );
        if (!firstSymbol) {
            throw new Error(`Symbol with Id ${firstSymbolId} not found.`);
        }
        const allSame = row.every((symbol) => symbol === firstSymbolId);
        if (allSame) {
            return { winType: WINNINGTYPE.REGULAR, symbolId: firstSymbolId };
        }
        if (firstSymbol.canmatch) {
            const canMatchSet = new Set(firstSymbol.canmatch.map(String));
            const isMixedWin = row.slice(1).every((symbol) => canMatchSet.has(symbol.toString()));

            if (isMixedWin) {
                return { winType: WINNINGTYPE.MIXED, symbolId: firstSymbolId };
            }
        }
        return { winType: 'default' };
    } catch (error) {
        console.error("Error in checkWinningCondition:", error.message);
        return { winType: 'error' };
    }
}

export function makeResultJson(gameInstance: SLCRZ) {
    try {
        const { settings, playerData } = gameInstance;
        const credits = gameInstance.getPlayerData().credits
        const Balance = credits.toFixed(2)
        const sendData = {
            gameData: {
                resultSymbols: settings.resultSymbolMatrix,
                isFreeSpin: settings.isFreeSpin,
                freeSpinCount: settings.freeSpinCount
            },
            PlayerData: {
                Balance: Balance,
                currentWining: playerData.currentWining,
                totalbet: playerData.totalbet,
                haveWon: playerData.haveWon,
            }
        };

        gameInstance.sendMessage('ResultData', sendData);
    } catch (error) {
        console.error("Error generating result JSON or sending message:", error);
    }
}