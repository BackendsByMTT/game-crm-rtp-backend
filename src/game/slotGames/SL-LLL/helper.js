"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeGameSettings = initializeGameSettings;
exports.generateInitialReel = generateInitialReel;
exports.sendInitData = sendInitData;
exports.makePayLines = makePayLines;
exports.getSymbol = getSymbol;
exports.findSymbol = findSymbol;
exports.checkForFreespin = checkForFreespin;
exports.checkWin = checkWin;
exports.makeResultJson = makeResultJson;
const types_1 = require("./types");
const WinData_1 = require("../BaseSlotGame/WinData");
const gameUtils_1 = require("../../Utils/gameUtils");
const utils_1 = require("../../../utils/utils");
function initializeGameSettings(gameData, gameInstance) {
    var _a;
    const gameSettings = gameData.gameSettings || gameData; // Handle both possible structures
    const settings = {
        id: gameSettings.id,
        isSpecial: gameSettings.isSpecial,
        matrix: gameSettings.matrix,
        isEnabled: (_a = gameSettings.isEnabled) !== null && _a !== void 0 ? _a : true,
        bets: gameSettings.bets,
        Symbols: gameInstance.initSymbols,
        resultSymbolMatrix: [],
        currentGamedata: gameSettings,
        currentBet: 0,
        _winData: null,
        lineData: gameSettings.linesApiData,
        currentLines: 0,
        BetPerLines: 0,
        reels: [],
        defaultPayout: gameSettings.defaultPayout || 0,
        minMatchCount: gameSettings.minMatchCount || 3,
        maxMultiplier: 10,
        scatter: {
            SymbolName: "",
            SymbolID: -1,
            useWild: false
        },
        doubleLines: [],
        // isDouble: false,
        freeSpin: {
            SymbolName: "",
            SymbolID: -1,
            useWild: false,
            isFreeSpin: false,
            isFreeSpinTriggered: false,
            freeSpinCount: -1,
            freeSpinMultiplier: 1,
            freeSpinIncrement: gameSettings.freeSpin.incrementCount || 10,
            diamondMultipliers: gameSettings.freeSpin.diamondMultiplier || [],
            diamondCount: 0,
            payout: 0
        },
    };
    // Add WinData separately to avoid circular reference in logging
    settings._winData = new WinData_1.WinData(gameInstance);
    return settings;
}
function generateInitialReel(gameSettings) {
    try {
        if (!gameSettings || !gameSettings.matrix || !gameSettings.Symbols) {
            console.error("Invalid gameSettings object:", gameSettings);
            return [];
        }
        const reels = [];
        const numReels = gameSettings.matrix.x;
        for (let i = 0; i < numReels; i++) {
            const reel = [];
            gameSettings.Symbols.forEach((symbol) => {
                if (!symbol || !symbol.reelInstance) {
                    // console.warn("Invalid symbol object:", symbol);
                    return;
                }
                const count = symbol.reelInstance[i] || 0;
                for (let j = 0; j < count; j++) {
                    reel.push(symbol.Id);
                }
            });
            shuffleArray(reel);
            reels.push(reel);
        }
        return reels;
    }
    catch (e) {
        console.error("Error in generateInitialReel:", e);
        return [];
    }
}
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
function sendInitData(gameInstance) {
    gameUtils_1.UiInitData.paylines = (0, gameUtils_1.convertSymbols)(gameInstance.settings.Symbols);
    const credits = gameInstance.getPlayerData().credits;
    const Balance = credits.toFixed(2);
    const reels = gameInstance.settings.reels;
    gameInstance.settings.reels = reels;
    const dataToSend = {
        GameData: {
            // Reel: reels,
            Bets: gameInstance.settings.currentGamedata.bets,
            lines: gameInstance.settings.currentGamedata.linesApiData,
            daimondMultipliers: gameInstance.settings.freeSpin.diamondMultipliers,
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
function makePayLines(gameInstance) {
    const { settings } = gameInstance;
    settings.currentGamedata.Symbols.forEach((element) => {
        // if (!element.useWildSub) {
        handleSpecialSymbols(element, gameInstance);
        // }
    });
}
function handleSpecialSymbols(symbol, gameInstance) {
    switch (symbol.Name) {
        case types_1.specialIcons.scatter:
            gameInstance.settings.scatter.SymbolName = symbol.Name;
            gameInstance.settings.scatter.SymbolID = symbol.Id;
            gameInstance.settings.scatter.useWild = false;
            break;
        case types_1.specialIcons.freeSpin:
            gameInstance.settings.freeSpin.SymbolName = symbol.Name;
            gameInstance.settings.freeSpin.SymbolID = symbol.Id;
            gameInstance.settings.freeSpin.useWild = false;
            break;
        default:
            break;
    }
}
function getSymbol(id, Symbols) {
    return Symbols.find(s => s.Id == id);
}
//checking matching lines with first symbol and wild subs
function checkLineSymbols(firstSymbol, line, gameInstance, direction = 'LTR') {
    try {
        const { settings } = gameInstance;
        const wildSymbol = settings.scatter.SymbolID || "";
        let matchCount = 1;
        let currentSymbol = firstSymbol;
        let isWild = firstSymbol == wildSymbol;
        const matchedIndices = [];
        const start = direction === 'LTR' ? 0 : line.length - 1;
        const end = direction === 'LTR' ? line.length : -1;
        const step = direction === 'LTR' ? 1 : -1;
        matchedIndices.push({ col: start, row: line[start] });
        for (let i = start + step; i !== end; i += step) {
            const rowIndex = line[i];
            const symbol = settings.resultSymbolMatrix[rowIndex][i];
            if (symbol == wildSymbol) {
                isWild = true;
            }
            if (symbol == undefined) {
                // console.error(`Symbol at position [${rowIndex}, ${i}] is undefined.`);
                return { isWinningLine: false, matchCount: 0, matchedIndices: [], isWild };
            }
            switch (true) {
                case symbol.toString() == currentSymbol || symbol == wildSymbol:
                    matchCount++;
                    matchedIndices.push({ col: i, row: rowIndex });
                    break;
                case currentSymbol == wildSymbol:
                    currentSymbol = symbol.toString();
                    matchCount++;
                    matchedIndices.push({ col: i, row: rowIndex });
                    break;
                default:
                    return { isWinningLine: matchCount >= 3, matchCount, matchedIndices, isWild };
            }
        }
        return { isWinningLine: matchCount >= 3, matchCount, matchedIndices, isWild };
    }
    catch (error) {
        console.error("Error in checkLineSymbols:", error);
        return { isWinningLine: false, matchCount: 0, matchedIndices: [], isWild: false };
    }
}
//checking first non wild symbol in lines which start with wild symbol
function findFirstNonWildSymbol(line, gameInstance) {
    try {
        const { settings } = gameInstance;
        const wildSymbol = settings.scatter.SymbolID;
        for (let i = 0; i < line.length; i++) {
            const rowIndex = line[i];
            const symbol = settings.resultSymbolMatrix[rowIndex][i];
            if (symbol !== wildSymbol) {
                return symbol;
            }
        }
        return wildSymbol;
    }
    catch (error) {
        // console.error("Error in findFirstNonWildSymbol:");
        return null;
    }
}
//payouts to user according to symbols count in matched lines
function accessData(symbol, matchCount, gameInstance) {
    const { settings } = gameInstance;
    try {
        const symbolData = settings.currentGamedata.Symbols.find((s) => s.Id.toString() === symbol.toString());
        if (symbolData) {
            const multiplierArray = symbolData.multiplier;
            if (multiplierArray && multiplierArray[5 - matchCount]) {
                // if (symbol == settings.freeSpin.SymbolID) {
                //   return multiplierArray[5 - matchCount][1];
                // } else {
                return multiplierArray[5 - matchCount][0];
                // }
            }
        }
        return 0;
    }
    catch (error) {
        // console.error("Error in accessData:");
        return 0;
    }
}
/**
 * Finds symbols for a special case element in the result matrix.
 * @param gameInstance - The instance of the SLPSF class containing the game settings and player data.
 * @param SymbolName - The name of the symbol to search for in the symbol matrix.
 * @returns An array of strings representing the positions of the matching symbols in the format "column,row".
 */
function findSymbol(gameInstance, SymbolName) {
    const { settings } = gameInstance;
    const foundArray = [];
    try {
        let symbolId = -1;
        settings.currentGamedata.Symbols.forEach((element) => {
            if (SymbolName === element.Name)
                symbolId = element.Id;
        });
        if (symbolId === -1)
            return foundArray;
        for (let i = 0; i < settings.resultSymbolMatrix.length; i++) {
            for (let j = 0; j < settings.resultSymbolMatrix[i].length; j++) {
                if (settings.resultSymbolMatrix[i][j] === symbolId) {
                    foundArray.push(`${j},${i}`);
                }
            }
        }
    }
    catch (error) {
        console.error("Error in findSymbol:", error);
    }
    return foundArray;
}
function checkForFreespin(gameInstance) {
    try {
        const { settings } = gameInstance;
        const resultMatrix = settings.resultSymbolMatrix;
        const rows = resultMatrix.length;
        let col1Hasfreespin = false;
        let col2Hasfreespin = false;
        let col3Hasfreespin = false;
        for (let j = 0; j < rows; j++) {
            if (resultMatrix[j][1] == settings.freeSpin.SymbolID)
                col1Hasfreespin = true;
            if (resultMatrix[j][2] == settings.freeSpin.SymbolID)
                col2Hasfreespin = true;
            if (resultMatrix[j][3] == settings.freeSpin.SymbolID)
                col3Hasfreespin = true;
            if (col1Hasfreespin &&
                col2Hasfreespin &&
                col3Hasfreespin) {
                settings.freeSpin.isFreeSpinTriggered = true;
                settings.freeSpin.isFreeSpin = true;
                settings.freeSpin.freeSpinCount = settings.freeSpin.freeSpinIncrement;
                return true;
            }
        }
        settings.freeSpin.isFreeSpin = false;
        return false;
    }
    catch (e) {
        console.error("Error in checkForFreespin:", e);
        return false;
    }
}
function getFreeSpinMultiplier(count, multipliers) {
    let mult = 1;
    multipliers.forEach((element) => {
        if (element.range[0] <= count && element.range[1] >= count) {
            mult = element.multiplier;
        }
    });
    return mult;
}
function checkWin(gameInstance) {
    const { settings } = gameInstance;
    let totalPayout = 0;
    //NOTE: FREESPIN related checks
    //NOTE: check and increment freespinmultipliers 
    // Update multipliers based on symbol occurrences, 
    if (settings.freeSpin.freeSpinCount > -1) {
        const diamonds = findSymbol(gameInstance, settings.scatter.SymbolName);
        settings.freeSpin.diamondCount += diamonds.length;
        console.log("dia", diamonds);
        const mult = getFreeSpinMultiplier(settings.freeSpin.diamondCount, settings.freeSpin.diamondMultipliers);
        console.log("mult", mult);
        settings.freeSpin.freeSpinMultiplier = mult;
    }
    settings.lineData.forEach((line, index) => {
        const firstSymbolPositionLTR = line[0];
        const firstSymbolPositionRTL = line[line.length - 1];
        // Get first symbols for both directions
        let firstSymbolLTR = settings.resultSymbolMatrix[firstSymbolPositionLTR][0];
        let firstSymbolRTL = settings.resultSymbolMatrix[firstSymbolPositionRTL][line.length - 1];
        // Handle wild symbols for both directions
        if (firstSymbolLTR == settings.scatter.SymbolID) {
            firstSymbolLTR = findFirstNonWildSymbol(line, gameInstance);
        }
        // if (firstSymbolRTL === settings.scatter.SymbolID) {
        //   firstSymbolRTL = findFirstNonWildSymbol(line, gameInstance, 'RTL');
        // }
        // Left-to-right check
        const LTRResult = checkLineSymbols(firstSymbolLTR.toString(), line, gameInstance, 'LTR');
        if (LTRResult.isWinningLine && LTRResult.matchCount >= 3) {
            const symbolMultiplierLTR = accessData(firstSymbolLTR, LTRResult.matchCount, gameInstance);
            if (symbolMultiplierLTR > 0) {
                let payout = symbolMultiplierLTR * gameInstance.settings.BetPerLines;
                if (LTRResult.isWild) {
                    payout *= 2;
                    settings.doubleLines.push({
                        index,
                        payout: payout
                    });
                    // settings.isDouble = true
                }
                totalPayout += payout;
                // gameInstance.playerData.currentWining = precisionRound(payout,4);
                // gameInstance.playerData.haveWon += gameInstance.playerData.currentWining;
                settings._winData.winningLines.push(index + 1);
                // settings._winData.winningLines.push({
                //   line,
                //   symbol: firstSymbolLTR,
                //   multiplier: symbolMultiplierLTR,
                //   matchCount: LTRResult.matchCount,
                //   direction: 'LTR'
                // });
                const formattedIndices = LTRResult.matchedIndices.map(({ col, row }) => `${col},${row}`);
                const validIndices = formattedIndices.filter((index) => index.length > 2);
                if (validIndices.length > 0) {
                    settings._winData.winningSymbols.push(validIndices);
                    settings._winData.totalWinningAmount = (0, utils_1.precisionRound)((totalPayout * settings.BetPerLines), 4);
                }
                return;
            }
        }
    });
    if (settings.freeSpin.freeSpinCount <= -1) {
        checkForFreespin(gameInstance);
    }
    else {
        settings.freeSpin.isFreeSpinTriggered = false;
    }
    if (settings.freeSpin.freeSpinCount > -1) {
        settings.freeSpin.payout = (0, utils_1.precisionRound)(settings.freeSpin.payout + totalPayout, 4);
        gameInstance.playerData.currentWining = (0, utils_1.precisionRound)(totalPayout, 5);
    }
    else {
        gameInstance.playerData.currentWining = (0, utils_1.precisionRound)(totalPayout, 5);
        gameInstance.playerData.haveWon = (0, utils_1.precisionRound)(gameInstance.playerData.haveWon + gameInstance.playerData.currentWining, 5);
        gameInstance.incrementPlayerBalance(gameInstance.playerData.currentWining);
    }
    if (settings.freeSpin.isFreeSpinTriggered) {
        gameInstance.playerData.currentWining = (0, utils_1.precisionRound)(totalPayout, 5);
        gameInstance.playerData.haveWon = (0, utils_1.precisionRound)(gameInstance.playerData.haveWon + gameInstance.playerData.currentWining, 5);
        gameInstance.incrementPlayerBalance(gameInstance.playerData.currentWining);
        settings.freeSpin.payout = 0;
    }
    if (settings.freeSpin.freeSpinCount === 0) {
        // const mult = getFreeSpinMultiplier(settings.freeSpin.diamondCount, settings.freeSpin.diamondMultipliers)
        // console.log("mult",mult);
        // settings.freeSpin.freeSpinMultiplier = mult
        // gameInstance.playerData.currentWining = precisionRound(settings.freeSpin.payout * mult, 5)
        gameInstance.playerData.currentWining = (0, utils_1.precisionRound)(settings.freeSpin.payout * settings.freeSpin.freeSpinMultiplier, 5);
        gameInstance.playerData.haveWon = (0, utils_1.precisionRound)(gameInstance.playerData.haveWon + gameInstance.playerData.currentWining, 5);
        gameInstance.incrementPlayerBalance(gameInstance.playerData.currentWining);
    }
    makeResultJson(gameInstance);
    if (settings.freeSpin.freeSpinCount >= 0) {
        settings.freeSpin.freeSpinCount -= 1;
    }
    if (settings.freeSpin.freeSpinCount === -1) {
        settings.freeSpin.isFreeSpin = false;
        settings.freeSpin.payout = 0;
        settings.freeSpin.diamondCount = 0;
        settings.freeSpin.freeSpinMultiplier = 1;
    }
    // settings.isDouble = []
    if (settings.doubleLines.length > 0) {
        settings.doubleLines = [];
    }
    settings._winData.winningLines = [];
    settings._winData.winningSymbols = [];
    return { payout: totalPayout };
}
function convertStringArrayToNumberArray(input) {
    return input.flatMap(innerArray => innerArray.map(str => str.split(',').map(Number)));
}
function makeResultJson(gameInstance) {
    try {
        const { settings, playerData } = gameInstance;
        const credits = gameInstance.getPlayerData().credits;
        const Balance = credits.toFixed(5);
        const sendData = {
            GameData: {
                resultSymbols: settings.resultSymbolMatrix,
                linesToEmit: settings._winData.winningLines,
                symbolsToEmit: convertStringArrayToNumberArray(settings._winData.winningSymbols),
                freeSpin: {
                    isFreeSpin: settings.freeSpin.isFreeSpinTriggered,
                    freeSpinCount: settings.freeSpin.freeSpinCount,
                    freeSpinMultiplier: settings.freeSpin.freeSpinMultiplier,
                    diamondCount: settings.freeSpin.diamondCount,
                    payout: (0, utils_1.precisionRound)(settings.freeSpin.payout, 4)
                },
                doubleLines: settings.doubleLines,
            },
            PlayerData: {
                Balance: Balance,
                currentWining: playerData.currentWining,
                totalbet: playerData.totalbet,
                haveWon: playerData.haveWon,
            }
        };
        console.log("Sending result JSON:", JSON.stringify(sendData, null, 2));
        gameInstance.sendMessage('ResultData', sendData);
    }
    catch (error) {
        console.error("Error generating result JSON or sending message:", error);
    }
}
