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
        jackpot: {
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
        for (let i = 0; i < 4; i++) {
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
 * @param gameInstance - The instance of the SLSM class managing the game logic.
 */
function checkForWin(gameInstance) {
    try {
        const { settings } = gameInstance;
        const winningLines = [];
        if (settings.freeSpin.useFreeSpin && settings.freeSpin.freeSpinCount > 0) {
            settings.freeSpin.freeSpinCount -= 1;
            if (settings.freeSpin.freeSpinCount <= 0) {
                settings.freeSpin.useFreeSpin = false;
            }
        }
        const { isWinning, totalPayout } = checkSymbolOcuurence(gameInstance);
        console.log(totalPayout, "total");
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
    }
    catch (error) {
        console.error("Error in checkForWin", error);
        return [];
    }
}
function checkSymbolOcuurence(gameInstance) {
    const { settings } = gameInstance;
    const matchedIndices = [];
    let totalPayout = 0;
    const isWinning = settings.resultSymbolMatrix.map((row, rowIndex) => {
        const hasWild = row.includes(settings.wild.SymbolID);
        if (hasWild) {
            const nonWildSymbols = row.filter((symbol) => symbol !== settings.wild.SymbolID);
            const allNonWildSame = nonWildSymbols.every((symbol) => symbol === nonWildSymbols[0]);
            if (allNonWildSame && nonWildSymbols.length > 0) {
                row.fill(nonWildSymbols[0]);
            }
            else {
                row.fill(settings.wild.SymbolID);
            }
        }
        const allSame = row.every((symbol) => symbol === row[0]);
        const isSpecialCombination = row.every((symbol) => [settings.bar3.SymbolID, settings.bar2.SymbolID, settings.bar1.SymbolID].includes(symbol));
        console.log(`Row ${rowIndex} all same:`, allSame);
        if (allSame || isSpecialCombination) {
            const matchedSymbol = row[0];
            if ((matchedSymbol === settings.bonus.SymbolID) && !settings.freeSpin.useFreeSpin) {
                settings.freeSpin.useFreeSpin = true;
                settings.freeSpin.freeSpinCount = settings.freeSpin.freeSpinAwarded;
            }
            else if ((matchedSymbol === settings.bonus.SymbolID) && settings.freeSpin.useFreeSpin) {
                settings.freeSpin.freeSpinCount = settings.freeSpin.freeSpinAwarded;
                settings.freeSpin.freeSpinsAdded = true;
            }
            if (matchedSymbol === settings.jackpot.SymbolID) {
                settings.isJackpot = true;
            }
            if (allSame) {
                const symbol = settings.currentGamedata.Symbols.filter((symbol) => symbol.Id === matchedSymbol);
                console.log(symbol[0].payout, "S");
                console.log(settings.currentBet);
                const symbolPayout = parseFloat(symbol[0].payout);
                const payOut = symbolPayout * settings.currentBet;
                console.log(payOut);
                totalPayout += payOut;
            }
            else if (isSpecialCombination) {
                const payout = settings.anyMatchCount * settings.currentBet;
                totalPayout += payout;
            }
            matchedIndices.push({ col: 0, row: rowIndex }, { col: 1, row: rowIndex }, { col: 2, row: rowIndex });
        }
        return row;
    });
    console.log(totalPayout);
    return { isWinning, totalPayout };
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
        case types_1.specialIcons.jackpot:
            gameInstance.settings.jackpot.SymbolName = symbol.Name;
            gameInstance.settings.jackpot.SymbolID = symbol.Id;
            gameInstance.settings.jackpot.useWild = false;
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
        default:
            break;
            ``;
    }
}
// /**
//  * Retrieves a random value based on the specified type and its associated probabilities.
//  * The function uses weighted probabilities to select a value from a predefined set.
//  * 
//  * @param gameInstance - The instance of the SLSM class that manages the game logic.
//  * @param type - The type of random value to retrieve, such as 'sticky', 'prize', 'mystery', or 'moonMystery'.
//  * @returns A randomly selected value based on the weighted probabilities for the specified type.
//  * @throws An error if an invalid type is provided.
//  */
// export function getRandomValue(gameInstance: SLBS, type: 'sticky' | 'prize' | 'mystery' | 'moonMystery'): number {
//     const { settings } = gameInstance;
//     let values: number[];
//     let probabilities: number[];
//     // determine the values and probabilities based on the type
//     if (type === 'sticky') {
//         values = settings?.stickySymbolCount;
//         probabilities = settings?.stickySymbolCountProb;
//     } else if (type === 'prize') {
//         values = settings?.prizeValue;
//         probabilities = settings?.prizeValueProb;
//     } else if (type === 'mystery') {
//         values = settings?.mysteryValues;
//         probabilities = settings?.mysteryValueProb;
//     } else if (type === 'moonMystery') {
//         values = settings?.moonMysteryValues;
//         probabilities = settings?.moonMysteryValueProb;
//     }
//     else {
//         throw new Error("Invalid type, expected 'coin' or 'freespin'");
//     }
//     // Calculate the total probability and select a random value
//     const totalProbability = probabilities.reduce((sum, prob) => sum + prob, 0);
//     const randomValue = Math.random() * totalProbability;
//     let cumulativeProbability = 0;
//     for (let i = 0; i < probabilities.length; i++) {
//         cumulativeProbability += probabilities[i];
//         if (randomValue < cumulativeProbability) {
//             return values[i];
//         }
//     }
//     //default to first value
//     return values[0];
// }
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
