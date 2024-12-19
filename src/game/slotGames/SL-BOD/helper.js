"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeGameSettings = initializeGameSettings;
exports.generateInitialReel = generateInitialReel;
exports.makePayLines = makePayLines;
exports.sendInitData = sendInitData;
exports.checkForWin = checkForWin;
exports.makeResultJson = makeResultJson;
const WinData_1 = require("../BaseSlotGame/WinData");
const gameUtils_1 = require("../../Utils/gameUtils");
const types_1 = require("./types");
const utils_1 = require("../../../utils/utils");
/**
 * Initializes the game settings using the provided game data and game instance.
 * @param gameData - The data used to configure the game settings.
 * @param gameInstance - The instance of the SLBOD class that manages the game logic.
 * @returns An object containing initialized game settings.
 */
function initializeGameSettings(gameData, gameInstance) {
    return {
        id: gameData.gameSettings.id,
        matrix: gameData.gameSettings.matrix,
        currentGamedata: gameData.gameSettings,
        resultSymbolMatrix: [],
        bets: gameData.gameSettings.bets,
        Symbols: gameInstance.initSymbols,
        lineData: [],
        _winData: new WinData_1.WinData(gameInstance),
        currentBet: 0,
        currentLines: 0,
        BetPerLines: 0,
        reels: [],
        freeSpinIncrement: gameData.gameSettings.freespinIncrement || 10,
        isFreeSpin: false,
        freeSpinCount: 0,
        expandedReels: [],
        previousGambleResult: [],
        scatter: {
            SymbolName: "",
            SymbolID: -1,
            useWild: false,
        },
        expand: {
            SymbolName: "",
            SymbolID: -1,
            useWild: false,
        }
    };
}
/**
 * Generates the initial reel setup based on the game settings.
 * @param gameSettings - The settings used to generate the reel setup.
 * @returns A 2D array representing the reels, where each sub-array corresponds to a reel.
 */
function generateInitialReel(gameSettings) {
    const reels = [[], [], [], [], []];
    gameSettings.Symbols.forEach((symbol) => {
        for (let i = 0; i < 5; i++) {
            const count = symbol.reelInstance[i] || 0;
            for (let j = 0; j < count; j++) {
                reels[i].push(symbol.Id);
            }
        }
    });
    reels.forEach((reel) => {
        shuffleArray(reel);
    });
    return reels;
}
/**
 * Shuffles the elements of an array in place using the Fisher-Yates algorithm.
 * @param array - The array to be shuffled.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
/**
 * Creates special symbols in the game based on the game settings.
 * @param gameInstance - The instance of the SLBOD class that manages the game logic.
 */
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
        case types_1.specialIcons.expand:
            gameInstance.settings.expand.SymbolName = symbol.Name;
            gameInstance.settings.expand.SymbolID = symbol.Id;
            gameInstance.settings.expand.useWild = true;
            break;
        default:
            break;
    }
}
/**
 * Checks if a line has a winning combination of symbols.
 * @param firstSymbol - The first symbol in the line.
 * @param line - The line to be checked.
 * @param gameInstance - The instance of the SLBOD class that manages the game logic.
 * @returns An object containing information about the winning line.
 */
