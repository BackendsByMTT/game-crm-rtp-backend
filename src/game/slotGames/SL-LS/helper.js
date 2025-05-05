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
/**
 * Initializes the game settings using the provided game data and game instance.
 * @param gameData - The data used to configure the game settings.
 * @param gameInstance - The instance of the SLCM class that manages the game logic.
 * @returns An object containing initialized game settings.
 */
function initializeGameSettings(gameData, gameInstance) {
    return {
        id: gameData.gameSettings.id,
        matrix: gameData.gameSettings.matrix,
        bets: gameData.gameSettings.bets,
        baseBet: gameData.gameSettings.baseBet,
        BetMultiplier: gameData.gameSettings.betMultiplier,
        Symbols: gameInstance.initSymbols,
        resultSymbolMatrix: [],
        currentGamedata: gameData.gameSettings,
        lineData: [],
        _winData: new WinData_1.WinData(gameInstance),
        currentBet: 0,
        baseBetAmount: gameData.gameSettings.baseBet,
        payoutCombination: gameData.gameSettings.paytable,
        currentLines: 0,
        BetPerLines: 0,
        reels: [],
        // anyMatchCount:gameData.gameSettings.anyPayout,
        freeSpin: {
            freeSpinAwarded: gameData.gameSettings.freeSpinCount,
            freeSpinCount: 0,
            useFreeSpin: false,
            freeSpinPayout: 0,
            freeSpinsAdded: false,
        },
        jackpotPayout: gameData.gameSettings.jackpotMultiplier,
        jackpotCombination: gameData.gameSettings.jackpotCombination,
        wild: {
            SymbolName: "",
            SymbolID: -1,
            useWild: false,
        },
        bonus: {
            SymbolName: "",
            SymbolID: -1,
            useWild: false,
        },
        bar3: {
            SymbolName: "",
            SymbolID: -1,
            useWild: false,
        },
        bar2: {
            SymbolName: "",
            SymbolID: -1,
            useWild: false,
        },
        bar1: {
            SymbolName: "",
            SymbolID: -1,
            useWild: false,
        },
        blank: {
            SymbolName: "",
            SymbolID: -1,
            useWild: false,
        },
        isJackpot: false
    };
}
/**
 * Generates the initial reel setup based on the game settings.
 * @param gameSettings - The settings used to generate the reel setup.
 * @returns A 2D array representing the reels, where each sub-array corresponds to a reel.
 */
function generateInitialReel(gameSettings) {
    const reels = [[], [], [], [], [], [], []];
    gameSettings.Symbols.forEach((symbol) => {
        for (let i = 0; i < 3; i++) {
            const count = symbol.reelInstance[i] || 0;
            for (let j = 0; j < count; j++) {
                reels[i].push(symbol.Id);
            }
        }
    });
    reels.forEach((reel) => {
        (0, gameUtils_1.shuffleArray)(reel);
    });
    return reels;
}
/**
 * Configures paylines based on the game's settings and handles special symbols.
 * @param gameInstance - The instance of the game.
 */
function makePayLines(gameInstance) {
    const { settings } = gameInstance;
    settings.currentGamedata.Symbols.forEach((element) => {
        // if (!element.useWildSub) {
        handleSpecialSymbols(element, gameInstance);
        // }
    });
}
/**
 * Sends initial game and player data to the client.
 * @param gameInstance - The instance of the game containing settings and player data.
 */
function sendInitData(gameInstance) {
    gameInstance.settings.lineData =
        gameInstance.settings.currentGamedata.linesApiData;
    const symbols = gameInstance.settings.Symbols;
    gameUtils_1.UiInitData.paylines = (0, gameUtils_1.convertSymbols)(symbols);
    const reels = generateInitialReel(gameInstance.settings);
    gameInstance.settings.reels = reels;
    const dataToSend = {
        GameData: {
            Reel: reels,
            // BonusReel: bonusReels,
            paytable: gameInstance.settings.payoutCombination,
            linesApiData: gameInstance.settings.currentGamedata.linesApiData,
            Bets: gameInstance.settings.currentGamedata.bets,
            baseBet: gameInstance.settings.baseBetAmount,
            betMultiplier: gameInstance.settings.currentGamedata.betMultiplier,
            jackpotMultiplier: gameInstance.settings.jackpotPayout
        },
        UIData: gameUtils_1.UiInitData,
        PlayerData: {
            Balance: gameInstance.getPlayerData().credits,
            haveWon: gameInstance.playerData.haveWon,
            currentWining: gameInstance.playerData.currentWining,
            totalbet: gameInstance.playerData.totalbet,
        },
    };
    gameInstance.sendMessage("InitData", dataToSend);
}
/**
 * Checks for a win in the game and handles various game mechanics such as sticky bonuses, free spins, and base game wins.
 * The function performs the following tasks:
 * 1. **Sticky Bonus**: If there are sticky bonus symbols, it decrements their value and freezes the symbol on the grid.
 * 2. **Free Spin Logic**: If free spins are active, it reduces the free spin count and calculates the payout for free spins once they are exhausted.
 * 3. **Base Game Logic**: If free spins are not active, it checks for occurrences of winning symbols on the grid, calculates the corresponding payout, and updates the total payout.
 * 4. **Payout Calculation**: Based on the game state, it calculates the total payout for both free spins and base game wins.
 * 5. **Player Data Update**: Updates the player's current winnings and adds the win amount to the player's balance.
 * 6. **Game State Reset**: Resets relevant game settings and variables to prepare for the next round.
 *
 * @param gameInstance - The instance of the SLSM class managing the game logic.
 */
