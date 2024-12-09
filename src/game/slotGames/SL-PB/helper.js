"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeGameSettings = initializeGameSettings;
exports.generateInitialReel = generateInitialReel;
exports.generateInitialBonusReel = generateInitialBonusReel;
exports.makePayLines = makePayLines;
exports.sendInitData = sendInitData;
exports.checkForWin = checkForWin;
exports.getRandomValue = getRandomValue;
exports.checkProbability = checkProbability;
exports.makeResultJson = makeResultJson;
const WinData_1 = require("../BaseSlotGame/WinData");
const gameUtils_1 = require("../../Utils/gameUtils");
const types_1 = require("./types");
const bonus_1 = require("./bonus");
/**
 * Initializes the game settings using the provided game data and game instance.
 * @param gameData - The data used to configure the game settings.
 * @param gameInstance - The instance of the SLPB class that manages the game logic.
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
        BonusSymbols: gameInstance.initBonusSymbols,
        resultSymbolMatrix: [],
        bonusResultMatrix: [],
        tempResultSymbolMatrix: [],
        currentGamedata: gameData.gameSettings,
        lineData: [],
        _winData: new WinData_1.WinData(gameInstance),
        currentBet: 0,
        baseBetAmount: gameData.gameSettings.baseBet,
        currentLines: 0,
        BetPerLines: 0,
        reels: [],
        bonusReels: [],
        pollyAdjacentColumn: gameData.gameSettings.pollyAdjacentColumn,
        pollyAdjacentColumnProb: gameData.gameSettings.pollyAdjacentColumnProb,
        coinsvalue: gameData.gameSettings.coinsvalue,
        coinsvalueProb: gameData.gameSettings.coinsvalueProb,
        coinsvalueDuringFreeSpins: gameData.gameSettings.coinsvalueDuringFreeSpins,
        coinsvalueDuringFreeSpinsProb: gameData.gameSettings.coinsvalueDuringFreeSpinsProb,
        pollyAdjacentSymbol: gameData.gameSettings.pollyAdjacentSymbol,
        pollyAdjacentSymbolProb: gameData.gameSettings.pollyAdjacentSymbolProb,
        colossalMergeProbability: gameData.gameSettings.colossalMergeProbability,
        tommyColossalSymbol: gameData.gameSettings.tommyColossalSymbol,
        tommyColossalSymbolProb: gameData.gameSettings.tommyColossalSymbolProb,
        bonusSymbolValue: [],
        frozenIndices: [],
        miniMultiplier: gameData.gameSettings.miniMultiplier,
        megaMultiplier: gameData.gameSettings.megaMultiplier,
        majorMultiplier: gameData.gameSettings.majorMultiplier,
        grandMultiplier: gameData.gameSettings.grandMultiplier,
        isGrandPrize: false,
        isArthurBonus: false,
        isTomBonus: false,
        isPollyBonus: false,
        thunderBonus: {
            thunderSpinCount: 0,
            thunderSpinAwardedCount: gameData.gameSettings.bonus.thunderIncrementCount,
            isThunderBonus: false,
            thunderSpinsAdded: false,
            thunderSpinPayout: 0
        },
        freeSpin: {
            freeSpinsAdded: false,
            freeSpinAwardedCount: gameData.gameSettings.bonus.incrementCount,
            freeSpinCount: 0,
            useFreeSpin: false,
            freeSpinPayout: 0
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
        coins: {
            SymbolName: "",
            SymbolID: -1,
            useWild: false,
        },
        arthurBonus: {
            SymbolName: "",
            SymbolID: -1,
            useWild: false,
        },
        tomBonus: {
            SymbolName: "",
            SymbolID: -1,
            useWild: false,
        },
        pollyBonus: {
            SymbolName: "",
            SymbolID: -1,
            useWild: false,
        },
        mini: {
            SymbolName: "",
            SymbolID: -1,
            useWild: false,
        },
        major: {
            SymbolName: "",
            SymbolID: -1,
            useWild: false,
        },
        mega: {
            SymbolName: "",
            SymbolID: -1,
            useWild: false,
        },
        thomas: {
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
 * Generates the initial configuration for bonus reels based on game settings.
 * @param gameSettings - The settings containing the bonus symbols and their reel configurations.
 * @returns A 2D array representing the shuffled bonus reels.
 */