function checkLineSymbols(firstSymbol, line, gameInstance, direction = 'LTR') {
    try {
        const { settings } = gameInstance;
        const wildSymbol = settings.scatter.SymbolID || "";
        let matchCount = 1;
        let currentSymbol = firstSymbol;
        let isWild = firstSymbol === wildSymbol;
        const matchedIndices = [];
        const start = direction === 'LTR' ? 0 : line.length - 1;
        const end = direction === 'LTR' ? line.length : -1;
        const step = direction === 'LTR' ? 1 : -1;
        matchedIndices.push({ col: start, row: line[start] });
        for (let i = start + step; i !== end; i += step) {
            const rowIndex = line[i];
            const symbol = settings.resultSymbolMatrix[rowIndex][i];
            if (symbol === wildSymbol) {
                isWild = true;
            }
            if (symbol === undefined) {
                // console.error(`Symbol at position [${rowIndex}, ${i}] is undefined.`);
                return { isWinningLine: false, matchCount: 0, matchedIndices: [], isWild };
            }
            switch (true) {
                case symbol === currentSymbol || symbol === wildSymbol:
                    matchCount++;
                    matchedIndices.push({ col: i, row: rowIndex });
                    break;
                case currentSymbol === wildSymbol:
                    currentSymbol = symbol;
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
function findFirstNonWildSymbol(line, gameInstance, direction = 'LTR') {
    const { settings } = gameInstance;
    const wildSymbol = settings.scatter.SymbolID;
    const start = direction === 'LTR' ? 0 : line.length - 1;
    const end = direction === 'LTR' ? line.length : -1;
    const step = direction === 'LTR' ? 1 : -1;
    for (let i = start; i !== end; i += step) {
        const rowIndex = line[i];
        const symbol = settings.resultSymbolMatrix[rowIndex][i];
        if (symbol !== wildSymbol) {
            return symbol;
        }
    }
    return wildSymbol;
}
//payouts to user according to symbols count in matched lines
function accessData(symbol, matchCount, gameInstance) {
    const { settings } = gameInstance;
    try {
        const symbolData = settings.currentGamedata.Symbols.find((s) => s.Id.toString() === symbol.toString());
        if (symbolData) {
            const multiplierArray = symbolData.multiplier;
            if (multiplierArray && multiplierArray[5 - matchCount]) {
                return multiplierArray[5 - matchCount][0];
            }
        }
        return 0;
    }
    catch (error) {
        console.error("Error in accessData:");
        return 0;
    }
}
/**
 * Sends the initial game and player data to the client.
 * @param gameInstance - The instance of the SLBOD class containing the game settings and player data.
 */
function sendInitData(gameInstance) {
    gameInstance.settings.lineData =
        gameInstance.settings.currentGamedata.linesApiData;
    gameUtils_1.UiInitData.paylines = (0, gameUtils_1.convertSymbols)(gameInstance.settings.Symbols);
    const reels = generateInitialReel(gameInstance.settings);
    gameInstance.settings.reels = reels;
    const dataToSend = {
        GameData: {
            Reel: reels,
            linesApiData: gameInstance.settings.currentGamedata.linesApiData,
            Bets: gameInstance.settings.currentGamedata.bets,
        },
        UIData: gameUtils_1.UiInitData,
        PlayerData: {
            Balance: gameInstance.getPlayerData().credits,
        },
    };
    gameInstance.sendMessage("InitData", dataToSend);
}
function checkForFreespin(gameInstance) {
    try {
        const { settings } = gameInstance;
        let scatterCount = 0;
        settings.resultSymbolMatrix.forEach((row) => {
            row.forEach((symbol) => {
                if (symbol === settings.scatter.SymbolID) {
                    scatterCount++;
                }
            });
        });
        if (scatterCount >= 3) {
            settings.isFreeSpin = true;
            settings.freeSpinCount += settings.freeSpinIncrement;
        }
    }
    catch (error) {
        console.error("Error in checkForFreespin:", error);
    }
}
function checkAndHandleExpansion(gameInstance) {
    try {
        const { settings } = gameInstance;
        settings.resultSymbolMatrix.forEach((row, rowIndex) => {
            row.forEach((symbol, columnIndex) => {
                if (symbol == settings.expand.SymbolID) {
                    if (!settings.expandedReels.includes(columnIndex)) {
                        settings.expandedReels.push(columnIndex);
                    }
                }
            });
        });
        settings.expandedReels.forEach((columnIndex) => {
            settings.resultSymbolMatrix[0][columnIndex] = settings.expand.SymbolID;
            settings.resultSymbolMatrix[1][columnIndex] = settings.expand.SymbolID;
            settings.resultSymbolMatrix[2][columnIndex] = settings.expand.SymbolID;
        });
    }
    catch (error) {
        console.error("Error in checkAndHandleExpansion:", error);
    }
}
//CHECK WINS ON PAYLINES WITH OR WITHOUT WILD
function checkForWin(gameInstance) {
    try {
        const { settings } = gameInstance;
        const winningLines = [];
        let totalPayout = 0;
        if (settings.freeSpinCount > 0) {
            settings.freeSpinCount--;
            //NOTE: expansion check & handle
            checkAndHandleExpansion(gameInstance);
        }
        //NOTE: check for freespin
        checkForFreespin(gameInstance);
        settings.lineData.forEach((line, index) => {
            const firstSymbolPositionLTR = line[0];
            const firstSymbolPositionRTL = line[line.length - 1];
            // Get first symbols for both directions
            let firstSymbolLTR = settings.resultSymbolMatrix[firstSymbolPositionLTR][0];
            let firstSymbolRTL = settings.resultSymbolMatrix[firstSymbolPositionRTL][line.length - 1];
            // Handle wild symbols for both directions
            if (firstSymbolLTR === settings.scatter.SymbolID) {
                firstSymbolLTR = findFirstNonWildSymbol(line, gameInstance);
            }
            if (firstSymbolRTL === settings.scatter.SymbolID) {
                firstSymbolRTL = findFirstNonWildSymbol(line, gameInstance, 'RTL');
            }
            // Left-to-right check
            const LTRResult = checkLineSymbols(firstSymbolLTR, line, gameInstance, 'LTR');
            if (LTRResult.isWinningLine && LTRResult.matchCount >= 3) {
                const symbolMultiplierLTR = accessData(firstSymbolLTR, LTRResult.matchCount, gameInstance);
                if (symbolMultiplierLTR > 0) {
                    const payout = symbolMultiplierLTR * gameInstance.settings.BetPerLines;
                    totalPayout += payout;
                    // gameInstance.playerData.currentWining = precisionRound(payout,4);
                    // gameInstance.playerData.haveWon += gameInstance.playerData.currentWining;
                    settings._winData.winningLines.push(index + 1);
                    winningLines.push({
                        line,
                        symbol: firstSymbolLTR,
                        multiplier: symbolMultiplierLTR,
                        matchCount: LTRResult.matchCount,
                        direction: 'LTR'
                    });
                    const formattedIndices = LTRResult.matchedIndices.map(({ col, row }) => `${col},${row}`);
                    const validIndices = formattedIndices.filter((index) => index.length > 2);
                    if (validIndices.length > 0) {
                        // console.log(validIndices);
                        settings._winData.winningSymbols.push(validIndices);
                        settings._winData.totalWinningAmount = (0, utils_1.precisionRound)((totalPayout * settings.BetPerLines), 4);
                        // console.log(settings._winData.totalWinningAmount)
                    }
                    // console.log(`Line ${index + 1} (LTR):`, line);
                    // console.log(`Payout for LTR Line ${index + 1}:`, "payout", payout);
                    return;
                }
            }
        });
        gameInstance.playerData.currentWining = (0, utils_1.precisionRound)(totalPayout, 5);
        gameInstance.playerData.haveWon = (0, utils_1.precisionRound)(gameInstance.playerData.haveWon +
            gameInstance.playerData.currentWining, 5);
        makeResultJson(gameInstance);
        settings.isFreeSpin = false;
        settings.expandedReels = [];
        settings._winData.winningLines = [];
        settings._winData.winningSymbols = [];
        return winningLines;
    }
    catch (error) {
        console.error("Error in checkForWin:", error);
        return [];
    }
}
//MAKERESULT JSON FOR FRONTENT SIDE
function makeResultJson(gameInstance) {
    try {
        const { settings, playerData } = gameInstance;
        const credits = gameInstance.getPlayerData().credits;
        const Balance = credits.toFixed(2);
        const sendData = {
            GameData: {
                resultSymbols: settings.resultSymbolMatrix,
                linesToEmit: settings._winData.winningLines,
                symbolsToEmit: settings._winData.winningSymbols,
                isFreeSpin: settings.isFreeSpin,
                freeSpinCount: settings.freeSpinCount,
                expandedReels: settings.expandedReels
            },
            PlayerData: {
                Balance: Balance,
                totalbet: playerData.totalbet,
                haveWon: playerData.haveWon,
                currentWining: playerData.currentWining
            }
        };
        console.log(JSON.stringify(sendData));
        gameInstance.sendMessage('ResultData', sendData);
    }
    catch (error) {
        console.error("Error generating result JSON or sending message:", error);
    }
}
