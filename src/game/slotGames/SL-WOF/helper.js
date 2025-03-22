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
exports.initializeGameSettings = initializeGameSettings;
exports.generateInitialReel = generateInitialReel;
exports.triggerBonusGame = triggerBonusGame;
exports.sendInitData = sendInitData;
exports.checkWinningCondition = checkWinningCondition;
exports.calculatePayout = calculatePayout;
exports.makeResultJson = makeResultJson;
const WinData_1 = require("../BaseSlotGame/WinData");
const gameUtils_1 = require("../../Utils/gameUtils");
const types_1 = require("./types");
function initializeGameSettings(gameData, gameInstance) {
    return {
        id: gameData.gameSettings.id,
        isSpecial: gameData.gameSettings.isSpecial,
        matrix: gameData.gameSettings.matrix,
        bets: gameData.gameSettings.bets,
        Symbols: gameInstance.initSymbols,
        resultSymbolMatrix: [],
        currentGamedata: gameData.gameSettings,
        _winData: new WinData_1.WinData(gameInstance),
        canmatch: [],
        mixedPayout: 0,
        currentBet: 0,
        currentLines: 0,
        BetPerLines: 0,
        reels: [],
        defaultPayout: gameData.gameSettings.defaultPayout,
        SpecialType: gameData.gameSettings.SpecialType,
        isSpecialWof: gameData.gameSettings.isSpecialWof,
        symbolsCount: gameData.gameSettings.symbolsCount,
        isBonus: false,
        bonusStopIndex: 0,
        bonus: {
            payOut: [],
            payOutProb: []
        }
    };
}
function generateInitialReel(gameSettings) {
    const reels = [[], [], [], []];
    gameSettings.Symbols.forEach(symbol => {
        for (let i = 0; i < 3; i++) {
            const count = symbol.reelInstance[i] || 0;
            for (let j = 0; j < count; j++) {
                reels[i].push(symbol.Id);
            }
        }
    });
    reels.forEach(reel => {
        (0, gameUtils_1.shuffleArray)(reel);
    });
    return reels;
}
function triggerBonusGame(gameInstance) {
    const { settings } = gameInstance;
    const { payOut, payOutProb } = settings.currentGamedata.bonus;
    const randomValue = Math.random() * 100;
    let cumulativeProbability = 0;
    for (let i = 0; i < payOut.length; i++) {
        cumulativeProbability += payOutProb[i];
        if (randomValue <= cumulativeProbability) {
            console.log(`Bonus Game: Selected payout is ${payOut[i] * settings.BetPerLines} and index is ${i} `);
            gameInstance.settings.bonusStopIndex = i;
            return payOut[i];
        }
    }
    const SelectedBonusIndex = payOut.length - 1;
    gameInstance.settings.bonusStopIndex = SelectedBonusIndex;
    return payOut[payOut.length - 1];
}
function sendInitData(gameInstance) {
    gameUtils_1.UiInitData.paylines = (0, gameUtils_1.convertSymbols)(gameInstance.settings.Symbols);
    const credits = gameInstance.getPlayerData().credits;
    const Balance = credits.toFixed(2);
    const reels = generateInitialReel(gameInstance.settings);
    const { payOut } = gameInstance.settings.currentGamedata.bonus;
    gameInstance.settings.reels = reels;
    const dataToSend = {
        GameData: {
            Bets: gameInstance.settings.currentGamedata.bets,
            BonusPayout: payOut,
            Lines: gameInstance.settings.currentGamedata.linesApiData
        },
        UIData: gameUtils_1.UiInitData,
        PlayerData: {
            Balance: Balance,
            haveWon: gameInstance.playerData.haveWon,
            currentWining: gameInstance.playerData.currentWining,
            totalbet: gameInstance.playerData.totalbet,
        },
    };
    gameInstance.sendMessage("InitData", dataToSend);
}
function checkWinningCondition(gameInstance, row) {
    try {
        if (row.length === 0) {
            throw new Error("Row is empty, cannot check winning condition.");
        }
        const firstSymbolId = row[0];
        const firstSymbol = gameInstance.settings.Symbols.find(sym => sym.Id == firstSymbolId);
        if (!firstSymbol) {
            throw new Error(`Symbol with Id ${firstSymbolId} not found.`);
        }
        const allSame = row.every(symbol => symbol === firstSymbolId);
        if (allSame) {
            return { winType: types_1.WINNINGTYPE.REGULAR, symbolId: firstSymbolId };
        }
        if (firstSymbol.canmatch.length > 0) {
            const canMatchSet = new Set(firstSymbol.canmatch.map(String));
            const isMixedWin = row.slice(1).every(symbol => canMatchSet.has(symbol.toString()));
            if (isMixedWin) {
                return { winType: types_1.WINNINGTYPE.MIXED, symbolId: firstSymbolId };
            }
        }
        return { winType: types_1.WINNINGTYPE.DEFAULT };
    }
    catch (error) {
        console.error("Error in checkWinningCondition:", error.message);
        return { winType: 'error' };
    }
}
function calculatePayout(gameInstance, symbols, symbolId, winType) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const symbol = gameInstance.settings.Symbols.find(sym => sym.Id == symbolId);
            if (!symbol) {
                throw new Error(`Symbol with Id ${symbolId} not found.`);
            }
            let payout = 0;
            switch (winType) {
                case types_1.WINNINGTYPE.REGULAR:
                    payout = symbol.payout * gameInstance.settings.BetPerLines;
                    break;
                case types_1.WINNINGTYPE.MIXED:
                    payout = symbol.mixedPayout * gameInstance.settings.BetPerLines;
                    break;
                default:
                    throw new Error(`Invalid winType: ${winType}`);
            }
            return payout;
        }
        catch (error) {
            console.error("Error calculating payout:", error.message);
            return 0;
        }
    });
}
function makeResultJson(gameInstance, winningRows) {
    try {
        const { settings, playerData } = gameInstance;
        const credits = gameInstance.getPlayerData().credits;
        const Balance = credits.toFixed(2);
        const sendData = {
            GameData: {
                resultSymbols: settings.resultSymbolMatrix,
                linestoemit: winningRows,
                isbonus: settings.isBonus,
                BonusIndex: settings.bonusStopIndex,
            },
            PlayerData: {
                Balance: Balance,
                currentWining: playerData.currentWining,
                totalbet: playerData.totalbet,
                haveWon: playerData.haveWon,
            }
        };
        gameInstance.sendMessage('ResultData', sendData);
    }
    catch (error) {
        console.error("Error generating result JSON or sending message:", error);
    }
}
