import { WinData } from "../BaseSlotGame/WinData";
import {
    betMultiplier,
    convertSymbols,
    generateRandomNumber,
    UiInitData,
    shuffleArray
} from "../../Utils/gameUtils";
import { SLSG } from "./spartacusGladitaorBase";
import { specialIcons } from "./types";

/**
 * Initializes the game settings using the provided game data and game instance.
 * @param gameData - The data used to configure the game settings.
 * @param gameInstance - The instance of the SLCM class that manages the game logic.
 * @returns An object containing initialized game settings.
 */
export function initializeGameSettings(gameData: any, gameInstance: SLSG) {
    return {
        id: gameData.gameSettings.id,
        matrix: gameData.gameSettings.matrix,
        bets: gameData.gameSettings.bets,
        baseBet: gameData.gameSettings.baseBet,
        BetMultiplier: gameData.gameSettings.betMultiplier,
        Symbols: gameInstance.initSymbols,
        symbolsSetCollosal: gameData.gameSettings.symbolsSetCollosal,
        symbolsSetCollosalProb: gameData.gameSettings.symbolsSetCollosalProb,
        symbolsSet: gameData.gameSettings.symbolsSet,
        symbolsSetProb: gameData.gameSettings.symbolsSetProb,
        resultSymbolMatrix: [],
        resultSymbolMatrixWithoutNull: [],
        mainReelMatrix: [],
        colossalReelMatrix: [],
        currentGamedata: gameData.gameSettings,
        lineData: [],
        matchCountOfLines: [],
        _winData: new WinData(gameInstance),
        currentBet: 0,
        baseBetAmount: gameData.gameSettings.baseBet,
        currentLines: 0,
        BetPerLines: 0,
        reels: [],
        freeSpin: {
            freeSpinsAdded: false,
            freeSpinCount: 0,
            useFreeSpin: false,
        },
        replacedToWildIndices: [],
        wild: {
            SymbolName: "",
            SymbolID: -1,
            useWild: false,
        },
        freeSpinSymbol: {
            symbolID: "-1",
            multiplier: [],
        }
    };
}
/**
 * Generates the initial reel setup based on the game settings.
 * @param gameSettings - The settings used to generate the reel setup.
 * @returns A 2D array representing the reels, where each sub-array corresponds to a reel.
 */