function generateInitialBonusReel(gameSettings) {
    const reels = [[], [], [], [], [], [], []];
    gameSettings.BonusSymbols.forEach((symbol) => {
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
    gameSettings.bonusReels = reels;
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
 * Retrieves the multipliers associated with bonus symbols from the game instance.
 * @param gameInstance - The instance of the SLPB class that manages the game logic.
 * @returns An array of objects, each containing the name and value of a bonus symbol multiplier.
 */
function getMultipliersForBonusSymbols(gameInstance) {
    const { settings } = gameInstance;
    const multipliers = [
        { name: "Mini Multiplier", value: settings.miniMultiplier },
        { name: "Mega Multiplier", value: settings.megaMultiplier },
        { name: "Major Multiplier", value: settings.majorMultiplier },
        { name: "Grand Multiplier", value: settings.grandMultiplier },
    ];
    return multipliers;
}
/**
 * Finds the first symbol in a given line that is not a wild symbol.
 *
 * @param line - An array of indices representing the positions of symbols in the result matrix.
 * @param gameInstance - An instance of the game containing settings and result matrices.
 * @returns The first non-wild symbol found in the line. If all symbols are wild, returns the wild symbol.
 *          Returns null if an error occurs during execution.
 */
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
 * Sends initial game and player data to the client.
 * @param gameInstance - The instance of the game containing settings and player data.
 */
function sendInitData(gameInstance) {
    gameInstance.settings.lineData =
        gameInstance.settings.currentGamedata.linesApiData;
    gameUtils_1.UiInitData.paylines = (0, gameUtils_1.convertSymbols)(gameInstance.settings.Symbols);
    const reels = generateInitialReel(gameInstance.settings);
    const bonusReels = generateInitialBonusReel(gameInstance.settings);
    const bonusMulipliers = getMultipliersForBonusSymbols(gameInstance);
    gameInstance.settings.reels = reels;
    const dataToSend = {
        GameData: {
            Reel: reels,
            BonusReel: bonusReels,
            linesApiData: gameInstance.settings.currentGamedata.linesApiData,
            Bets: gameInstance.settings.currentGamedata.bets,
            baseBet: gameInstance.settings.baseBetAmount,
            betMultiplier: gameInstance.settings.currentGamedata.betMultiplier,
            specialBonusSymbolMulipliers: bonusMulipliers,
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
 * Checks for winning conditions in the game, processes bonuses, free spins, and calculates payouts.
 *
 * @param gameInstance - The current instance of the game containing settings, player data, and the game state.
 * @returns An array of winning lines and their associated details.
 */
function checkForWin(gameInstance) {
    try {
        const { settings } = gameInstance;
        const winningLines = [];
        let totalPayout = 0;
        if (settings.thunderBonus.isThunderBonus) {
            if (settings.thunderBonus.isThunderBonus && settings.thunderBonus.thunderSpinCount > 0) {
                settings.thunderBonus.thunderSpinCount -= 1;
                if (settings.thunderBonus.thunderSpinCount <= 0) {
                    const payoutOfBonusGame = (0, bonus_1.calculatePayoutOfBonusGame)(gameInstance);
                    // console.log(payoutOfBonusGame, "Payout of bonus games");
                    settings.thunderBonus.thunderSpinPayout = payoutOfBonusGame;
                    settings.thunderBonus.isThunderBonus = false;
                    settings.frozenIndices = [];
                    return;
                }
            }
            (0, bonus_1.handleBonusGameSpin)(gameInstance);
        }
        else {
            checkForThunderBonusGame(gameInstance);
            if (settings.freeSpin.useFreeSpin) {
                switch (true) {
                    case settings.isArthurBonus:
                        handleArthurBonus(gameInstance);
                        break;
                    case settings.isPollyBonus:
                        handlePollyBonus(gameInstance);
                        break;
                    case settings.isTomBonus:
                        handleTomBonus(gameInstance);
                        break;
                    default:
                        break;
                }
            }
            else {
                checkForFreeSpin(gameInstance);
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
                        gameInstance.playerData.currentWining += totalPayout;
                        settings._winData.winningLines.push(index);
                        winningLines.push({
                            line,
                            symbol: firstSymbol,
                            multiplier: symbolMultiplier,
                            matchCount,
                        });
                        // console.log(`Line ${index + 1}:`, line);
                        // console.log(`Payout for Line ${index + 1}:`, 'payout', symbolMultiplier);
                        const formattedIndices = winMatchedIndices.map(({ col, row }) => `${col},${row}`);
                        const validIndices = formattedIndices.filter(index => index.length > 2);
                        if (validIndices.length > 0) {
                            gameInstance.settings._winData.winningSymbols.push(validIndices);
                        }
                    }
                }
            });
        }
        totalPayout += settings.thunderBonus.thunderSpinPayout;
        //   console.log("Total Winning", gameInstance.playerData.currentWining);
        //   console.log("Total Free Spins Won:", gameInstance.settings.freeSpin.freeSpinCount);
        gameInstance.playerData.haveWon += gameInstance.playerData.currentWining;
        gameInstance.updatePlayerBalance(gameInstance.playerData.currentWining);
        makeResultJson(gameInstance);
        // Reset properties after result processing
        gameInstance.playerData.currentWining = 0;
        gameInstance.settings._winData.winningLines = [];
        gameInstance.settings._winData.winningSymbols = [];
        settings.freeSpin.freeSpinsAdded = false;
        gameInstance.settings.bonusSymbolValue = [];
        settings.freeSpin.freeSpinPayout = 0;
        settings.thunderBonus.thunderSpinsAdded = false;
        settings.thunderBonus.thunderSpinPayout = 0;
        settings.isGrandPrize = false;
    }
    catch (error) {
        console.error("Error in checkForWin", error);
        return [];
    }
}
/**
 * Checks if a given line of symbols constitutes a winning line.
 *
 * @param firstSymbol - The first symbol in the line to compare against.
 * @param line - An array of indices representing positions in the symbol matrix.
 * @param gameInstance - The current game instance containing settings and the result matrix.
 * @returns An object containing:
 *   - `isWinningLine`: Whether the line meets the winning criteria (at least 3 consecutive matches).
 *   - `matchCount`: The number of matching symbols in the winning sequence.
 *   - `matchedIndices`: An array of objects representing the column and row indices of matched symbols.
 */
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
            // Check for matches (consider wild symbols)
            if (symbol === currentSymbol || symbol === wildSymbol) {
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
/**
 * Configures game settings based on the special symbol provided.
 * Updates the relevant symbol properties in the game instance based on the type of the special symbol.
 *
 * @param symbol - The symbol object containing details such as name and ID.
 * @param gameInstance - The instance of the SLPB class that manages the game logic.
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
        case types_1.specialIcons.coins:
            gameInstance.settings.coins.SymbolName = symbol.Name;
            gameInstance.settings.coins.SymbolID = symbol.Id;
            gameInstance.settings.coins.useWild = true;
            break;
        case types_1.specialIcons.mini:
            gameInstance.settings.mini.SymbolName = symbol.Name;
            gameInstance.settings.mini.SymbolID = symbol.Id;
            gameInstance.settings.mini.useWild = false;
            break;
        case types_1.specialIcons.major:
            gameInstance.settings.major.SymbolName = symbol.Name;
            gameInstance.settings.major.SymbolID = symbol.Id;
            gameInstance.settings.major.useWild = false;
            break;
        case types_1.specialIcons.mega:
            gameInstance.settings.mega.SymbolName = symbol.Name;
            gameInstance.settings.mega.SymbolID = symbol.Id;
            gameInstance.settings.mega.useWild = false;
            break;
        case types_1.specialIcons.arthurBonus:
            gameInstance.settings.arthurBonus.SymbolName = symbol.Name;
            gameInstance.settings.arthurBonus.SymbolID = symbol.Id;
            gameInstance.settings.arthurBonus.useWild = false;
            break;
        case types_1.specialIcons.pollyBonus:
            gameInstance.settings.pollyBonus.SymbolName = symbol.Name;
            gameInstance.settings.pollyBonus.SymbolID = symbol.Id;
            gameInstance.settings.pollyBonus.useWild = false;
            break;
        case types_1.specialIcons.tomBonus:
            gameInstance.settings.tomBonus.SymbolName = symbol.Name;
            gameInstance.settings.tomBonus.SymbolID = symbol.Id;
            gameInstance.settings.tomBonus.useWild = false;
            break;
        case types_1.specialIcons.thomas:
            gameInstance.settings.thomas.SymbolName = symbol.Name;
            gameInstance.settings.thomas.SymbolID = symbol.Id;
            gameInstance.settings.thomas.useWild = false;
            break;
        default:
            break;
            ``;
    }
}
/**
 * Retrieves a random value based on the specified type and its associated probabilities.
 * The function uses weighted probabilities to select a value from a predefined set.
 *
 * @param gameInstance - The instance of the SLPB class that manages the game logic.
 * @param type - The type of random value to retrieve
 * @returns A randomly selected value based on the weighted probabilities for the specified type.
 * @throws An error if an invalid type is provided.
 */
function getRandomValue(gameInstance, type) {
    const { settings } = gameInstance;
    let values;
    let probabilities;
    // determine the values and probabilities based on the type
    if (type === 'polly') {
        values = settings === null || settings === void 0 ? void 0 : settings.pollyAdjacentColumn;
        probabilities = settings === null || settings === void 0 ? void 0 : settings.pollyAdjacentColumn;
    }
    else if (type === 'coinsValue') {
        values = settings === null || settings === void 0 ? void 0 : settings.coinsvalue;
        probabilities = settings === null || settings === void 0 ? void 0 : settings.coinsvalueProb;
    }
    else if (type === 'coinsValueDuringFreeSpin') {
        values = settings === null || settings === void 0 ? void 0 : settings.coinsvalueDuringFreeSpins;
        probabilities = settings === null || settings === void 0 ? void 0 : settings.coinsvalueDuringFreeSpinsProb;
    }
    else if (type === 'pollySymbol') {
        values = settings === null || settings === void 0 ? void 0 : settings.pollyAdjacentColumn;
        probabilities = settings === null || settings === void 0 ? void 0 : settings.pollyAdjacentColumnProb;
    }
    else if (type === 'tomCollosal') {
        values = settings === null || settings === void 0 ? void 0 : settings.tommyColossalSymbol;
        probabilities = settings === null || settings === void 0 ? void 0 : settings.tommyColossalSymbolProb;
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
/**
 * Returns true or false based on a given probability.
 * @param probability - The probability (in percentage) for the event to occur (0 to 100).
 * @returns `true` if the event occurs, otherwise `false`.
 */
function checkProbability(probability) {
    if (probability < 0 || probability > 100) {
        throw new Error("Probability must be between 0 and 100.");
    }
    const randomValue = Math.random() * 100; // Random value between 0 and 100
    return randomValue < probability;
}
/**
 * Checks if the Thunder Bonus Game condition is met based on the presence of coin symbols.
 * Updates game settings and prepares the bonus game if the condition is satisfied.
 *
 * @param gameInstance - The current game instance containing settings, result matrices, and bonus rules.
 */
function checkForThunderBonusGame(gameInstance) {
    const { settings } = gameInstance;
    let coinCount = 0;
    settings.frozenIndices = [];
    settings.resultSymbolMatrix.map((row, rowIndex) => {
        row.map((symbol, colIndex) => {
            if (symbol === settings.coins.SymbolID) {
                let bonusSymbolValue;
                if (settings.freeSpin.useFreeSpin) {
                    bonusSymbolValue = getRandomValue(gameInstance, 'coinsValueDuringFreeSpin');
                }
                else {
                    bonusSymbolValue = getRandomValue(gameInstance, 'coinsValue');
                }
                gameInstance.settings.bonusSymbolValue.push({ position: [colIndex, rowIndex], coinsvalue: bonusSymbolValue, symbol: symbol });
                coinCount++;
            }
        });
    });
    if (coinCount >= 6) {
        gameInstance.settings.tempResultSymbolMatrix = settings.resultSymbolMatrix;
        settings.thunderBonus.isThunderBonus = true;
        settings.thunderBonus.thunderSpinCount = settings.thunderBonus.thunderSpinAwardedCount;
        gameInstance.settings.frozenIndices = gameInstance.settings.bonusSymbolValue;
    }
}
/**
 * Checks for the Free Spin game activation based on specific symbol arrangements in the result matrix.
 * Updates game settings and prepares the appropriate bonus type if the conditions are met.
 *
 * @param gameInstance - The current game instance containing settings and the result symbol matrix.
 */
function checkForFreeSpin(gameInstance) {
    var _a;
    const { resultSymbolMatrix, bonus, arthurBonus, pollyBonus, tomBonus } = gameInstance.settings;
    const { settings } = gameInstance;
    // Reset frozen indices
    const mandatoryBonusID = bonus.SymbolID;
    const column5BonusIDs = [arthurBonus.SymbolID, pollyBonus.SymbolID, tomBonus.SymbolID];
    const isBonusInColumn1 = resultSymbolMatrix.some(row => row[0] === mandatoryBonusID);
    const isBonusInColumn3 = resultSymbolMatrix.some(row => row[2] === mandatoryBonusID);
    if (isBonusInColumn1 && isBonusInColumn3) {
        const column5BonusID = (_a = resultSymbolMatrix.find(row => column5BonusIDs.includes(row[4]))) === null || _a === void 0 ? void 0 : _a[4];
        if (column5BonusID) {
            settings.freeSpin.useFreeSpin = true;
            settings.freeSpin.freeSpinCount = settings.freeSpin.freeSpinAwardedCount;
        }
        switch (column5BonusID) {
            case arthurBonus.SymbolID:
                settings.isArthurBonus = true;
                break;
            case tomBonus.SymbolID:
                settings.isTomBonus = true;
                break;
            case pollyBonus.SymbolID:
                settings.isPollyBonus = true;
                break;
            default:
                break;
        }
    }
    else {
        console.log("Columns 1 and 3 do not both contain bonus ID 10. No further checks performed.");
    }
}
/**
 * Handles the logic for the Arthur Bonus feature.
 *
 * @param gameInstance - The current game instance containing settings and bonus information.
 *
 * 1. **Free Spin Count Handling**:
 *    - Checks if Free Spins are active and reduces the Free Spin count by 1.
 *    - Disables Free Spins and the Arthur Bonus flag when the count reaches zero.
 *
 * 2. **Matrix Adjustment**:
 *    - Calls `reducedMatrixForArthurBonus` to adjust the result matrix specifically for the Arthur Bonus.
 *
 * 3. **Bonus Symbol Count Check**:
 *    - Invokes `checkBonusSymbolCount` to update any bonus-related metrics or states.
 */
function handleArthurBonus(gameInstance) {
    const { settings } = gameInstance;
    if (settings.freeSpin.freeSpinCount > 0 && settings.freeSpin.useFreeSpin) {
        settings.freeSpin.freeSpinCount -= 1;
        if (settings.freeSpin.freeSpinCount <= 0) {
            settings.freeSpin.useFreeSpin = false;
            settings.isArthurBonus = false;
        }
    }
    reducedMatrixForArthurBonus(gameInstance);
    checkBonusSymbolCount(gameInstance);
}
/**
 * Handles the logic for the Polly Bonus feature.
 *
 * @param gameInstance - The current game instance containing settings and bonus information.
 *
 * 1. **Free Spin Count Handling**:
 *    - Checks if Free Spins are active and reduces the Free Spin count by 1.
 *    - Disables Free Spins and the Polly Bonus flag when the count reaches zero.
 *
 * 2. **Random Column Selection**:
 *    - Uses `getRandomValue` to determine a column for Polly Bonus modifications (`pollyAdjacentColumn`).
 *
 * 3. **Matrix Modification**:
 *    - Iterates over each row in the result symbol matrix.
 *      - Updates the selected column with a random Polly symbol using `getRandomValue`.
 *      - Fills the next two columns with the same Polly symbol for adjacent alignment.
 *    - Logs the Polly symbol applied to the selected column.
 *
 * 4. **Bonus Symbol Count Check**:
 *    - Invokes `checkBonusSymbolCount` to update bonus-related metrics or states after modifications.
 */
function handlePollyBonus(gameInstance) {
    const { settings } = gameInstance;
    if (settings.freeSpin.freeSpinCount > 0 && settings.freeSpin.useFreeSpin) {
        settings.freeSpin.freeSpinCount -= 1;
        if (settings.freeSpin.freeSpinCount <= 0) {
            settings.freeSpin.useFreeSpin = false;
            settings.isPollyBonus = false;
        }
    }
    const pollyAdjacentColumn = getRandomValue(gameInstance, 'polly');
    settings.resultSymbolMatrix.map((row, rowIndex) => {
        row[pollyAdjacentColumn] = getRandomValue(gameInstance, 'pollySymbol');
        row.fill(row[pollyAdjacentColumn], pollyAdjacentColumn + 1, pollyAdjacentColumn + 3);
        console.log(row[pollyAdjacentColumn]);
    });
    checkBonusSymbolCount(gameInstance);
}
/**
 * Handles the logic for the Tom Bonus feature.
 *
 * @param gameInstance - The current game instance containing settings and bonus information.
 *
 * 1. **Free Spin Count Handling**:
 *    - Checks if Free Spins are active and reduces the Free Spin count by 1.
 *    - Disables Free Spins and the Tom Bonus flag when the count reaches zero.
 *
 * 2. **Colossal Merge Check**:
 *    - Uses `checkProbability` to determine if a colossal merge should occur based on the configured probability.
 *
 * 3. **Colossal Symbol Replacement**:
 *    - If a colossal merge is triggered:
 *      - Retrieves a random value for the colossal symbol using `getRandomValue`.
 *      - Updates columns 1 through 3 (inclusive) of each row in the result matrix with the colossal symbol.
 *      - Adds 5 Free Spins to the current Free Spin count.
 *      - Sets the `freeSpinsAdded` flag to `true` to indicate the bonus spins were added.
 *
 * 4. **No Merge Scenario**:
 *    - Logs a message if the colossal merge condition is not satisfied.
 */
function handleTomBonus(gameInstance) {
    const { settings } = gameInstance;
    if (settings.freeSpin.freeSpinCount > 0 && settings.freeSpin.useFreeSpin) {
        settings.freeSpin.freeSpinCount -= 1;
        if (settings.freeSpin.freeSpinCount <= 0) {
            settings.freeSpin.useFreeSpin = false;
            settings.isTomBonus = false;
        }
    }
    if (checkProbability(settings.colossalMergeProbability)) {
        const randomValue = getRandomValue(gameInstance, 'tomCollosal');
        settings.resultSymbolMatrix.forEach((row) => {
            row.fill(randomValue, 1, 4);
        });
        settings.freeSpin.freeSpinCount += 5;
        settings.freeSpin.freeSpinsAdded = true;
    }
    else {
        console.log("Colossal merge will not happen.");
    }
}
/**
 * Adjusts the result matrix to include only valid symbols for the Arthur Bonus feature.
 *
 * @param gameInstance - The current game instance containing settings and game data.
 *
 * 1. **Retrieve Valid Symbols**:
 *    - Filters the symbol list from game settings to identify symbols flagged as valid for the Arthur Bonus.
 *    - Maps these symbols to extract their IDs for comparison.
 *
 * 2. **Matrix Iteration**:
 *    - Loops through each row and column of the result symbol matrix.
 *    - Checks if the current symbol is not included in the list of valid Arthur symbols.
 *
 * 3. **Replacement with Random Valid Symbols**:
 *    - If the symbol is invalid, selects a random symbol from the valid Arthur symbols list.
 *    - Replaces the invalid symbol in the matrix with the selected random valid symbol.
 *
 * 4. **Result**:
 *    - Ensures the result symbol matrix contains only symbols valid for the Arthur Bonus, modifying it in place.
 */
function reducedMatrixForArthurBonus(gameInstance) {
    const { settings } = gameInstance;
    const validSymbolsForArthur = gameInstance.currentGameData.gameSettings.Symbols.filter((symbol) => symbol.isArthurSymbol).map((symbol) => symbol.Id);
    settings.resultSymbolMatrix.map((row, rowIndex) => {
        row.map((symbol, colIndex) => {
            if (!validSymbolsForArthur.includes(symbol)) {
                const randomIndex = Math.floor(Math.random() * validSymbolsForArthur.length);
                const randomSymbol = validSymbolsForArthur[randomIndex];
                settings.resultSymbolMatrix[rowIndex][colIndex] = randomSymbol;
            }
        });
    });
}
/**
 * Checks the count of bonus symbols in the result symbol matrix and updates the Free Spin count accordingly.
 *
 * @param gameInstance - The current game instance containing settings and game data.
 *
 * 1. **Initialize Bonus Symbol Count**:
 *    - Initializes `bonusSymbolCount` to track the number of bonus symbols found in the result matrix.
 *    - Defines `validBonusSymbol` as an array containing all valid bonus symbol IDs (Arthur, Polly, Tom, and generic bonus symbols).
 *
 * 2. **Matrix Iteration**:
 *    - Loops through the result symbol matrix, checking each symbol in each row.
 *    - Increments the `bonusSymbolCount` for every occurrence of a valid bonus symbol.
 *
 * 3. **Bonus Spin Handling**:
 *    - If at least 3 bonus symbols are found, adds 5 Free Spins to the `freeSpinCount`.
 *    - Sets `freeSpinsAdded` to `true` to indicate that the Free Spins have been granted.
 *
 * 4. **Effect**:
 *    - Ensures the Free Spin count is updated when enough bonus symbols are found.
 */
function checkBonusSymbolCount(gameInstance) {
    const { settings } = gameInstance;
    let bonusSymbolCount = 0;
    const validBonusSymbol = [settings.bonus.SymbolID, settings.arthurBonus.SymbolID, settings.pollyBonus.SymbolID, settings.tomBonus.SymbolID,];
    settings.resultSymbolMatrix.map((row) => {
        row.map((symbol) => {
            if (validBonusSymbol.includes(symbol)) {
                bonusSymbolCount += 1;
            }
        });
    });
    // console.log(settings.resultSymbolMatrix)    
    if (bonusSymbolCount >= 3) {
        // console.log(bonusSymbolCount, "Bonus Symbol Count");
        settings.freeSpin.freeSpinCount += 5;
        settings.freeSpin.freeSpinsAdded = true;
    }
}
/**
 * Prepares and sends the result data for the current game state to the client.
 * Includes game data, player data, and details of any free spins or winnings.
 * @param gameInstance - The instance of the SLPB class containing the game state and settings.
 */
function makeResultJson(gameInstance) {
    try {
        const { settings, playerData } = gameInstance;
        const credits = gameInstance.getPlayerData().credits + playerData.currentWining;
        const sendData = {
            GameData: {
                ResultReel: settings.resultSymbolMatrix,
                linesToEmit: settings._winData.winningLines,
                symbolsToEmit: settings._winData.winningSymbols,
                isFreeSpin: settings.freeSpin.useFreeSpin,
                freeSpinCount: settings.freeSpin.freeSpinCount,
                freeSpinAdded: settings.freeSpin.freeSpinsAdded,
                frozenIndices: settings.frozenIndices,
                isGrandPrize: settings.isGrandPrize,
                isThunderSpin: settings.thunderBonus.isThunderBonus,
                thunderSpinCount: settings.thunderBonus.thunderSpinCount,
                thunderSpinAdded: settings.thunderBonus.thunderSpinsAdded
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