function checkForWin(gameInstance) {
    try {
        const { settings } = gameInstance;
        const winningLines = [];
        let totalPayout = 0;
        settings.lineData.forEach((line, index) => {
            const firstSymbolPosition = line[0];
            let firstSymbol = settings.resultSymbolMatrix[firstSymbolPosition][0];
            // if (settings.wild.useWild && firstSymbol === settings.wild.SymbolID) {
            //     firstSymbol = findFirstNonWildSymbol(line, gameInstance);
            // }
            const { isWinningLine, matchCount, matchedIndices: winMatchedIndices, matchedSymbols } = checkLineSymbols(firstSymbol, line, gameInstance);
            if ((isWinningLine && matchCount >= 3)) {
                //   console.log(matchedSymbols, "matched symbols");
                const processedSymbols = matchedSymbols.map((symbol, index) => {
                    if (symbol === gameInstance.settings.wild.SymbolID && index > 0) {
                        return matchedSymbols[index - 1];
                    }
                    return symbol;
                });
                const payout = calculatePayoutForCombination(processedSymbols, settings.payoutCombination, gameInstance);
                totalPayout += payout * gameInstance.settings.BetPerLines;
                if (payout > 0) {
                    console.log(payout);
                    settings._winData.winningLines.push(index);
                    winningLines.push({
                        line,
                        symbol: firstSymbol,
                        multiplier: payout,
                        matchCount,
                    });
                    console.log(`Line ${index + 1}:`, line);
                    console.log(`Payout for Line ${index + 1}:`, 'payout');
                    const formattedIndices = winMatchedIndices.map(({ col, row }) => `${col},${row}`);
                    const validIndices = formattedIndices.filter(index => index.length > 2);
                    if (validIndices.length > 0) {
                        gameInstance.settings._winData.winningSymbols.push(validIndices);
                    }
                }
            }
        });
        if (checkForJackpot(gameInstance)) {
            console.log("JACKPOT TRIGGERED!");
            totalPayout = settings.jackpotPayout * gameInstance.settings.BetPerLines;
            settings.isJackpot = true;
        }
        gameInstance.playerData.currentWining += totalPayout;
        gameInstance.playerData.haveWon = parseFloat((gameInstance.playerData.haveWon + parseFloat(gameInstance.playerData.currentWining.toFixed(4))).toFixed(4));
        gameInstance.updatePlayerBalance(gameInstance.playerData.currentWining);
        makeResultJson(gameInstance);
        settings._winData.totalWinningAmount = 0;
        gameInstance.playerData.currentWining = 0;
        settings.freeSpin.freeSpinPayout = 0;
        settings.freeSpin.freeSpinsAdded = false;
        settings._winData.winningSymbols = [];
        settings.isJackpot = false;
        settings._winData.winningLines = [];
    }
    catch (error) {
        console.error("Error in checkForWin", error);
        return [];
    }
}
function checkLineSymbols(firstSymbol, line, gameInstance) {
    try {
        const { settings } = gameInstance;
        const wildSymbol = settings.wild.SymbolID || "";
        if (settings.blank.SymbolID === Number(firstSymbol)) {
            return { isWinningLine: false, matchCount: 0, matchedIndices: [], matchedSymbols: [] };
        }
        let matchCount = 1;
        let currentSymbol = firstSymbol;
        const matchedIndices = [{ col: 0, row: line[0] }];
        const matchedSymbols = [Number(firstSymbol)];
        const firstSymbolObject = settings.Symbols.find(symbol => symbol.Id === Number(firstSymbol));
        const canMatchSymbols = (firstSymbolObject === null || firstSymbolObject === void 0 ? void 0 : firstSymbolObject.canmatch) || [];
        // Loop through the line
        for (let i = 1; i < line.length; i++) {
            const rowIndex = line[i];
            const symbol = settings.resultSymbolMatrix[rowIndex][i];
            if (symbol === undefined) {
                console.error(`Symbol at position [${rowIndex}, ${i}] is undefined.`);
                return { isWinningLine: false, matchCount: 0, matchedIndices: [], matchedSymbols: [] };
            }
            if (symbol === settings.blank.SymbolID) {
                break;
            }
            // Check for matches (consider wild symbols and canmatch)
            if (symbol === currentSymbol ||
                symbol === wildSymbol ||
                (currentSymbol !== wildSymbol && canMatchSymbols.includes(symbol.toString()))) {
                matchCount++;
                matchedIndices.push({ col: i, row: rowIndex });
                matchedSymbols.push(symbol);
            }
            else if (currentSymbol === wildSymbol) {
                currentSymbol = symbol;
                matchCount++;
                matchedIndices.push({ col: i, row: rowIndex });
                // matchedSymbols.push(symbol);
            }
            else {
                break;
            }
        }
        return { isWinningLine: matchCount >= 3, matchCount, matchedIndices, matchedSymbols };
    }
    catch (error) {
        console.error("Error in checkLineSymbols:", error);
        return { isWinningLine: false, matchCount: 0, matchedIndices: [], matchedSymbols: [] };
    }
}
function findFirstNonWildSymbol(line, gameInstance) {
    try {
        const { settings } = gameInstance;
        const wildSymbol = settings.wild.SymbolID;
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
        console.error("Error in findFirstNonWildSymbol:", error);
        return null;
    }
}
function calculatePayoutForCombination(matchedSymbols, paytable, gameInstance) {
    for (const { combination, payout } of paytable) {
        if (arraysMatchForPayout(matchedSymbols, combination, gameInstance)) {
            return payout;
        }
    }
    return 0;
}
function arraysMatchForPayout(matchedSymbols, combination, gameInstance) {
    if (matchedSymbols.length === combination.length) {
        return matchedSymbols.every((value, index) => {
            return value == combination[index] || value == gameInstance.settings.wild.SymbolID;
        });
    }
    else {
        const set1 = new Set(matchedSymbols);
        const set2 = new Set(combination.map(symbol => Number(symbol)));
        return set1.size === set2.size && [...set1].every(value => set2.has(value));
    }
}
function checkForJackpot(gameInstance) {
    const { settings } = gameInstance;
    const jackpotCombination = new Set(settings.jackpotCombination);
    return settings.resultSymbolMatrix.every(row => {
        const uniqueSymbols = new Set(row);
        return uniqueSymbols.size === 3 && [...uniqueSymbols].every((symbol) => jackpotCombination.has(symbol));
    });
}
/**
 * Configures game settings based on the special symbol provided.
 * Updates the relevant symbol properties in the game instance based on the type of the special symbol.
 *
 * @param symbol - The symbol object containing details such as name and ID.
 * @param gameInstance - The instance of the SLSM class that manages the game logic.
 */