export function generateInitialReel(gameSettings: any): string[][] {
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
 * Configures paylines based on the game's settings and handles special symbols.
 * @param gameInstance - The instance of the game.
 */

export function makePayLines(gameInstance: SLSG) {
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

export function sendInitData(gameInstance: SLSG) {
    gameInstance.settings.lineData =
        gameInstance.settings.currentGamedata.linesApiData;
    UiInitData.paylines = convertSymbols(gameInstance.settings.Symbols);
    const reels = generateInitialReel(gameInstance.settings);
    gameInstance.settings.reels = reels;
    const dataToSend = {
        GameData: {
            Reel: reels,
            linesApiData: gameInstance.settings.currentGamedata.linesApiData,
            Bets: gameInstance.settings.currentGamedata.bets,
            baseBet: gameInstance.settings.baseBetAmount,
            betMultiplier: gameInstance.settings.currentGamedata.betMultiplier
        },
        UIData: UiInitData,
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
 * Checks for wins on paylines, processes free spins, and updates game state.
 * @param gameInstance - The instance of the game.
 * @returns An array of winning lines.
 */

export function checkForWin(gameInstance: SLSG) {
    try {
        const { settings } = gameInstance;
        settings.mainReelMatrix = reduceMatrix(gameInstance, 'main');
        settings.colossalReelMatrix = reduceMatrix(gameInstance, 'collosal');
        handleFullReelOfWild(gameInstance, settings.wild.SymbolID)
        const combinedMatrix = [...settings.mainReelMatrix, ...settings.colossalReelMatrix];
        console.log(combinedMatrix, 'combined');
        settings.resultSymbolMatrix = combinedMatrix;


        const winningLines = [];
        let totalPayout = 0;

        const { isFreeSpin, freeSpinSymbolCount } = checkForFreeSpin(gameInstance);
        if (isFreeSpin) {
            handleFreeSpins(freeSpinSymbolCount, gameInstance);
        }

        settings.lineData.forEach((line, index) => {
            //RTL for free spins
            const firstSymbolPositionLTR = line[0];

            let firstSymbolLTR = settings.resultSymbolMatrix[firstSymbolPositionLTR][0];
            const firstSymbol = firstSymbolLTR;
            if (settings.wild.useWild && firstSymbolLTR === settings.wild.SymbolID) {
                firstSymbolLTR = findFirstNonWildSymbol(line, gameInstance);
            }
            const { isWinningLine, matchCount, matchedIndices } = checkLineSymbols(
                firstSymbol,
                line,
                gameInstance,
                'LTR'
            );
            switch (true) {
                case isWinningLine && matchCount >= 4 && !settings.freeSpin.useFreeSpin:
                    const symbolMultiplierLTR = accessData(
                        firstSymbolLTR,
                        matchCount,
                        gameInstance
                    );
                    switch (true) {
                        case symbolMultiplierLTR > 0:
                            const payout = symbolMultiplierLTR * settings.currentBet;
                            totalPayout += payout;

                            settings._winData.winningLines.push(index + 1);
                            winningLines.push({
                                line,
                                symbol: firstSymbolLTR,
                                multiplier: symbolMultiplierLTR,
                                matchCount,
                            });
                            settings.matchCountOfLines.push([index + 1, matchCount]);
                            console.log(`Line ${index + 1}:`, line);
                            console.log(
                                `Payout for Line ${index + 1}:`,
                                "payout",
                                symbolMultiplierLTR
                            );
                            const formattedIndices = matchedIndices.map(({ col, row }) => `${col},${row}`);
                            const validIndices = formattedIndices.filter(
                                (index) => index.length > 2
                            );
                            if (validIndices.length > 0) {
                                // console.log(settings.lastReel, 'settings.lastReel')
                                console.log(validIndices);
                                settings._winData.winningSymbols.push(validIndices);
                                settings._winData.totalWinningAmount = totalPayout;

                                console.log(settings._winData.totalWinningAmount)
                            }
                            break;
                        default:
                            break;
                    }
                    break;
                default:
                    break;
            }
        });


        if (settings.freeSpin.useFreeSpin && settings.freeSpin.freeSpinCount > 0) {
            settings.freeSpin.freeSpinCount -= 1;
            if (settings.freeSpin.freeSpinCount <= 0) {
                settings.freeSpin.useFreeSpin = false;
            }
        }
        if (isFreeSpin) {
            settings.freeSpin.useFreeSpin = true;

        }

        gameInstance.playerData.currentWining += totalPayout;
        gameInstance.playerData.haveWon += gameInstance.playerData.currentWining;
        gameInstance.updatePlayerBalance(gameInstance.playerData.currentWining);

        makeResultJson(gameInstance)
        settings._winData.totalWinningAmount = 0;
        gameInstance.playerData.currentWining = 0;
        settings._winData.winningLines = []
        settings._winData.winningSymbols = []
        settings.replacedToWildIndices = [];
        settings.freeSpin.freeSpinsAdded = false;
        settings.matchCountOfLines = [];


        return winningLines;
    } catch (error) {
        console.error("Error in checkForWin", error);
        return [];
    }
}
//checking matching lines with first symbol and wild subs
type MatchedIndex = { col: number; row: number };
type CheckLineResult = { isWinningLine: boolean; matchCount: number; matchedIndices: MatchedIndex[] };

function checkLineSymbols(
    firstSymbol: string,
    line: number[],
    gameInstance: SLSG,
    direction: 'LTR' | 'RTL' = 'LTR'
): CheckLineResult {
    try {
        const { settings } = gameInstance;
        const wildSymbol = settings.wild.SymbolID || "";
        let matchCount = 1;
        let currentSymbol = firstSymbol;

        const matchedIndices: MatchedIndex[] = [];
        const start = direction === 'LTR' ? 0 : line.length - 1;
        const end = direction === 'LTR' ? line.length : -1;
        const step = direction === 'LTR' ? 1 : -1;

        matchedIndices.push({ col: start, row: line[start] });

        for (let i = start + step; i !== end; i += step) {
            const rowIndex = line[i];
            const symbol = settings.resultSymbolMatrix[rowIndex][i];

            if (symbol === undefined) {
                console.error(`Symbol at position [${rowIndex}, ${i}] is undefined.`);
                return { isWinningLine: false, matchCount: 0, matchedIndices: [] };
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
                    return { isWinningLine: matchCount >= 4, matchCount, matchedIndices };
            }
        }
        return { isWinningLine: matchCount >= 4, matchCount, matchedIndices };
    } catch (error) {
        console.error("Error in checkLineSymbols:", error);
        return { isWinningLine: false, matchCount: 0, matchedIndices: [] };
    }
}


/**
 * Finds the first non-wild symbol in a line, considering the specified direction.
 * @param line - The line of symbols to analyze.
 * @param gameInstance - The game instance containing symbol data.
 * @param direction - The direction to scan ('LTR' or 'RTL').
 * @returns The first non-wild symbol found, or the wild symbol if none are found.
 */
function findFirstNonWildSymbol(line: number[], gameInstance: SLSG, direction: 'LTR' | 'RTL' = 'LTR') {
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

/**
 * Retrieves the multiplier associated with a symbol and match count.
 * @param symbol - The symbol for which the multiplier is retrieved.
 * @param matchCount - The number of matching symbols.
 * @param gameInstance - The game instance containing symbol data.
 * @returns The multiplier value or 0 if no data is found.
 */

function accessData(symbol, matchCount, gameInstance: SLSG) {
    const { settings } = gameInstance;
    try {
        const symbolData = settings.currentGamedata.Symbols.find(
            (s) => s.Id.toString() === symbol.toString()
        );
        if (symbolData) {
            const multiplierArray = symbolData.multiplier;
            if (multiplierArray && multiplierArray[5 - matchCount]) {
                return multiplierArray[5 - matchCount][0];
            }
        }
        return 0;
    } catch (error) {
        // console.error("Error in accessData:");
        return 0;
    }
}

/**
 * Sends the initial game and player data to the client.
 * @param gameInstance - The instance of the SLCM class containing the game settings and player data.
 */




function handleSpecialSymbols(symbol: any, gameInstance: SLSG) {
    switch (symbol.Name) {
        case specialIcons.wild:
            gameInstance.settings.wild.SymbolName = symbol.Name;
            gameInstance.settings.wild.SymbolID = symbol.Id;
            gameInstance.settings.wild.useWild = true;
            break;
        case specialIcons.FreeSpin:
            gameInstance.settings.freeSpinSymbol.symbolID = symbol.Id;
            gameInstance.settings.freeSpinSymbol.multiplier = symbol.multiplier;
            break;
        default:
            break; ``
    }
}

/**
 * Replaces all symbols in a column with wild symbols if the entire column matches the specified symbol.
 * @param gameInstance - The instance of the SLSG class containing the game state and settings.
 * @param symbolIdToCheck - The symbol ID to check for a full column match. Defaults to 0.
 */

function handleFullReelOfWild(gameInstance: SLSG, symbolIdToCheck = 11) {
    try {
        const { settings } = gameInstance;
        const resultSymbolMatrix = settings.mainReelMatrix;
        for (let col = 0; col < resultSymbolMatrix[0].length; col++) {
            const isFullColumn = resultSymbolMatrix.every(row => row[col] === symbolIdToCheck || row[col] === null);

            if (isFullColumn) {
                for (let row = 0; row < settings.colossalReelMatrix.length; row++) {
                    settings.colossalReelMatrix[row][col] = settings.wild.SymbolID;
                }
                settings.replacedToWildIndices.push(col);
            }
        }
    } catch (error) {
        console.error("Error handling full reel of Wild:", error);
    }
}

/**
 * Checks if there are enough freeSpin symbols in the reels to trigger free spins.
 * @param gameInstance - The instance of the SLSG class containing the game state and settings.
 * @returns An object indicating whether free spins are triggered and the count of freeSpin symbols.
 */

function checkForFreeSpin(gameInstance: SLSG) {
    const { resultSymbolMatrix, freeSpinSymbol } = gameInstance.settings;

    let freeSpinSymbolCount = 0;
    const freeSpinIndices: { col: number; row: number }[] = [];

    for (let col = 0; col < resultSymbolMatrix.length; col++) {
        const reel = resultSymbolMatrix[col];
        for (let row = 0; row < reel.length; row++) {
            if (reel[row] === Number(freeSpinSymbol.symbolID)) {
                freeSpinSymbolCount++;
                freeSpinIndices.push({ col, row });
            }
        }
    }

    const isFreeSpin = freeSpinSymbolCount >= 3;

    // console.log(`Freespin Count: ${freeSpinSymbolCount}`);
    // console.log(`FreeSpin Indices:`, freeSpinIndices);
    // console.log(`Free Spin Triggered: ${isFreeSpin}`);

    return { isFreeSpin, freeSpinSymbolCount, freeSpinIndices };
}


/**
 * Handles the logic for awarding free spins based on the number of freespin symbols.
 * Updates the free spin count and optionally awards winnings based on the current bet.
 * @param freeSpinCount - The number of freespin symbols found.
 * @param gameInstance - The instance of the SLSG class containing the game state and settings.
 */

function handleFreeSpins(freeSpinCount: number, gameInstance: SLSG) {
    const { settings, playerData } = gameInstance;
    if (settings.freeSpin.useFreeSpin === true) {
        settings.freeSpin.freeSpinsAdded = true;
    }
    console.log(freeSpinCount);

    // console.log(settings.freeSpinSymbol.multiplier, "MULTIPLIER");

    switch (true) {
        case freeSpinCount >= 5:
            settings.freeSpin.freeSpinCount += settings.freeSpinSymbol.multiplier[0][1];
            playerData.currentWining += settings.currentBet * settings.freeSpinSymbol.multiplier[0][0];
            break;
        case freeSpinCount === 4:
            settings.freeSpin.freeSpinCount += settings.freeSpinSymbol.multiplier[1][1];
            playerData.currentWining += settings.currentBet * settings.freeSpinSymbol.multiplier[1][0];
            break;
        case freeSpinCount === 3:
            settings.freeSpin.freeSpinCount += settings.freeSpinSymbol.multiplier[2][1];;
            break;
        default:
            // No Free Spins awarded or case not handled
            break;
    }
}

/**
 * Reduces the matrix by removing symbols from columns based on predefined counts.
 * Nullifies a specified number of symbols starting from the bottom of each column.
 * @param matrix - The symbol matrix to be reduced.
 * @returns The updated matrix with specified symbols removed.
 */

function reduceMatrix(gameInstance: SLSG, type: 'main' | 'collosal') {
    const { settings } = gameInstance;
    const matrix = settings.resultSymbolMatrix;
    const rowLength = type === 'main' ? 4 : 12;
    const newMatrix: number[][] = Array.from({ length: rowLength }, () => Array(5).fill(0));

    for (let colIndex = 0; colIndex < 5; colIndex++) {
        let columnSymbols;
        const maxRows = type === 'main' ? 3 : 4;
        const totalRows = matrix.length
        const shuffledRows = Array.from({ length: totalRows }, (_, i) => i).sort(() => Math.random() - 0.5);
        const selectedRows = shuffledRows.slice(0, maxRows);
        columnSymbols = selectedRows.map(rowIndex => matrix[rowIndex][colIndex]);
        const newColumn = generateColumn(columnSymbols, gameInstance, type);
        for (let rowIndex = 0; rowIndex < rowLength; rowIndex++) {
            newMatrix[rowIndex][colIndex] = newColumn[rowIndex];
        }
    }

        console.log(newMatrix);
    return newMatrix;
}

function generateColumn(symbols: number[], gameInstance: SLSG, type: 'main' | 'collosal'): number[] {
    const column = [];
    const availableSymbols = [...symbols];
    // console.log(availableSymbols, "avai");
    
    const columnLength = type === 'main' ? 4 : 12;
    let selectedSymbolIndex = type === 'main' ? 0 : 2;

    while (column.length < columnLength) {
        const symbolCount = getRandomValue(gameInstance, type);
        // console.log(symbolCount, "symbol counr");
        
        const selectedSymbol = availableSymbols[(selectedSymbolIndex) % availableSymbols.length];
        // console.log(selectedSymbol,);
        
        for (let i = 0; i < symbolCount && column.length < columnLength; i++) {
            column.push(selectedSymbol);            
        }
        selectedSymbolIndex+=1;

    }

    return column.slice(0, columnLength);
}



export function getRandomValue(gameInstance: SLSG, type: 'main' | 'collosal' | 'mystery' | 'moonMystery'): number {
    const { settings } = gameInstance;

    let values: number[];
    let probabilities: number[];

    // determine the values and probabilities based on the type
    if (type === 'main') {
        values = settings?.symbolsSet;
        probabilities = settings?.symbolsSetProb;
    } else if (type === 'collosal') {
        values = settings?.symbolsSetCollosal;
        probabilities = settings?.symbolsSetCollosalProb;
        // } else if (type === 'mystery') {
        //     values = settings?.mysteryValues;
        //     probabilities = settings?.mysteryValueProb;
        // } else if (type === 'moonMystery') {
        //     values = settings?.moonMysteryValues;
        //     probabilities = settings?.moonMysteryValueProb;
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
 * Prepares and sends the result data for the current game state to the client.
 * Includes game data, player data, and details of any free spins or winnings.
 * @param gameInstance - The instance of the SLSG class containing the game state and settings.
 */

export function makeResultJson(gameInstance: SLSG) {
    try {
        const { settings, playerData } = gameInstance;
        const credits = gameInstance.getPlayerData().credits + playerData.currentWining
        const Balance = credits.toFixed(2)
        const sendData = {
            GameData: {
                ResultReel: settings.resultSymbolMatrix,
                linesToEmit: settings._winData.winningLines,
                matchCountofLines: settings.matchCountOfLines,
                symbolsToEmit: settings._winData.winningSymbols,
                wildSymbolIndices: settings.replacedToWildIndices,
                isFreeSpin: settings.freeSpin.useFreeSpin,
                freeSpinCount: settings.freeSpin.freeSpinCount,
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

    } catch (error) {
        console.error("Error generating result JSON or sending message:", error);
    }
}