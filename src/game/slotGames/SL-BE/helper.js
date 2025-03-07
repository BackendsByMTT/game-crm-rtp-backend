"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeGameSettings = initializeGameSettings;
exports.generateInitialReel = generateInitialReel;
exports.makePayLines = makePayLines;
exports.checkForWin = checkForWin;
exports.sendInitData = sendInitData;
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
        Symbols: gameInstance.initSymbols,
        resultSymbolMatrix: [],
        currentGamedata: gameData.gameSettings,
        lineData: [],
        _winData: new WinData_1.WinData(gameInstance),
        currentBet: 0,
        currentLines: 0,
        BetPerLines: 0,
        reels: [],
        isLeftWinTrue: false,
        bats: {
            isEnabled: gameData.gameSettings.bats.isEnabled,
            batCount: 0,
            positions: [],
            payout: 0,
            multipliers: gameData.gameSettings.bats.multiplier
        },
        freeSpin: {
            symbolID: "-1",
            freeSpinCount: 0,
            isEnabled: gameData.gameSettings.freeSpin.isEnabled,
            countIncrement: gameData.gameSettings.freeSpin.countIncrement,
            isFreeSpin: false,
            isTriggered: false,
            bloodSplash: {
                countProb: gameData.gameSettings.freeSpin.bloodSplash.countProb
            },
            newVampHumanPositions: [],
            substitutions: {
                bloodSplash: [],
                vampHuman: []
            }
        },
        gamble: {
            isEnabled: gameData.gameSettings.gamble.isEnabled
        },
        wild: {
            SymbolName: "Wild",
            SymbolID: 15,
            multiplier: gameData.gameSettings.wild.multiplier,
        },
        vampireMan: {
            SymbolName: "",
            SymbolID: -1,
            useWild: false,
        },
        vampireWoman: {
            SymbolName: "",
            SymbolID: -1,
            useWild: false,
        },
        HumanMan: {
            SymbolName: "",
            SymbolID: -1,
            useWild: false,
        },
        HumanWoman: {
            SymbolName: "",
            SymbolID: -1,
            useWild: false,
        },
        Bat: {
            SymbolName: "",
            SymbolID: -1,
            useWild: false,
        },
        BatX2: {
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
    const reels = [[], [], [], [], [], []];
    gameSettings.Symbols.forEach((symbol) => {
        for (let i = 0; i < 6; i++) {
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
 * Shuffles the elements of an array in place using the Fisher-Yates algorithm.
 * @param array - The array to be shuffled.
 */
function makePayLines(gameInstance) {
    const { settings } = gameInstance;
    settings.currentGamedata.Symbols.forEach((element) => {
        if (!element.useWildSub) {
            handleSpecialSymbols(element, gameInstance);
        }
    });
}
function handleSpecialSymbols(symbol, gameInstance) {
    switch (symbol.Name) {
        case types_1.specialIcons.VampireMan:
            gameInstance.settings.vampireMan.SymbolName = symbol.Name;
            gameInstance.settings.vampireMan.SymbolID = symbol.Id;
            gameInstance.settings.vampireMan.useWild = false;
            break;
        case types_1.specialIcons.VampireWoman:
            gameInstance.settings.vampireWoman.SymbolName = symbol.Name;
            gameInstance.settings.vampireWoman.SymbolID = symbol.Id;
            gameInstance.settings.vampireWoman.useWild = false;
            break;
        case types_1.specialIcons.HumanMan:
            gameInstance.settings.HumanMan.SymbolName = symbol.Name;
            gameInstance.settings.HumanMan.SymbolID = symbol.Id;
            gameInstance.settings.HumanMan.useWild = false;
            break;
        case types_1.specialIcons.HumanWoman:
            gameInstance.settings.HumanWoman.SymbolName = symbol.Name;
            gameInstance.settings.HumanWoman.SymbolID = symbol.Id;
            gameInstance.settings.HumanWoman.useWild = false;
            break;
        case types_1.specialIcons.Bat:
            gameInstance.settings.Bat.SymbolName = symbol.Name;
            gameInstance.settings.Bat.SymbolID = symbol.Id;
            gameInstance.settings.Bat.useWild = false;
        case types_1.specialIcons.BatX2:
            gameInstance.settings.BatX2.SymbolName = symbol.Name;
            gameInstance.settings.BatX2.SymbolID = symbol.Id;
            gameInstance.settings.BatX2.useWild = false;
        default:
    }
}
//CHECK WINS ON PAYLINES WITH OR WITHOUT WILD
//check for win function
function checkForWin(gameInstance) {
    try {
        const { settings } = gameInstance;
        const winningLines = [];
        let totalPayout = 0;
        // TODO: handle freespin . -     1. vamphumanunion should be wild (swap resmatrix)
        //                             - 2. bloodSplash feat  (swap resmatrix)
        //                             - 3. populate freespin.wildsubbed
        if (settings.freeSpin.isFreeSpin &&
            settings.freeSpin.freeSpinCount > 0) {
            handleFreeSpin(gameInstance);
        }
        else {
            settings.freeSpin.isFreeSpin = false;
            settings.freeSpin.substitutions.vampHuman = [];
        }
        //toggling here so that we can use it for blood splash 4 or 8
        settings.freeSpin.isTriggered = false;
        settings.lineData.forEach((line, index) => {
            const firstSymbolPositionLTR = line[0];
            const firstSymbolPositionRTL = line[line.length - 1];
            // Get first symbols for both directions
            let firstSymbolLTR = settings.resultSymbolMatrix[firstSymbolPositionLTR][0];
            let firstSymbolRTL = settings.resultSymbolMatrix[firstSymbolPositionRTL][line.length - 1];
            // Handle wild symbols for both directions
            if (firstSymbolLTR === settings.wild.SymbolID) {
                firstSymbolLTR = findFirstNonWildSymbol(line, gameInstance);
            }
            if (firstSymbolRTL === settings.wild.SymbolID) {
                firstSymbolRTL = findFirstNonWildSymbol(line, gameInstance, 'RTL');
            }
            // Left-to-right check
            const LTRResult = checkLineSymbols(firstSymbolLTR, line, gameInstance, 'LTR');
            if (LTRResult.isWinningLine && LTRResult.matchCount >= 3) {
                const symbolMultiplierLTR = accessData(firstSymbolLTR, LTRResult.matchCount, gameInstance, LTRResult.isWild);
                if (symbolMultiplierLTR > 0) {
                    const payout = symbolMultiplierLTR * gameInstance.settings.BetPerLines;
                    totalPayout += payout;
                    gameInstance.playerData.currentWining += payout;
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
                        settings._winData.totalWinningAmount = totalPayout * settings.BetPerLines;
                        // console.log(settings._winData.totalWinningAmount)
                    }
                    // console.log(`Line ${index + 1} (LTR):`, line);
                    // console.log(`Payout for LTR Line ${index + 1}:`, "payout", payout);
                    return;
                }
            }
            // Right-to-left check
            const RTLResult = checkLineSymbols(firstSymbolRTL, line, gameInstance, 'RTL');
            if (RTLResult.isWinningLine && RTLResult.matchCount >= 3) {
                const symbolMultiplierRTL = accessData(firstSymbolRTL, RTLResult.matchCount, gameInstance, RTLResult.isWild);
                if (symbolMultiplierRTL > 0) {
                    const payout = symbolMultiplierRTL * gameInstance.settings.BetPerLines;
                    totalPayout += payout;
                    gameInstance.playerData.currentWining += payout;
                    settings._winData.winningLines.push(index + 1);
                    winningLines.push({
                        line,
                        symbol: firstSymbolRTL,
                        multiplier: symbolMultiplierRTL,
                        matchCount: RTLResult.matchCount,
                        direction: 'RTL'
                    });
                    const formattedIndices = RTLResult.matchedIndices.map(({ col, row }) => `${col},${row}`);
                    const validIndices = formattedIndices.filter((index) => index.length > 2);
                    if (validIndices.length > 0) {
                        // console.log(validIndices);
                        settings._winData.winningSymbols.push(validIndices);
                        settings._winData.totalWinningAmount = totalPayout * settings.BetPerLines;
                        // console.log(settings._winData.totalWinningAmount)
                    }
                    // console.log(`Line ${index + 1} (RTL):`, line);
                    // console.log(`Payout for RTL Line ${index + 1}:`, "payout", payout);
                }
            }
        });
        gameInstance.playerData.currentWining = totalPayout;
        checkforBats(gameInstance);
        gameInstance.playerData.currentWining += settings.bats.payout;
        gameInstance.updatePlayerBalance(gameInstance.playerData.currentWining);
        //decrement freespin count 
        if (settings.freeSpin.freeSpinCount > 0) {
            settings.freeSpin.freeSpinCount -= 1;
        }
        //TODO: check for freespin 
        //  1. sub blood splash back
        //    2. check if human vamp are adjacent 
        //    3. append to vampHuman
        //swap back blood splash
        if (settings.freeSpin.freeSpinCount > 0) {
            for (let i = 0; i < settings.freeSpin.substitutions.bloodSplash.length; i++) {
                const positions = settings.freeSpin.substitutions.bloodSplash[i].index;
                const symId = settings.freeSpin.substitutions.bloodSplash[i].symbolId;
                const tempId = swapPositions(settings.resultSymbolMatrix, positions, symId);
                settings.freeSpin.substitutions.bloodSplash[i].symbolId = tempId;
            }
            // console.log("after blood splash swapback", settings.resultSymbolMatrix);
        }
        const { found, positions } = checkForFreeSpin(gameInstance);
        settings.freeSpin.newVampHumanPositions.push(...positions);
        if (found) {
            settings.freeSpin.isTriggered = true;
            settings.freeSpin.isFreeSpin = true;
            settings.freeSpin.freeSpinCount += settings.freeSpin.countIncrement;
            //append to vampHuman
            settings.freeSpin.substitutions.vampHuman.push(...positions);
        }
        // Log and update game state after all lines are checked
        // console.log("Total Winning", gameInstance.playerData.currentWining);
        // console.log("Total Free Spins Won:", gameInstance.settings.freeSpin.freeSpinCount);
        // console.log("freespin", settings.freeSpin);
        gameInstance.playerData.haveWon += gameInstance.playerData.currentWining;
        makeResultJson(gameInstance);
        settings.freeSpin.substitutions.bloodSplash = [];
        settings._winData.winningLines = [];
        settings._winData.winningSymbols = [];
        settings.bats.positions = [];
        settings.bats.payout = 0;
        settings.freeSpin.newVampHumanPositions = [];
        return winningLines;
    }
    catch (error) {
        console.error("Error in checkForWin:", error);
        return [];
    }
}
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
function checkforBats(gameInstance) {
    try {
        const { settings } = gameInstance;
        let batsCount = 0;
        // Count bats and store positions
        settings.resultSymbolMatrix.forEach((row, i) => {
            row.forEach((symbol, j) => {
                if (symbol == settings.Bat.SymbolID.toString() || symbol == settings.BatX2.SymbolID.toString()) {
                    settings.bats.positions.push(`${j},${i}`);
                    batsCount += symbol == settings.BatX2.SymbolID.toString() ? 2 : 1;
                }
            });
        });
        // Apply multiplier based on bat count
        // If batsCount is 1, use multiplier[12]
        // If batsCount is 13, use multiplier[0]
        let multiplierIndex = Math.max(0, settings.bats.multipliers.length - batsCount);
        if (batsCount === 0) {
            multiplierIndex = settings.bats.multipliers.length - 1;
        }
        settings.bats.payout += settings.BetPerLines * settings.bats.multipliers[multiplierIndex];
        // console.log("Bats Count:", batsCount);
        // console.log("Applied Multiplier:", settings.bats.multipliers[multiplierIndex]);
    }
    catch (e) {
        console.error("Error in checkforBats:", e);
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
function accessData(symbol, matchCount, gameInstance, isWild) {
    const { settings } = gameInstance;
    try {
        if (isWild) {
            return settings.wild.multiplier[matchCount - 3];
        }
        const symbolData = settings.currentGamedata.Symbols.find((s) => s.Id.toString() === symbol.toString());
        if (symbolData) {
            const multiplierArray = symbolData.multiplier;
            if (multiplierArray && multiplierArray[settings.matrix.x - matchCount]) {
                return multiplierArray[settings.matrix.x - matchCount][0];
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
 * Sends the initial game and player data to the client.
 * @param gameInstance - The instance of the SLCM class containing the game settings and player data.
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
            Lines: gameInstance.settings.currentGamedata.linesApiData,
            Bets: gameInstance.settings.currentGamedata.bets,
            BatsMultiplier: gameInstance.settings.bats.multipliers,
            wildMultiplier: gameInstance.settings.wild.multiplier,
            freeSpinIncrementCount: gameInstance.settings.freeSpin.freeSpinCount
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
// for swapping vampHuman and bloodSplash
function swapPositions(matrix, position, swapValue) {
    try {
        const [row, col] = position.split(',').map(Number);
        // Swap the value at the position with the provided swapValue
        const temp = matrix[row][col];
        matrix[row][col] = Number(swapValue);
        return temp;
    }
    catch (e) {
        console.log("error in swapPositions", e);
    }
}
//for blood splash countProb
function getRandomFromProbability(probArray) {
    try {
        const totalProb = probArray.reduce((sum, p) => sum + p, 0);
        const randValue = Math.random() * totalProb;
        let cumulativeProb = 0;
        for (let i = 0; i < probArray.length; i++) {
            cumulativeProb += probArray[i];
            if (randValue <= cumulativeProb) {
                return i + 1;
            }
        }
        return probArray.length;
    }
    catch (e) {
        console.log("error in getRandomFromProbability", e);
    }
}
function checkForFreeSpin(gameInstance) {
    var _a;
    try {
        if (!((_a = gameInstance === null || gameInstance === void 0 ? void 0 : gameInstance.settings) === null || _a === void 0 ? void 0 : _a.resultSymbolMatrix)) {
            console.error("Invalid game instance or missing matrix");
            return { found: false, positions: [] };
        }
        const symbols = {
            vampireMan: gameInstance.settings.vampireMan.SymbolID, //11
            vampireWoman: gameInstance.settings.vampireWoman.SymbolID, // "12"
            humanMan: gameInstance.settings.HumanMan.SymbolID, // "13"
            humanWoman: gameInstance.settings.HumanWoman.SymbolID // "14"
        };
        const matrix = gameInstance.settings.resultSymbolMatrix;
        const positions = [];
        // Check horizontal and vertical combinations
        for (let row = 0; row < matrix.length; row++) {
            for (let col = 0; col < matrix[row].length; col++) {
                const currentSymbol = matrix[row][col];
                // Horizontal check (right)
                if (col + 1 < matrix[row].length) {
                    const rightSymbol = matrix[row][col + 1];
                    // Check Vampire Man + Human Woman
                    if (currentSymbol === symbols.vampireMan && rightSymbol === symbols.humanWoman) {
                        positions.push([`${row},${col}`, `${row},${col + 1}`]);
                    }
                    // Check Human Man + Vampire Woman
                    if (currentSymbol === symbols.humanMan && rightSymbol === symbols.vampireWoman) {
                        positions.push([`${row},${col}`, `${row},${col + 1}`]);
                    }
                }
                // Vertical check (down)
                if (row + 1 < matrix.length) {
                    const bottomSymbol = matrix[row + 1][col];
                    // Check Vampire Man + Human Woman
                    if (currentSymbol === symbols.vampireMan && bottomSymbol === symbols.humanWoman) {
                        positions.push([`${row},${col}`, `${row + 1},${col}`]);
                    }
                    // Check Human Man + Vampire Woman
                    if (currentSymbol === symbols.humanMan && bottomSymbol === symbols.vampireWoman) {
                        positions.push([`${row},${col}`, `${row + 1},${col}`]);
                    }
                }
            }
        }
        return {
            found: positions.length > 0,
            positions
        };
    }
    catch (error) {
        console.error("Error in checkForFreeSpin:", error);
        return { found: false, positions: [] };
    }
}
function handleFreeSpin(gameInstance) {
    try {
        const { settings } = gameInstance;
        // vampHuman positions 
        const vampireHumanPositions = settings.freeSpin.substitutions.vampHuman.flatMap((item) => item);
        // console.log("vampireHumanPositions", vampireHumanPositions);
        //swap positions in vampHuman with wild 
        vampireHumanPositions.forEach((position) => {
            swapPositions(settings.resultSymbolMatrix, position, settings.wild.SymbolID.toString());
        });
        // console.log("after vh swap", settings.resultSymbolMatrix);
        //bloodSplash swap , if vamp human union found can get upto 8 slpashes or 4 splashes if not
        const splashes = getRandomFromProbability(settings.freeSpin.isTriggered ?
            settings.freeSpin.bloodSplash.countProb :
            settings.freeSpin.bloodSplash.countProb.slice(0, 2));
        // console.log("bloodSplash", splashes);
        //now we need to swap random positions in matrix with wild other than the ones that are already wild 
        const positions = getNRandomEmptyPositions(settings.resultSymbolMatrix, [
            settings.wild.SymbolID.toString(),
            settings.HumanMan.SymbolID.toString(),
            settings.HumanWoman.SymbolID.toString(),
            settings.vampireMan.SymbolID.toString(),
            settings.vampireWoman.SymbolID.toString()
        ], splashes);
        // console.log("splash positions", positions);
        for (let i = 0; i < splashes; i++) {
            const symId = swapPositions(settings.resultSymbolMatrix, `${positions[i].row},${positions[i].col}`, settings.wild.SymbolID.toString());
            settings.freeSpin.substitutions.bloodSplash.push({
                index: `${positions[i].row},${positions[i].col}`,
                symbolId: symId
            });
        }
        // console.log("after bs swap", settings.resultSymbolMatrix);
        // console.log("splash ", settings.freeSpin.substitutions.bloodSplash);
    }
    catch (e) {
        console.log("Error in handleFreeSpin", e);
    }
}
function getRandomEmptyPositions(matrix, symbolIds) {
    try {
        // Get all empty positions
        const emptyPositions = [];
        // Collect all positions that don't have any of the symbolIds
        for (let row = 0; row < matrix.length; row++) {
            for (let col = 0; col < matrix[row].length; col++) {
                // Check if current position doesn't contain any of the symbolIds
                if (!symbolIds.includes(matrix[row][col].toString())) {
                    emptyPositions.push({ row, col });
                }
            }
        }
        // Shuffle the empty positions array using Fisher-Yates algorithm
        for (let i = emptyPositions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [emptyPositions[i], emptyPositions[j]] = [emptyPositions[j], emptyPositions[i]];
        }
        return emptyPositions;
    }
    catch (e) {
        console.log("error in getRandomEmptyPositions", e);
        return []; // Return empty array in case of error
    }
}
// Helper function to get a single random empty position
function getRandomEmptyPosition(matrix, symbolIds) {
    const emptyPositions = getRandomEmptyPositions(matrix, symbolIds);
    return emptyPositions.length > 0 ? emptyPositions[0] : null;
}
// Helper function to get N random empty positions
function getNRandomEmptyPositions(matrix, symbolIds, count) {
    const emptyPositions = getRandomEmptyPositions(matrix, symbolIds);
    return emptyPositions.slice(0, count);
}
function makeResultJson(gameInstance) {
    try {
        const { settings, playerData } = gameInstance;
        const credits = gameInstance.getPlayerData().credits;
        // const Balance = credits.toFixed(2)
        const Balance = credits;
        const sendData = {
            GameData: {
                ResultReel: settings.resultSymbolMatrix,
                linesToEmit: settings._winData.winningLines,
                symbolsToEmit: settings._winData.winningSymbols,
                isFreeSpin: settings.freeSpin.isTriggered,
                count: settings.freeSpin.freeSpinCount,
                vampHuman: settings.freeSpin.newVampHumanPositions.flatMap((item) => item),
                bloodSplash: settings.freeSpin.substitutions.bloodSplash.flatMap((item) => item.index),
                batPositions: settings.bats.payout > 0 ? settings.bats.positions : [],
                batPayout: settings.bats.payout
            },
            PlayerData: {
                Balance: Balance,
                currentWining: playerData.currentWining,
                totalbet: playerData.totalbet,
                haveWon: playerData.haveWon,
            }
        };
        // console.log("sendData", sendData);
        // console.log("_winData lines", settings._winData.winningLines);
        // console.log("_winData symbols", settings._winData.winningSymbols);
        // console.log("res", settings.resultSymbolMatrix);
        gameInstance.sendMessage('ResultData', sendData);
    }
    catch (error) {
        console.error("Error generating result JSON or sending message:", error);
    }
}
