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
        currentLines: 0,
        BetPerLines: 0,
        reels: [],
        anyMatchCount: gameData.gameSettings.anyPayout,
        wildCountsToFreeGames: gameData.gameSettings.wildCountsToFreeGames,
        bonusCountsToFreeGames: gameData.gameSettings.bonusCountsToFreeGames,
        scatterCountsToMultiplier: gameData.gameSettings.scatterCountsToMultiplier,
        isMinor: false,
        isMajor: false,
        isGrand: false,
        freeSpin: {
            freeSpinAwarded: gameData.gameSettings.freeSpinCount,
            freeSpinCount: 0,
            useFreeSpin: false,
            freeSpinPayout: 0,
            freeSpinsAdded: false,
        },
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
        scatter: {
            SymbolName: "",
            SymbolID: -1,
            useWild: false,
        },
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
        for (let i = 0; i < 5; i++) {
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
        if (!element.useWildSub) {
            handleSpecialSymbols(element, gameInstance);
        }
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
            linesApiData: gameInstance.settings.currentGamedata.linesApiData,
            Bets: gameInstance.settings.currentGamedata.bets,
            baseBet: gameInstance.settings.baseBetAmount,
            betMultiplier: gameInstance.settings.currentGamedata.betMultiplier,
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
 * @param gameInstance - The instance of the SLFM class managing the game logic.
 */
function checkForWin(gameInstance) {
    try {
        const { settings } = gameInstance;
        const winningLines = [];
        let totalPayout = 0;
        if (settings.freeSpin.useFreeSpin && settings.freeSpin.freeSpinCount > 0) {
            settings.freeSpin.freeSpinCount -= 1;
            if (settings.freeSpin.freeSpinCount <= 0) {
                settings.freeSpin.useFreeSpin = false;
            }
        }
        const { bonusCounts, scatterCount } = checkSymbolOccurrence(gameInstance);
        if (bonusCounts && (!settings.freeSpin.useFreeSpin)) {
            handleBonusCount(gameInstance, bonusCounts);
        }
        if (scatterCount && (!settings.freeSpin.useFreeSpin)) {
            handleScatterCount(gameInstance, scatterCount);
        }
        settings.lineData.forEach((line, index) => {
            const firstSymbolPosition = line[0];
            let firstSymbol = settings.resultSymbolMatrix[firstSymbolPosition][0];
            if (settings.wild.useWild && firstSymbol === settings.wild.SymbolID) {
                firstSymbol = findFirstNonWildSymbol(line, gameInstance);
            }
            const { isWinningLine, matchCount, matchedIndices: winMatchedIndices, wildCount } = checkLineSymbols(firstSymbol, line, gameInstance);
            if (wildCount >= 3 && (!settings.freeSpin.useFreeSpin)) {
                settings.freeSpin.freeSpinCount += settings.wildCountsToFreeGames[wildCount] || 0;
                settings.freeSpin.freeSpinsAdded = true;
                settings.freeSpin.useFreeSpin = true;
            }
            if ((isWinningLine && matchCount >= 3)) {
                const symbolMultiplier = accessData(firstSymbol, matchCount, gameInstance);
                if (symbolMultiplier > 0) {
                    totalPayout += symbolMultiplier * gameInstance.settings.BetPerLines;
                    settings._winData.winningLines.push(index);
                    winningLines.push({
                        line,
                        symbol: firstSymbol,
                        multiplier: symbolMultiplier,
                        matchCount,
                    });
                    console.log(`Line ${index + 1}:`, line);
                    console.log(`Payout for Line ${index + 1}:`, 'payout', symbolMultiplier);
                    const formattedIndices = winMatchedIndices.map(({ col, row }) => `${col},${row}`);
                    const validIndices = formattedIndices.filter(index => index.length > 2);
                    if (validIndices.length > 0) {
                        gameInstance.settings._winData.winningSymbols.push(validIndices);
                    }
                }
            }
        });
        gameInstance.playerData.currentWining += totalPayout;
        gameInstance.playerData.haveWon = parseFloat((gameInstance.playerData.haveWon + parseFloat(gameInstance.playerData.currentWining.toFixed(4))).toFixed(4));
        gameInstance.updatePlayerBalance(gameInstance.playerData.currentWining);
        makeResultJson(gameInstance);
        settings._winData.totalWinningAmount = 0;
        gameInstance.playerData.currentWining = 0;
        settings.freeSpin.freeSpinPayout = 0;
        settings.freeSpin.freeSpinsAdded = false;
        settings._winData.winningSymbols = [];
        settings.isMinor = false;
        settings.isMajor = false;
        settings.isGrand = false;
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
        let matchCount = 1;
        let wildCount = 1; // Initialize wild count
        let currentSymbol = firstSymbol;
        const matchedIndices = [{ col: 0, row: line[0] }];
        // Check if the first symbol is a wild
        if (currentSymbol === wildSymbol) {
            wildCount++;
        }
        // Loop through the line
        for (let i = 1; i < line.length; i++) {
            const rowIndex = line[i];
            const symbol = settings.resultSymbolMatrix[rowIndex][i];
            if (symbol === undefined) {
                console.error(`Symbol at position [${rowIndex}, ${i}] is undefined.`);
                return { isWinningLine: false, matchCount: 0, matchedIndices: [], wildCount };
            }
            // Check for matches (consider wild symbols and canmatch)
            if (symbol === currentSymbol || symbol === wildSymbol) {
                matchCount++;
                matchedIndices.push({ col: i, row: rowIndex });
                // Increment wild count if the symbol is wild
                if (symbol == wildSymbol) {
                    wildCount++;
                }
            }
            else if (currentSymbol === wildSymbol) {
                currentSymbol = symbol;
                matchCount++;
                matchedIndices.push({ col: i, row: rowIndex });
                // Increment wild count if the symbol is wild
                if (symbol == wildSymbol) {
                    wildCount++;
                }
            }
            else {
                break;
            }
        }
        return { isWinningLine: matchCount >= 3, matchCount, matchedIndices, wildCount };
    }
    catch (error) {
        console.error("Error in checkLineSymbols:", error);
        return { isWinningLine: false, matchCount: 0, matchedIndices: [], wildCount: 0 };
    }
}
/**
 * Retrieves the multiplier associated with a symbol and match count.
 * @param symbol - The symbol for which the multiplier is retrieved.
 * @param matchCount - The number of matching symbols.
 * @param gameInstance - The game instance containing symbol data.
 * @returns The multiplier value or 0 if no data is found.
 */
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
        // console.error("Error in accessData:");
        return 0;
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
        case types_1.specialIcons.scatter:
            gameInstance.settings.scatter.SymbolName = symbol.Name;
            gameInstance.settings.scatter.SymbolID = symbol.Id;
            gameInstance.settings.scatter.useWild = false;
            break;
        default:
            break;
            ``;
    }
}
function checkSymbolOccurrence(gameInstance) {
    const { settings } = gameInstance;
    const bonusSymbol = settings.bonus.SymbolID || "";
    let totalBonusCount = 0;
    let totalScatterCount = 0;
    const bonusColumns = [];
    settings.resultSymbolMatrix.map((row) => {
        row.map((symbol) => {
            if (symbol == settings.scatter.SymbolID) {
                totalScatterCount++;
            }
        });
    });
    // Iterate over the columns to count bonus symbols
    for (let col = 0; col < settings.resultSymbolMatrix[0].length; col++) {
        for (let row = 0; row < settings.resultSymbolMatrix.length; row++) {
            const symbol = settings.resultSymbolMatrix[row][col];
            if (symbol == bonusSymbol) {
                totalBonusCount++;
                if (!bonusColumns.includes(col)) {
                    bonusColumns.push(col);
                }
                break;
            }
        }
    }
    // console.log(totalScatterCount);
    const bonusCounts = totalBonusCount >= 3 ? {
        count: totalBonusCount,
        columns: bonusColumns,
    } : null;
    const scatterCount = totalScatterCount >= 3 ? {
        count: totalScatterCount,
    } : null;
    return { bonusCounts: bonusCounts, scatterCount: scatterCount };
}
function handleBonusCount(gameInstance, bonusCount) {
    console.log(bonusCount);
    const { settings } = gameInstance;
    if (bonusCount.count >= 3) {
        console.log(bonusCount.count);
        settings.freeSpin.freeSpinCount += settings.bonusCountsToFreeGames[bonusCount.count] || 0;
        settings.freeSpin.useFreeSpin = true;
    }
}
function handleScatterCount(gameInstance, scatterCount) {
    const { settings } = gameInstance;
    if (scatterCount.count >= 3) {
        if (scatterCount.count > 5) {
            scatterCount.count = 5;
        }
        console.log(scatterCount.count);
        const multiplier = settings.scatterCountsToMultiplier[scatterCount.count].multiplier || 0;
        console.log(multiplier);
        const potType = settings.scatterCountsToMultiplier[scatterCount.count].name;
        switch (true) {
            case potType === "Minor":
                settings.isMinor = true;
                break;
            case potType === "Major":
                settings.isMajor = true;
                break;
            case potType === "Grand":
                settings.isGrand = true;
                break;
            default:
                break;
        }
        const payout = settings.currentBet * multiplier;
        gameInstance.playerData.currentWining += payout;
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
                isMinor: settings.isMinor,
                isMajor: settings.isMajor,
                isGrand: settings.isGrand
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
    }
    catch (error) {
        console.error("Error generating result JSON or sending message:", error);
    }
}
