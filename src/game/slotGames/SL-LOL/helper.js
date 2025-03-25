"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeGameSettings = initializeGameSettings;
exports.generateInitialReel = generateInitialReel;
exports.sendInitData = sendInitData;
exports.makeResultJson = makeResultJson;
exports.printMatrix = printMatrix;
exports.printWinningCombinations = printWinningCombinations;
exports.getSymbol = getSymbol;
exports.isWild = isWild;
exports.checkWin = checkWin;
exports.checkForFreespin = checkForFreespin;
const WinData_1 = require("../BaseSlotGame/WinData");
const gameUtils_1 = require("../../Utils/gameUtils");
const utils_1 = require("../../../utils/utils");
function initializeGameSettings(gameData, gameInstance) {
    var _a, _b;
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
        currentLines: 0,
        BetPerLines: 0,
        reels: [],
        defaultPayout: gameSettings.defaultPayout || 0,
        minMatchCount: gameSettings.minMatchCount || 3,
        isFreeSpin: false,
        isFreeSpinTriggered: false,
        freeSpinCount: 0,
        freeSpinMultipliers: [1, 1, 1, 1, 1],
        freeSpinSymbolId: ((_b = gameInstance.currentGameData.gameSettings.Symbols.find((sym) => sym.Name == 'FreeSpin')) === null || _b === void 0 ? void 0 : _b.Id) || "12",
        maxMultiplier: 10,
        freeSpinIncrement: gameSettings.freeSpin.incrementCount,
        gamble: gameSettings.gamble,
        winningCombinations: []
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
        // console.log("Number of reels:", numReels);
        for (let i = 0; i < numReels; i++) {
            const reel = [];
            gameSettings.Symbols.forEach((symbol) => {
                if (!symbol || !symbol.reelInstance) {
                    // console.warn("Invalid symbol object:", symbol);
                    return;
                }
                const count = symbol.reelInstance[i] || 0;
                // console.log(`Reel ${i}, Symbol ${symbol.Name}, Count: ${count}`);
                for (let j = 0; j < count; j++) {
                    reel.push(symbol.Id);
                }
            });
            (0, gameUtils_1.shuffleArray)(reel);
            reels.push(reel);
        }
        // console.log("Generated reels:", reels);
        return reels;
    }
    catch (e) {
        console.error("Error in generateInitialReel:", e);
        return [];
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
            Reel: reels,
            Bets: gameInstance.settings.currentGamedata.bets,
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
function makeResultJson(gameInstance) {
    try {
        const { settings, playerData } = gameInstance;
        const credits = gameInstance.getPlayerData().credits;
        const Balance = credits.toFixed(3);
        const sendData = {
            gameData: {
                resultSymbols: settings.resultSymbolMatrix,
                freeSpin: {
                    isFreeSpin: settings.isFreeSpin,
                    freeSpinCount: settings.freeSpinCount,
                    freeSpinMultipliers: settings.freeSpinMultipliers
                },
                winningCombinations: settings.winningCombinations,
            },
            PlayerData: {
                Balance: Balance,
                currentWining: playerData.currentWining,
                totalbet: playerData.totalbet,
                haveWon: playerData.haveWon,
            }
        };
        // console.log("Sending result JSON:", sendData);
        gameInstance.sendMessage('ResultData', sendData);
    }
    catch (error) {
        console.error("Error generating result JSON or sending message:", error);
    }
}
function printMatrix(matrix, getSymbol, gameInstance) {
    const symbolNames = matrix.map(col => col.map(symbolId => { var _a; return ((_a = getSymbol(symbolId)) === null || _a === void 0 ? void 0 : _a.Name.substring(0, 4)) || 'Unkn'; }));
    for (let row = 0; row < gameInstance.settings.matrix.y; row++) {
        console.log(symbolNames.map(col => col[row].padEnd(4)).join(' | '));
    }
}
function printWinningCombinations(winningCombinations) {
    if (winningCombinations.length == 0) {
        console.log("No winning combinations.");
        return;
    }
    console.log("Winning Combinations:");
    winningCombinations.forEach((combo, index) => {
        console.log(`Combination ${index + 1}:`);
        console.log(`  Symbol ID: ${combo.symbolId}`);
        console.log(`  Positions: ${combo.positions.map(pos => `(${pos[0]},${pos[1]})`).join(', ')}`);
        console.log(`  Payout: ${combo.payout}`);
        console.log(); // Empty line for separation
    });
    const totalPayout = winningCombinations.reduce((sum, combo) => sum + combo.payout, 0);
    console.log(`Total Payout: ${totalPayout}`);
}
function getSymbol(id, Symbols) {
    return Symbols.find(s => s.Id == id);
}
function isWild(symbolId) {
    // const symbol = this.getSymbol(symbolId);
    // return symbol ? symbol.Name === "Wild" : false;
    return symbolId == 11;
}
// export function simulateFreespin(gameInstance: SLLOL): FreeSpinResponse {
//   const { settings } = gameInstance;
//   settings.isFreeSpin = true;
//   settings.freeSpinCount = 10;
//   let response: FreeSpinResponse = {
//     freeSpinCount: [],
//     freeSpinMultipliers: [],
//     combinations: [],
//     results: [],
//     isRetriggered: [],
//     payouts: []
//   };
//
//   // Initialize freeSpinMultipliers for major symbols
//   // const majorSymbolIds = settings.Symbols
//   //   .filter(symbol => symbol.isFreeSpinMultiplier)
//   //   .map(symbol => symbol.Id);
//   let currentMultipliers = settings.freeSpinMultipliers
//
//   while (settings.freeSpinCount > 0) {
//     new RandomResultGenerator(gameInstance);
//     settings.freeSpinCount -= 1;
//     const resultMatrix = settings.resultSymbolMatrix;
//     const { winningCombinations } = checkWin(gameInstance);
//
//     let totalPayout = 0;
//     winningCombinations.forEach((combination) => {
//       const symbol = getSymbol(combination.symbolId, settings.Symbols);
//       if (symbol.isFreeSpinMultiplier) {
//         combination.payout = combination.payout * settings.BetPerLines * currentMultipliers[combination.symbolId];
//       } else {
//         combination.payout = combination.payout * settings.BetPerLines;
//       }
//       totalPayout += combination.payout;
//     });
//
//     response.results.push(resultMatrix);
//     response.payouts.push(totalPayout);
//     response.combinations.push(winningCombinations);
//
//     //NOTE: retrigger 
//     if (checkForFreespin(gameInstance)) {
//       response.isRetriggered.push(true);
//       settings.freeSpinCount += 3;
//     } else {
//       response.isRetriggered.push(false);
//     }
//     response.freeSpinCount.push(settings.freeSpinCount);
//
//     //NOTE: 
//     // Update multipliers based on symbol occurrences, capped at MAX_MULTIPLIER
//     resultMatrix.flat().forEach((symbolId) => {
//       if (currentMultipliers.hasOwnProperty(symbolId)) {
//         currentMultipliers[symbolId] = Math.min(currentMultipliers[symbolId] + 1, settings.maxMultiplier);
//       }
//     });
//
//     response.freeSpinMultipliers.push([...Object.values(currentMultipliers)]);
//   }
//
//   settings.isFreeSpin = false;
//   settings.freeSpinCount = 0;
//   settings.freeSpinMultipliers = [1, 1, 1, 1, 1];
//   return response;
// }
function checkWin(gameInstance) {
    const { settings, playerData } = gameInstance;
    let totalPayout = 0;
    let winningCombinations = [];
    const findCombinations = (symbolId, col, path) => {
        // Stop if we've checked all columns or path is complete
        if (col == settings.matrix.x) {
            if (path.length >= settings.minMatchCount) {
                const symbol = getSymbol(symbolId, settings.Symbols);
                const multiplierIndex = Math.abs(path.length - 5);
                if (symbol && symbol.multiplier[multiplierIndex]) { // Check if multiplier exists
                    const multiplier = symbol.multiplier[multiplierIndex][0];
                    winningCombinations.push({ symbolId, positions: path, payout: multiplier * settings.BetPerLines });
                }
            }
            return;
        }
        for (let row = 0; row < settings.resultSymbolMatrix.length; row++) {
            const currentSymbolId = settings.resultSymbolMatrix[row][col];
            if (currentSymbolId == symbolId || isWild(currentSymbolId)) {
                findCombinations(symbolId, col + 1, [...path, [row, col]]);
            }
        }
        // End the combination if it's long enough
        if (path.length >= settings.minMatchCount) {
            const symbol = getSymbol(symbolId, settings.Symbols);
            let multiplierIndex = Math.abs(path.length - 5);
            if (symbol && symbol.multiplier[multiplierIndex]) { // Check if multiplier exists
                const multiplier = symbol.multiplier[multiplierIndex][0];
                winningCombinations.push({ symbolId, positions: path, payout: multiplier * settings.BetPerLines });
            }
        }
    };
    // Iterate over each symbol in the first column
    settings.Symbols.forEach(symbol => {
        if (symbol.Name !== "Wild") {
            for (let row = 0; row < settings.matrix.y; row++) {
                const startSymbolId = settings.resultSymbolMatrix[row][0]; // Start in the leftmost column (0)
                if (startSymbolId == symbol.Id || isWild(startSymbolId)) {
                    findCombinations(symbol.Id, 1, [[row, 0]]);
                }
            }
        }
    });
    // Filter out shorter combinations that are subsets of longer ones
    winningCombinations = winningCombinations.filter((combo, index, self) => !self.some((otherCombo, otherIndex) => index != otherIndex &&
        combo.symbolId == otherCombo.symbolId &&
        combo.positions.length < otherCombo.positions.length &&
        combo.positions.every((pos, i) => pos[0] == otherCombo.positions[i][0] && pos[1] == otherCombo.positions[i][1])));
    //NOTE: FREESPIN related checks
    //NOTE: check and increment freespinmultipliers 
    // Update multipliers based on symbol occurrences, capped at MAX_MULTIPLIER
    if (settings.freeSpinCount > 0) {
        settings.resultSymbolMatrix.flat().forEach((symbolId) => {
            if (settings.freeSpinMultipliers.hasOwnProperty(symbolId)) {
                settings.freeSpinMultipliers[symbolId] = Math.min(settings.freeSpinMultipliers[symbolId] + 1, settings.maxMultiplier);
            }
        });
    }
    const bool = checkForFreespin(gameInstance);
    // console.log("isFreespin", bool);
    //reset multiplers for freespin when its over 
    if (settings.freeSpinCount <= 0 && settings.isFreeSpin === false) {
        settings.freeSpinMultipliers = [1, 1, 1, 1, 1];
    }
    // else {
    //   settings.freeSpinCount -= 1
    // }
    winningCombinations.forEach(combo => {
        // alter payout . multiply betsperline with payout
        // NOTE: also check for freespin multipliers 
        if (settings.freeSpinCount > 0 && getSymbol(combo.symbolId, settings.Symbols).isFreeSpinMultiplier) {
            combo.payout = combo.payout * settings.freeSpinMultipliers[combo.symbolId];
        }
        else {
            combo.payout = combo.payout;
        }
        totalPayout += combo.payout;
    });
    settings.winningCombinations = winningCombinations;
    gameInstance.playerData.currentWining = (0, utils_1.precisionRound)(totalPayout, 3);
    gameInstance.playerData.haveWon += gameInstance.playerData.currentWining;
    gameInstance.playerData.haveWon = (0, utils_1.precisionRound)(gameInstance.playerData.haveWon, 3);
    gameInstance.incrementPlayerBalance(gameInstance.playerData.currentWining);
    makeResultJson(gameInstance);
    if (settings.freeSpinCount > 0) {
        settings.freeSpinCount -= 1;
    }
    return { payout: totalPayout, winningCombinations };
}
function checkForFreespin(gameInstance) {
    try {
        const { settings } = gameInstance;
        const resultMatrix = settings.resultSymbolMatrix;
        const rows = resultMatrix.length;
        // Check if 1st, 2nd, and 3rd columns have symbol with ID 12 regardless of row
        let col1Has12 = false;
        let col2Has12 = false;
        let col3Has12 = false;
        for (let j = 0; j < rows; j++) { // Loop through rows
            if (resultMatrix[j][0] == settings.freeSpinSymbolId)
                col1Has12 = true; // Check 1st column
            if (resultMatrix[j][1] == settings.freeSpinSymbolId)
                col2Has12 = true; // Check 2nd column
            if (resultMatrix[j][2] == settings.freeSpinSymbolId)
                col3Has12 = true; // Check 3rd column
            // If all three columns have the symbol, return true
            if (col1Has12 && col2Has12 && col3Has12) {
                settings.isFreeSpinTriggered = true;
                settings.isFreeSpin = true;
                settings.freeSpinCount += settings.freeSpinIncrement;
                return true;
            }
        }
        settings.isFreeSpin = false;
        // If one of the columns doesn't have the symbol, return false
        return false;
    }
    catch (e) {
        console.error("Error in checkForFreespin:", e);
        return false; // Handle error by returning false in case of failure
    }
}
