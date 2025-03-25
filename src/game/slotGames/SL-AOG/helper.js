"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeGameSettings = initializeGameSettings;
exports.generateInitialReel = generateInitialReel;
exports.makePayLines = makePayLines;
exports.sendInitData = sendInitData;
exports.getRandomValue = getRandomValue;
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
        wheelProb: gameData.gameSettings.wheelProb,
        goldSymbolProb: gameData.gameSettings.goldSymbolProb,
        isFreeSpin: false,
        freeSpinCount: 0,
        smallWheelFeature: {
            featureValues: gameData.gameSettings.smallWheelFeature.featureValues,
            featureProbs: gameData.gameSettings.smallWheelFeature.featureProbs
        },
        mediumWheelFeature: {
            featureValues: gameData.gameSettings.mediumWheelFeature.featureValues,
            featureProbs: gameData.gameSettings.mediumWheelFeature.featureProbs
        },
        largeWheelFeature: {
            featureValues: gameData.gameSettings.largeWheelFeature.featureValues,
            featureProbs: gameData.gameSettings.largeWheelFeature.featureProbs
        },
        wheelFeature: {
            isTriggered: false,
            wheelType: "NONE",
            featureType: "NONE",
            featureValue: 0
        },
        levelUpResponse: [],
        goldIndices: [],
        wild: {
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
        (0, gameUtils_1.shuffleArray)(reel);
    });
    return reels;
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
        case types_1.specialIcons.wild:
            gameInstance.settings.wild.SymbolName = symbol.Name;
            gameInstance.settings.wild.SymbolID = symbol.Id;
            gameInstance.settings.wild.useWild = false;
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
        const wildSymbol = settings.wild.SymbolID || "";
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
    const wildSymbol = settings.wild.SymbolID;
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
// Helper function to get N random positions
function getNRandomPositions(matrix, count, goldIndices) {
    try {
        const emptyPositions = getRandomPositions(matrix, goldIndices);
        return emptyPositions.slice(0, count);
    }
    catch (error) {
        console.error("Error in getNRandomPositions:", error);
    }
}
function getRandomPositions(matrix, goldIndices) {
    try {
        // Get all positions
        const positions = [];
        // Collect all positions 
        for (let row = 0; row < matrix.length; row++) {
            for (let col = 0; col < matrix[row].length; col++) {
                //dnt add gold indices
                if (!goldIndices.includes(`${row},${col}`)) {
                    positions.push({ row, col });
                }
            }
        }
        // Shuffle the empty positions array using Fisher-Yates algorithm
        for (let i = positions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
        }
        return positions;
    }
    catch (e) {
        console.log("error in getRandomPositions", e);
        return []; // Return empty array in case of error
    }
}
const SMALLWHEELPOSITIONS = [
    [0, 0], [0, 1], [0, 2],
    [1, 0], [1, 1], [1, 2],
    [2, 0], [2, 1], [2, 2]
];
const MEDIUMWHEELPOSITIONS = [
    [0, 0], [0, 1],
    [1, 0], [1, 1],
    [2, 0], [2, 1]
];
const LARGEWHEELPOSITIONS = [
    [0, 0],
    [1, 0],
    [2, 0]
];
function isInARow(indices) {
    if (indices.length < 3)
        return false;
    const rowGroups = new Map();
    indices.forEach(([row, col]) => {
        if (!rowGroups.has(row)) {
            rowGroups.set(row, []);
        }
        rowGroups.get(row).push(col);
    });
    for (const columns of rowGroups.values()) {
        columns.sort((a, b) => a - b);
        let consecutiveCount = 1;
        let prevCol = columns[0];
        for (let i = 1; i < columns.length; i++) {
            if (columns[i] === prevCol + 1) {
                consecutiveCount++;
                if (consecutiveCount >= 3) {
                    return true;
                }
            }
            else {
                consecutiveCount = 1;
            }
            prevCol = columns[i];
        }
    }
    return false;
}
function populateGoldIndices(gameInstance) {
    const { settings } = gameInstance;
    //extra golds
    const extraGold = getRandomValue(gameInstance, "extraGold");
    let extraGoldPos = [];
    console.log("extra golds", extraGold);
    let copyGoldIndices;
    let startPos;
    switch (settings.wheelFeature.wheelType) {
        case 'SMALL':
            startPos = SMALLWHEELPOSITIONS[getRandomValue(gameInstance, "goldForSmallWheel")];
            settings.goldIndices.push([startPos[0], startPos[1]]);
            settings.goldIndices.push([startPos[0], startPos[1] + 1]);
            settings.goldIndices.push([startPos[0], startPos[1] + 2]);
            copyGoldIndices = settings.goldIndices.map((i) => `${i[0]},${i[1]}`);
            copyGoldIndices.push(`${startPos[0]},${startPos[1] + 3}`);
            do {
                extraGoldPos = getNRandomPositions(settings.resultSymbolMatrix, extraGold, copyGoldIndices).map((i) => [i.row, i.col]);
                // console.log("extra gold pos", extraGoldPos);
            } while (isInARow(extraGoldPos));
            break;
        case 'MEDIUM':
            startPos = MEDIUMWHEELPOSITIONS[getRandomValue(gameInstance, "goldForMediumWheel")];
            settings.goldIndices.push([startPos[0], startPos[1]]);
            settings.goldIndices.push([startPos[0], startPos[1] + 1]);
            settings.goldIndices.push([startPos[0], startPos[1] + 2]);
            settings.goldIndices.push([startPos[0], startPos[1] + 3]);
            copyGoldIndices = settings.goldIndices.map((i) => `${i[0]},${i[1]}`);
            copyGoldIndices.push(`${startPos[0]},${startPos[1] + 4}`);
            do {
                extraGoldPos = getNRandomPositions(settings.resultSymbolMatrix, extraGold, copyGoldIndices).map((i) => [i.row, i.col]);
                // console.log("extra gold pos", extraGoldPos);
            } while (isInARow(extraGoldPos));
            break;
        case 'LARGE':
            startPos = LARGEWHEELPOSITIONS[getRandomValue(gameInstance, "goldForLargeWheel")];
            settings.goldIndices.push([startPos[0], startPos[1]]);
            settings.goldIndices.push([startPos[0], startPos[1] + 1]);
            settings.goldIndices.push([startPos[0], startPos[1] + 2]);
            settings.goldIndices.push([startPos[0], startPos[1] + 3]);
            settings.goldIndices.push([startPos[0], startPos[1] + 4]);
            copyGoldIndices = settings.goldIndices.map((i) => `${i[0]},${i[1]}`);
            do {
                extraGoldPos = getNRandomPositions(settings.resultSymbolMatrix, extraGold, copyGoldIndices).map((i) => [i.row, i.col]);
                // console.log("extra gold pos", extraGoldPos.map((i) => [i.row, i.col]));
            } while (isInARow(extraGoldPos));
            break;
        case "NONE":
            copyGoldIndices = settings.goldIndices.map((i) => `${i[0]},${i[1]}`);
            do {
                extraGoldPos = getNRandomPositions(settings.resultSymbolMatrix, extraGold, copyGoldIndices).map((i) => [i.row, i.col]);
                // console.log("extra gold pos", extraGoldPos.map((i) => [i.row, i.col]));
            } while (isInARow(extraGoldPos));
            break;
        default:
            console.error("error in populateGoldIndices");
            break;
    }
    settings.goldIndices.push(...extraGoldPos);
}
function getRandomValue(gameInstance, type) {
    const { settings } = gameInstance;
    let values;
    let probabilities;
    if (type === 'wheelType') {
        values = [0, 1, 2, 3];
        probabilities = settings.wheelProb;
    }
    else if (type === 'extraGold') {
        let len = settings.wheelFeature.wheelType == "NONE" ? settings.goldSymbolProb.length - 1 : settings.goldSymbolProb.length - 2;
        values = Array.from({ length: len }, (v, i) => i);
        probabilities = settings.goldSymbolProb.slice(0, len);
    }
    else if (type === 'goldForSmallWheel') {
        values = Array.from({ length: SMALLWHEELPOSITIONS.length }, (v, i) => i);
        probabilities = Array.from({ length: SMALLWHEELPOSITIONS.length }, (p) => 1);
    }
    else if (type === 'goldForMediumWheel') {
        values = Array.from({ length: MEDIUMWHEELPOSITIONS.length }, (v, i) => i);
        probabilities = Array.from({ length: MEDIUMWHEELPOSITIONS.length }, (p) => 1);
    }
    else if (type === 'goldForLargeWheel') {
        values = Array.from({ length: LARGEWHEELPOSITIONS.length }, (v, i) => i);
        probabilities = Array.from({ length: LARGEWHEELPOSITIONS.length }, (p) => 1);
    }
    else if (type === 'smallWheelFeature') {
        values = Array.from({ length: settings.smallWheelFeature.featureValues.length }, (v, i) => i);
        probabilities = settings.smallWheelFeature.featureProbs;
    }
    else if (type === 'mediumWheelFeature') {
        values = Array.from({ length: settings.mediumWheelFeature.featureValues.length }, (v, i) => i);
        probabilities = settings.mediumWheelFeature.featureProbs;
    }
    else if (type === 'largeWheelFeature') {
        values = Array.from({ length: settings.largeWheelFeature.featureValues.length }, (v, i) => i);
        probabilities = settings.largeWheelFeature.featureProbs;
    }
    else {
        throw new Error("Invalid type, expected 'coin' or 'freespin'");
    }
    const totalProbability = probabilities.reduce((sum, prob) => sum + prob, 0);
    const randomValue = Math.random() * totalProbability;
    let cumulativeProbability = 0;
    for (let i = 0; i < probabilities.length; i++) {
        cumulativeProbability += probabilities[i];
        if (randomValue < cumulativeProbability) {
            return values[i];
        }
    }
    return values[0];
}
//check if wheel of fortune will be triggered
function checkForWheelOfFortune(gameInstance) {
    return getRandomValue(gameInstance, 'wheelType');
}
function handleSmallWheel(gameInstance) {
    const { settings } = gameInstance;
    console.log("handleSmallWheel");
    const featureIdx = getRandomValue(gameInstance, 'smallWheelFeature');
    if (featureIdx == 0 || featureIdx == 1) {
        settings.wheelFeature.featureType = "LEVELUP";
        settings.levelUpResponse.push(true);
        handleLevelUp(gameInstance);
    }
    else if (featureIdx == 2 || featureIdx == 3) {
        settings.wheelFeature.featureType = "WILD";
        settings.wheelFeature.featureValue = settings.smallWheelFeature.featureValues[featureIdx];
        handleWildInit(gameInstance);
    }
    else if (featureIdx == 4 || featureIdx == 5) {
        settings.wheelFeature.featureType = "FREESPIN";
        settings.wheelFeature.featureValue = settings.smallWheelFeature.featureValues[featureIdx];
        handleFreespin(gameInstance);
    }
    else if (featureIdx == 6 || featureIdx == 7) {
        settings.wheelFeature.featureType = "MULTIPLIER";
        settings.wheelFeature.featureValue = settings.smallWheelFeature.featureValues[featureIdx];
    }
    console.log("small wheel feature", settings.wheelFeature);
}
function handleMediumWheel(gameInstance) {
    const { settings } = gameInstance;
    console.log("handleMediumWheel");
    const featureIdx = getRandomValue(gameInstance, 'mediumWheelFeature');
    if (featureIdx == 0 || featureIdx == 1) {
        settings.wheelFeature.featureType = "LEVELUP";
        settings.levelUpResponse.push(true);
        handleLevelUp(gameInstance);
    }
    else if (featureIdx == 2 || featureIdx == 3) {
        settings.wheelFeature.featureType = "WILD";
        settings.wheelFeature.featureValue = settings.mediumWheelFeature.featureValues[featureIdx];
        handleWildInit(gameInstance);
    }
    else if (featureIdx == 4 || featureIdx == 5) {
        settings.wheelFeature.featureType = "FREESPIN";
        settings.wheelFeature.featureValue = settings.mediumWheelFeature.featureValues[featureIdx];
        handleFreespin(gameInstance);
    }
    else if (featureIdx == 6 || featureIdx == 7) {
        settings.wheelFeature.featureType = "MULTIPLIER";
        settings.wheelFeature.featureValue = settings.mediumWheelFeature.featureValues[featureIdx];
    }
    console.log("medium wheel feature", settings.wheelFeature);
}
function handleLargeWheel(gameInstance) {
    const { settings } = gameInstance;
    console.log("handleLargeWheel");
    const featureIdx = getRandomValue(gameInstance, 'largeWheelFeature');
    if (featureIdx == 0 || featureIdx == 1) {
        // settings.wheelFeature.featureType = "LEVELUP"
        console.error("featureType cant be level up in large wheel ");
    }
    else if (featureIdx == 2 || featureIdx == 3) {
        settings.wheelFeature.featureType = "WILD";
        settings.wheelFeature.featureValue = settings.largeWheelFeature.featureValues[featureIdx];
        handleWildInit(gameInstance);
    }
    else if (featureIdx == 4 || featureIdx == 5) {
        settings.wheelFeature.featureType = "FREESPIN";
        settings.wheelFeature.featureValue = settings.largeWheelFeature.featureValues[featureIdx];
        handleFreespin(gameInstance);
    }
    else if (featureIdx == 6 || featureIdx == 7) {
        settings.wheelFeature.featureType = "MULTIPLIER";
        settings.wheelFeature.featureValue = settings.largeWheelFeature.featureValues[featureIdx];
    }
    console.log("large wheel feature", settings.wheelFeature);
}
function handleLevelUp(gameInstance) {
    const { settings } = gameInstance;
    console.log("handleLevelUp");
    if (settings.wheelFeature.featureType != "LEVELUP") {
        console.error("featureType is not LEVELUP");
        return;
    }
    switch (settings.wheelFeature.wheelType) {
        case 'SMALL':
            settings.wheelFeature.wheelType = 'MEDIUM';
            handleMediumWheel(gameInstance);
            break;
        case 'MEDIUM':
            settings.wheelFeature.wheelType = 'LARGE';
            handleLargeWheel(gameInstance);
            break;
        case 'LARGE':
            console.error("wheelType is already LARGE");
            break;
        default:
            console.error("wheelType is not valid");
            break;
    }
}
function handleWildInit(gameInstance) {
    const { settings } = gameInstance;
    if (settings.wheelFeature.featureType != "WILD") {
        console.error("featureType is not WILD");
        return;
    }
    settings.freeSpinCount = 1;
}
function handleWildSub(gameInstance) {
    const { settings } = gameInstance;
    console.log("handleWildSub");
    if (settings.wheelFeature.featureType != "WILD") {
        console.error("featureType is not WILD");
        return;
    }
    const wildPos = getNRandomPositions(settings.resultSymbolMatrix, settings.wheelFeature.featureValue, []);
    for (let pos of wildPos) {
        settings.resultSymbolMatrix[pos.row][pos.col] = settings.wild.SymbolID;
    }
}
function handleFreespin(gameInstance) {
    const { settings } = gameInstance;
    console.log("handleFreespin");
    if (settings.wheelFeature.featureType != "FREESPIN") {
        console.error("featureType is not FREESPIN");
        return;
    }
    settings.isFreeSpin = true;
    settings.freeSpinCount += settings.wheelFeature.featureValue;
}
function handleMultiplier(gameInstance) {
    const { settings, playerData } = gameInstance;
    console.log("handleMultiplier");
    if (settings.wheelFeature.featureType != "MULTIPLIER") {
        console.error("featureType is not MULTIPLIER");
        return;
    }
    playerData.currentWining = playerData.currentWining + (settings.wheelFeature.featureValue * (settings.BetPerLines));
}
//CHECK WINS ON PAYLINES WITH OR WITHOUT WILD
function checkForWin(gameInstance) {
    try {
        const { settings } = gameInstance;
        const winningLines = [];
        let totalPayout = 0;
        // if (settings.freeSpinCount > 0) {
        //   settings.freeSpinCount--
        // }
        //NOTE: wild sub
        if (settings.wheelFeature.featureType == "WILD") {
            handleWildSub(gameInstance);
        }
        settings.lineData.forEach((line, index) => {
            const firstSymbolPositionLTR = line[0];
            // const firstSymbolPositionRTL = line[line.length - 1];
            // Get first symbols for both directions
            let firstSymbolLTR = settings.resultSymbolMatrix[firstSymbolPositionLTR][0];
            // let firstSymbolRTL = settings.resultSymbolMatrix[firstSymbolPositionRTL][line.length - 1];
            // Handle wild symbols for both directions
            if (firstSymbolLTR === settings.wild.SymbolID) {
                firstSymbolLTR = findFirstNonWildSymbol(line, gameInstance);
            }
            // if (firstSymbolRTL === settings.wild.SymbolID) {
            //   firstSymbolRTL = findFirstNonWildSymbol(line, gameInstance, 'RTL');
            // }
            // Left-to-right check
            const LTRResult = checkLineSymbols(firstSymbolLTR, line, gameInstance, 'LTR');
            if (LTRResult.isWinningLine && LTRResult.matchCount >= 3) {
                const symbolMultiplierLTR = accessData(firstSymbolLTR, LTRResult.matchCount, gameInstance);
                if (symbolMultiplierLTR > 0) {
                    const payout = symbolMultiplierLTR * gameInstance.settings.BetPerLines;
                    totalPayout += payout;
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
                        settings._winData.winningSymbols.push(validIndices);
                        settings._winData.totalWinningAmount = (0, utils_1.precisionRound)((totalPayout * settings.BetPerLines), 4);
                    }
                    return;
                }
            }
        });
        //NOTE: wheel of olympus
        //
        let wheelType = checkForWheelOfFortune(gameInstance);
        console.log("wheeltype");
        console.log(wheelType);
        switch (wheelType) {
            case 0:
                settings.wheelFeature.isTriggered = false;
                settings.wheelFeature.wheelType = 'NONE';
                break;
            case 1:
                settings.wheelFeature.isTriggered = true;
                settings.wheelFeature.wheelType = 'SMALL';
                handleSmallWheel(gameInstance);
                break;
            case 2:
                settings.wheelFeature.isTriggered = true;
                settings.wheelFeature.wheelType = 'MEDIUM';
                handleMediumWheel(gameInstance);
                break;
            case 3:
                settings.wheelFeature.isTriggered = true;
                settings.wheelFeature.wheelType = 'LARGE';
                handleLargeWheel(gameInstance);
                break;
            default:
                console.error('Invalid wheel type from checkForWheelOfFortune');
                // settings.wheelFeature.isTriggered = false;
                // settings.wheelFeature.wheelType = 'NONE';
                break;
        }
        populateGoldIndices(gameInstance);
        console.log("gldIndices");
        console.log(settings.goldIndices);
        gameInstance.playerData.currentWining = (0, utils_1.precisionRound)(totalPayout, 5);
        if (settings.wheelFeature.featureType == "MULTIPLIER") {
            handleMultiplier(gameInstance);
        }
        gameInstance.playerData.haveWon = (0, utils_1.precisionRound)(gameInstance.playerData.haveWon +
            gameInstance.playerData.currentWining, 5);
        gameInstance.updatePlayerBalance(gameInstance.playerData.currentWining);
        makeResultJson(gameInstance);
        settings.isFreeSpin = false;
        //reset feature settings 
        if (settings.wheelFeature.featureType != "WILD" || (settings.wheelFeature.featureType == "WILD" &&
            !settings.wheelFeature.isTriggered)) {
            settings.wheelFeature.featureType = "NONE";
            settings.wheelFeature.featureValue = 0;
        }
        settings.wheelFeature.isTriggered = false;
        settings.wheelFeature.wheelType = "NONE";
        settings.goldIndices = [];
        settings.levelUpResponse = [];
        settings._winData.winningLines = [];
        settings._winData.winningSymbols = [];
        return winningLines;
    }
    catch (error) {
        console.error("Error in checkForWin:", error);
        return [];
    }
}
//MAKERESULT JSON FOR FRONTEND 
function makeResultJson(gameInstance) {
    try {
        const { settings, playerData } = gameInstance;
        const credits = gameInstance.getPlayerData().credits;
        const Balance = credits.toFixed(3);
        const sendData = {
            GameData: {
                resultSymbols: settings.resultSymbolMatrix,
                linesToEmit: settings._winData.winningLines,
                symbolsToEmit: settings._winData.winningSymbols,
                isFreeSpin: settings.isFreeSpin,
                freeSpinCount: settings.freeSpinCount,
                goldIndices: settings.goldIndices,
                levelUpResponse: settings.levelUpResponse,
                wheel: {
                    isTriggered: settings.wheelFeature.isTriggered,
                    type: settings.wheelFeature.wheelType,
                    featureType: settings.wheelFeature.featureType,
                    featureValue: settings.wheelFeature.featureValue
                }
            },
            PlayerData: {
                Balance: Balance,
                totalbet: playerData.totalbet,
                haveWon: playerData.haveWon,
                currentWining: playerData.currentWining
            }
        };
        console.log(JSON.stringify(sendData, null, 2));
        gameInstance.sendMessage('ResultData', sendData);
    }
    catch (error) {
        console.error("Error generating result JSON or sending message:", error);
    }
}
