"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeGameSettings = initializeGameSettings;
exports.generateInitialReel = generateInitialReel;
exports.makePayLines = makePayLines;
exports.sendInitData = sendInitData;
exports.checkForWin = checkForWin;
exports.getRandomValue = getRandomValue;
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
        anyMatchCount: gameData.gameSettings.anyPayout,
        smallWheelFeature: gameData.gameSettings.smallWheelFeature,
        mediumWheelFeature: gameData.gameSettings.smallWheelFeature,
        largeWheelFeature: gameData.gameSettings.smallWheelFeature,
        bonusTriggerCount: gameData.gameSettings.bonusTriggerCount,
        freeSpin: {
            freeSpinAwarded: gameData.gameSettings.freeSpinCount,
            freeSpinCount: 0,
            useFreeSpin: false,
            freeSpinPayout: 0,
            freeSpinsAdded: false,
        },
        isBonusTriggered: false,
        issmallBonusTriggered: false,
        ismediumBonusTriggered: false,
        islargeBonusTriggered: false,
        indexToStop: -1,
        bonusCount: gameData.gameSettings.bonusCount,
        bonusTriggerCountDuringFreeSpin: gameData.gameSettings.bonusTriggerCountDuringFreeSpin,
        bonusCountDuringFreeSpins: gameData.gameSettings.bonusCountDuringFreeSpins,
        freeSpinDuringBonus: gameData.gameSettings.freeSpinDuringBonus,
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
        goldenBonus: {
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
            smallWheelFeature: gameInstance.settings.smallWheelFeature.featureValues,
            mediumWheelFeature: gameInstance.settings.smallWheelFeature.featureValues,
            largeWheelFeature: gameInstance.settings.smallWheelFeature.featureValues,
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
        if (!settings.freeSpin.useFreeSpin) {
            checkForBonus(gameInstance);
        }
        else {
            reduceMatrixAndGiveFreeSpin(gameInstance);
            if (settings.freeSpin.freeSpinCount > 0 && settings.freeSpin.useFreeSpin) {
                settings.freeSpin.freeSpinCount -= 1;
                if (settings.freeSpin.freeSpinCount <= 0) {
                    settings.freeSpin.useFreeSpin = false;
                }
            }
        }
        settings.lineData.forEach((line, index) => {
            const firstSymbolPosition = line[0];
            let firstSymbol = settings.resultSymbolMatrix[firstSymbolPosition][0];
            if (settings.wild.useWild && firstSymbol === settings.wild.SymbolID) {
                firstSymbol = findFirstNonWildSymbol(line, gameInstance);
            }
            const { isWinningLine, matchCount, matchedIndices: winMatchedIndices } = checkLineSymbols(firstSymbol, line, gameInstance);
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
        settings.issmallBonusTriggered = false;
        settings.ismediumBonusTriggered = false;
        settings.islargeBonusTriggered = false;
        settings.freeSpin.freeSpinPayout = 0;
        settings.freeSpin.freeSpinsAdded = false;
        settings._winData.winningSymbols = [];
        settings._winData.winningLines = [];
        settings.indexToStop = -1;
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
        let currentSymbol = firstSymbol;
        const matchedIndices = [{ col: 0, row: line[0] }];
        // Loop through the line
        for (let i = 1; i < line.length; i++) {
            const rowIndex = line[i];
            const symbol = settings.resultSymbolMatrix[rowIndex][i];
            if (symbol === undefined) {
                console.error(`Symbol at position [${rowIndex}, ${i}] is undefined.`);
                return { isWinningLine: false, matchCount: 0, matchedIndices: [] };
            }
            // Check for matches (consider wild symbols and canmatch)
            if (symbol === currentSymbol ||
                symbol === wildSymbol) {
                matchCount++;
                matchedIndices.push({ col: i, row: rowIndex });
            }
            else if (currentSymbol === wildSymbol) {
                currentSymbol = symbol;
                matchCount++;
                matchedIndices.push({ col: i, row: rowIndex });
            }
            else {
                break;
            }
        }
        return { isWinningLine: matchCount >= 3, matchCount, matchedIndices };
    }
    catch (error) {
        console.error("Error in checkLineSymbols:", error);
        return { isWinningLine: false, matchCount: 0, matchedIndices: [] };
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
            gameInstance.settings.wild.useWild = symbol.useWildSub;
            break;
        case types_1.specialIcons.bonus:
            gameInstance.settings.bonus.SymbolName = symbol.Name;
            gameInstance.settings.bonus.SymbolID = symbol.Id;
            gameInstance.settings.bonus.useWild = symbol.useWildSub;
            break;
        case types_1.specialIcons.goldenBonus:
            gameInstance.settings.goldenBonus.SymbolName = symbol.Name;
            gameInstance.settings.goldenBonus.SymbolID = symbol.Id;
            gameInstance.settings.goldenBonus.useWild = symbol.useWildSub;
            break;
        default:
            break;
            ``;
    }
}
function checkForBonus(gameInstance) {
    const { settings } = gameInstance;
    let bonusCount = 0;
    settings.resultSymbolMatrix.map((row) => {
        row.map((symbol) => {
            if (symbol === settings.bonus.SymbolID) {
                console.log(settings.bonus.SymbolID, "ID");
                bonusCount++;
            }
        });
    });
    console.log(bonusCount, "bonuscount");
    console.log(settings.bonusTriggerCount, "trigger");
    if (bonusCount >= settings.bonusTriggerCount) {
        if (bonusCount === settings.bonusCount[0]) {
            settings.issmallBonusTriggered = true;
            spinWheel(gameInstance);
        }
        else if (bonusCount === settings.bonusCount[1]) {
            settings.ismediumBonusTriggered = true;
            spinWheel(gameInstance);
        }
        else if (bonusCount >= settings.bonusCount[2]) {
            settings.islargeBonusTriggered = true;
            spinWheel(gameInstance);
        }
        else {
            console.log("No matching bonus threshold");
        }
    }
    else {
        console.log("No Free Spin");
    }
}
function spinWheel(gameInstance) {
    const { settings } = gameInstance;
    let value = 0;
    let featureValues = [];
    let index;
    let freeSpinIndices = [];
    switch (true) {
        case settings.issmallBonusTriggered:
            value = getRandomValue(gameInstance, 'smallFreespin');
            console.log(value);
            featureValues = gameInstance.settings.smallWheelFeature.featureValues;
            index = getIndexByValue(value, featureValues);
            freeSpinIndices = featureValues.slice(0, 4);
            if (freeSpinIndices.includes(value)) {
                settings.freeSpin.useFreeSpin = true;
                settings.freeSpin.freeSpinCount += value;
            }
            break;
        case settings.ismediumBonusTriggered:
            value = getRandomValue(gameInstance, 'mediumFreespin');
            featureValues = gameInstance.settings.mediumWheelFeature.featureValues;
            index = getIndexByValue(value, featureValues);
            freeSpinIndices = featureValues.slice(0, 4);
            if (freeSpinIndices.includes(value)) {
                settings.freeSpin.useFreeSpin = true;
                settings.freeSpin.freeSpinCount += value;
            }
            break;
        case settings.islargeBonusTriggered:
            value = getRandomValue(gameInstance, 'largeFreespin');
            featureValues = gameInstance.settings.largeWheelFeature.featureValues;
            index = getIndexByValue(value, featureValues);
            freeSpinIndices = featureValues.slice(0, 4);
            if (freeSpinIndices.includes(value)) {
                settings.freeSpin.useFreeSpin = true;
                settings.freeSpin.freeSpinCount += value;
            }
            break;
        default:
            break;
    }
    const payout = settings.BetPerLines * value;
    gameInstance.playerData.currentWining += payout;
    settings.indexToStop = index;
}
function getIndexByValue(value, featureValues) {
    return featureValues.indexOf(value);
}
function getRandomValue(gameInstance, type) {
    const { settings } = gameInstance;
    let values;
    let probabilities;
    if (type === 'smallFreespin') {
        values = settings === null || settings === void 0 ? void 0 : settings.smallWheelFeature.featureValues;
        probabilities = settings === null || settings === void 0 ? void 0 : settings.smallWheelFeature.featureProbs;
    }
    else if (type === 'mediumFreespin') {
        values = settings === null || settings === void 0 ? void 0 : settings.smallWheelFeature.featureValues;
        probabilities = settings === null || settings === void 0 ? void 0 : settings.smallWheelFeature.featureProbs;
    }
    else if (type === 'largeFreespin') {
        values = settings === null || settings === void 0 ? void 0 : settings.smallWheelFeature.featureValues;
        probabilities = settings === null || settings === void 0 ? void 0 : settings.smallWheelFeature.featureProbs;
    }
    else {
        throw new Error("Invalid type, expected 'coin' or 'freespin'");
    }
    // Calculate the total probability and select a random value
    const totalProbability = probabilities.reduce((sum, prob) => sum + prob, 0);
    const randomValue = Math.random() * totalProbability;
    let cumulativeProbability = 0;
    for (let i = 0; i < probabilities.length; i++) {
        cumulativeProbability += probabilities[i];
        if (randomValue < cumulativeProbability) {
            return values[i];
        }
    }
    //default to first value
    return values[0];
}
function reduceMatrixAndGiveFreeSpin(gameInstance) {
    const { settings } = gameInstance;
    let bonusCount = 0;
    settings.resultSymbolMatrix.map((row, rowIndex) => {
        row.map((symbol, colIndex) => {
            if (symbol === settings.bonus.SymbolID) {
                settings.resultSymbolMatrix[rowIndex][colIndex] = settings.goldenBonus.SymbolID;
                bonusCount++;
            }
        });
    });
    console.log(settings.resultSymbolMatrix, "red");
    console.log(bonusCount);
    if (bonusCount >= settings.bonusTriggerCountDuringFreeSpin) {
        console.log(bonusCount);
        switch (true) {
            case bonusCount === settings.bonusCountDuringFreeSpins[0]:
                settings.freeSpin.freeSpinsAdded = true;
                settings.freeSpin.freeSpinCount += settings.freeSpinDuringBonus[0];
                break;
            case bonusCount === settings.bonusCountDuringFreeSpins[1]:
                settings.freeSpin.freeSpinsAdded = true;
                settings.freeSpin.freeSpinCount += settings.freeSpinDuringBonus[1];
                break;
            case bonusCount === settings.bonusCountDuringFreeSpins[2]:
                settings.freeSpin.freeSpinsAdded = true;
                settings.freeSpin.freeSpinCount += settings.freeSpinDuringBonus[2];
                break;
            case bonusCount >= settings.bonusCountDuringFreeSpins[3]:
                settings.freeSpin.freeSpinsAdded = true;
                settings.freeSpin.freeSpinCount += settings.freeSpinDuringBonus[3];
                break;
            default:
                break;
        }
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
                linesToEmit: settings._winData.winningLines,
                isSmallWheelTriggered: settings.issmallBonusTriggered,
                isMediumWheelTriggered: settings.ismediumBonusTriggered,
                isLargeWheelTriggered: settings.islargeBonusTriggered,
                indexToStop: settings.indexToStop,
                freeSpinAdded: settings.freeSpin.freeSpinsAdded
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
