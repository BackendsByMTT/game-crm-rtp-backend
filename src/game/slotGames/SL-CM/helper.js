"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeGameSettings = initializeGameSettings;
exports.sendInitData = sendInitData;
exports.freezeIndex = freezeIndex;
exports.checkSameMatrix = checkSameMatrix;
exports.checkPayout = checkPayout;
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
        isSpecial: gameData.gameSettings.isSpecial,
        matrix: gameData.gameSettings.matrix,
        bets: gameData.gameSettings.bets,
        Symbols: gameInstance.initSymbols,
        resultSymbolMatrix: [],
        currentGamedata: gameData.gameSettings,
        _winData: new WinData_1.WinData(gameInstance),
        currentBet: 0,
        currentLines: 0,
        BetPerLines: 0,
        reels: [],
        hasreSpin: false,
        hasredSpin: false,
        specialSpins: [],
        lastReSpin: [],
        freezeIndex: [],
        newMatrix: [],
        results: gameData.gameSettings.results,
        probabilities: gameData.gameSettings.probabilities,
        redspinprobability: gameData.gameSettings.redspinprobability,
    };
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
 * Sends the initial game and player data to the client.
 * @param gameInstance - The instance of the SLCM class containing the game settings and player data.
 */
function sendInitData(gameInstance) {
    gameUtils_1.UiInitData.paylines = (0, gameUtils_1.convertSymbols)(gameInstance.settings.Symbols);
    const dataToSend = {
        GameData: {
            Bets: gameInstance.settings.currentGamedata.bets,
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
 * Updates the result matrix based on the type of spin and the frozen indices in the game settings.
 * This function modifies the matrix to retain frozen indices from previous spins or specific re-spin settings.
 *
 * @param gameInstance - The instance of the SLCM class that manages the game logic, providing access to settings.
 * @param type - The type of spin, which can be either a standard 'RESPIN' or 'REDRESPIN'.
 * @param matrix - The current result matrix that needs to be updated based on the frozen indices and spin type.
 *
 * @returns An updated matrix where frozen indices are replaced with values from the last re-spin or initial red respin matrix, depending on the spin type.
 *
 * The function performs the following steps:
 * 1. Checks the type of spin.
 * 2. If the type is 'RESPIN', it updates the matrix by replacing values at frozen indices with the corresponding values from the last re-spin.
 * 3. If the type is 'REDRESPIN', it updates the matrix by replacing values at frozen indices with the corresponding values from the initial red respin matrix.
 * 4. Logs the updated matrix for debugging purposes.
 * 5. Returns the updated matrix or the original matrix if the spin type does not match 'RESPIN' or 'REDRESPIN'.
 *
 * @throws An error if any issues occur during the matrix update process, with an error message logged to the console.
 */
function freezeIndex(gameInstance, type, matrix) {
    try {
        const { settings } = gameInstance;
        if (type === types_1.SPINTYPES.RESPIN) {
            const updatedMatrix = matrix.map((item, index) => {
                if (settings.freezeIndex.includes(index)) {
                    return settings.lastReSpin && settings.lastReSpin[index] !== undefined
                        ? settings.lastReSpin[index]
                        : item;
                }
                return item;
            });
            return updatedMatrix;
        }
        else if (type === types_1.SPINTYPES.REDRESPIN) {
            const updatedMatrix = matrix.map((item, index) => {
                if (settings.freezeIndex.includes(index)) {
                    return settings.initialRedRespinMatrix[index] !== undefined
                        ? settings.initialRedRespinMatrix[index]
                        : item;
                }
                return item;
            });
            return updatedMatrix;
        }
        return matrix;
    }
    catch (error) {
        console.log(`ERROR IN FREEZE INDEX CHECK ${error}`);
    }
}
/**
 * Compares two matrices to determine if they are identical.
 * This function checks if each element in the first matrix matches the corresponding element in the second matrix.
 *
 * @param matrix1 - The first matrix to compare.
 * @param matrix2 - The second matrix to compare against the first matrix.
 *
 * @returns A boolean indicating whether the two matrices are identical.
 *
 * The function performs the following steps:
 * 1. Uses the `every` method to iterate through each element of `matrix1`.
 * 2. For each element, it compares it to the corresponding element in `matrix2` by converting both elements to JSON strings and checking for equality.
 * 3. If all elements match, it returns `true`. If any element does not match, it returns `false`.
 * 4. Catches and logs any errors that occur during the comparison process, returning `false` if an error is encountered.
 *
 * @throws An error if any issues occur during the matrix comparison process, with an error message logged to the console.
 */
function checkSameMatrix(matrix1, matrix2) {
    try {
        return matrix1.every((item, index) => {
            return JSON.stringify(item) === JSON.stringify(matrix2[index]);
        });
    }
    catch (error) {
        console.error('Error comparing matrices:', error);
        return false;
    }
}
/**
 * Calculates the total payout based on the pre-processed result array.
 * This function constructs a payout string from the `payout` values of each symbol in the result array and converts it to an integer.
 *
 * @param preProcessedResult - An array of symbols where each symbol contains a `Name` and `payout` property.
 *
 * @returns The total payout as a number. If the `payout` values are concatenated into a string, it is converted to an integer. Returns `0` if there are no valid payouts or if an error occurs.
 *
 * The function performs the following steps:
 * 1. Initializes an empty string, `payoutString`, to accumulate payout values.
 * 2. Iterates over each symbol in the `preProcessedResult` array.
 * 3. For each symbol, it checks if the `Name` is defined and not equal to '00', and if the `payout` is present.
 * 4. If the conditions are met, it appends the `payout` value (converted to a string) to `payoutString`.
 * 5. After processing all symbols, it converts the accumulated `payoutString` to an integer using `parseInt`.
 * 6. Returns the total payout as an integer, or `0` if `payoutString` is empty or if an error occurs.
 * 7. Logs any errors encountered during the calculation process and returns `0` if an error is thrown.
 *
 * @throws Error if any issues occur during the payout calculation process, with an error message logged to the console.
 */
function checkPayout(preProcessedResult) {
    try {
        let payoutString = '';
        preProcessedResult.forEach(symbol => {
            if ((symbol === null || symbol === void 0 ? void 0 : symbol.Name) !== undefined && symbol.payout && symbol.Name !== '00') {
                payoutString += symbol.payout.toString();
            }
        });
        const totalPayout = payoutString ? parseInt(payoutString, 10) : 0;
        return totalPayout;
    }
    catch (error) {
        console.error('Error calculating payout:', error);
        return 0;
    }
}
//
function makeResultJson(gameInstance) {
    try {
        const { settings } = gameInstance;
        const credits = gameInstance.getPlayerData().credits;
        const Balance = credits.toFixed(2);
        const sendData = {
            gameData: {
                resultSymbols: settings.resultSymbolMatrix,
                hasReSpin: settings.hasreSpin,
                hasRedSpin: settings.hasredSpin
            },
            PlayerData: {
                Balance: Balance,
                currentWining: gameInstance.playerData.currentWining
            }
        };
        gameInstance.sendMessage('ResultData', sendData);
    }
    catch (error) {
        console.error("Error generating result JSON or sending message:", error);
    }
}