function handleSpecialSymbols(symbol, gameInstance) {
    switch (symbol.Name) {
        case types_1.specialIcons.wild:
            gameInstance.settings.wild.SymbolName = symbol.Name;
            gameInstance.settings.wild.SymbolID = symbol.Id;
            gameInstance.settings.wild.useWild = true;
            break;
        case types_1.specialIcons.bonus:
            gameInstance.settings.bonus.SymbolName = symbol.Name;
            gameInstance.settings.bonus.SymbolID = symbol.Id;
            gameInstance.settings.bonus.useWild = true;
            break;
        case types_1.specialIcons.bar3:
            gameInstance.settings.bar3.SymbolName = symbol.Name;
            gameInstance.settings.bar3.SymbolID = symbol.Id;
            gameInstance.settings.bar3.useWild = false;
            break;
        case types_1.specialIcons.bar2:
            gameInstance.settings.bar2.SymbolName = symbol.Name;
            gameInstance.settings.bar2.SymbolID = symbol.Id;
            gameInstance.settings.bar2.useWild = false;
            break;
        case types_1.specialIcons.bar1:
            gameInstance.settings.bar1.SymbolName = symbol.Name;
            gameInstance.settings.bar1.SymbolID = symbol.Id;
            gameInstance.settings.bar1.useWild = false;
            break;
        case types_1.specialIcons.blank:
            gameInstance.settings.blank.SymbolName = symbol.Name;
            gameInstance.settings.blank.SymbolID = symbol.Id;
            gameInstance.settings.blank.useWild = false;
            break;
        default:
            break;
            ``;
    }
}
/**
 * Prepares and sends the result data for the current game state to the client.
 * Includes game data, player data, and details of any free spins or winnings.
 * @param gameInstance - The instance of the SLSM class containing the game state and settings.
 */
function makeResultJson(gameInstance) {
    try {
        const { settings, playerData } = gameInstance;
        const credits = gameInstance.getPlayerData().credits + playerData.currentWining;
        const sendData = {
            GameData: {
                ResultReel: settings.resultSymbolMatrix,
                symbolsToEmit: settings._winData.winningSymbols,
                isFreeSpin: settings.freeSpin.useFreeSpin,
                freeSpinCount: settings.freeSpin.freeSpinCount,
                isJackpot: settings.isJackpot,
                linesToEmit: settings._winData.winningLines,
            },
            PlayerData: {
                Balance: gameInstance.getPlayerData().credits,
                currentWining: playerData.currentWining,
                totalbet: playerData.totalbet,
                haveWon: playerData.haveWon,
            }
        };
        gameInstance.sendMessage('ResultData', sendData);
        console.log(sendData, "send Data");
        console.log(sendData.GameData.symbolsToEmit, "symbolsToEmit");
    }
    catch (error) {
        console.error("Error generating result JSON or sending message:", error);
    }
}
