"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeGameSettings = initializeGameSettings;
exports.makePayLines = makePayLines;
exports.generateInitialReel = generateInitialReel;
exports.generateInitialBonusReel = generateInitialBonusReel;
exports.sendInitData = sendInitData;
exports.getCoinsValues = getCoinsValues;
exports.checkForWin = checkForWin;
exports.makeResultJson = makeResultJson;
const WinData_1 = require("../BaseSlotGame/WinData");
const gameUtils_1 = require("../../Utils/gameUtils");
const types_1 = require("./types");
const bonus_1 = require("./bonus");
function initializeGameSettings(gameData, gameInstance) {
    // const getSymbolIdByName = (name: string) => {
    //   const symbol = gameData.gameSettings.Symbols.find((s: any) => s.Name === name);
    //   return symbol ? symbol.Id : -1;
    // };
    return {
        id: gameData.gameSettings.id,
        matrix: gameData.gameSettings.matrix,
        bets: gameData.gameSettings.bets,
        Symbols: gameInstance.initSymbols,
        resultSymbolMatrix: [],
        bonusResultMatrix: [],
        currentGamedata: gameData.gameSettings,
        lineData: gameData.gameSettings.linesApiData,
        _winData: new WinData_1.WinData(gameInstance),
        currentBet: 0,
        currentLines: 0,
        BetPerLines: 0,
        reels: [],
        bonusReels: [],
        jackpot: {
            isTriggered: false,
            payout: 0,
        },
        grandPrize: {
            isTriggered: false,
            payout: 0
        },
        isCashCollect: false,
        freeSpin: {
            isEnabled: gameData.gameSettings.freeSpin.isEnabled,
            isTriggered: false,
            isFreeSpin: false,
            cashCollectValues: [],
            count: 0,
            LPValues: gameData.gameSettings.freeSpin.LPValues,
            LPProbs: gameData.gameSettings.freeSpin.LPProbs,
        },
        wild: {
            SymbolName: "Wild",
            SymbolID: "-1",
            useWild: false,
        },
        link: {
            SymbolName: "Link",
            SymbolID: "-1",
            useWild: false,
        },
        megalink: {
            SymbolName: "MegaLink",
            SymbolID: "-1",
            useWild: false,
        },
        cashCollect: {
            SymbolName: "CashCollect",
            SymbolID: "-1",
            useWild: false,
        },
        coins: {
            SymbolName: "Coins",
            SymbolID: "-1",
            useWild: false,
            values: []
        },
        prizeCoin: {
            SymbolName: "PrizeCoin",
            SymbolID: "-1",
            useWild: false,
        },
        losPollos: {
            SymbolName: "LosPollos",
            SymbolID: "-1",
            useWild: false,
            values: []
        },
        bonus: {
            isBonus: false,
            isTriggered: false,
            count: 0,
            payout: 0,
        },
        cashCollectPrize: {
            isTriggered: false,
            payout: 0
        }
    };
}
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
        case types_1.specialIcons.wild:
            gameInstance.settings.wild.SymbolName = symbol.Name;
            gameInstance.settings.wild.SymbolID = symbol.Id;
            gameInstance.settings.wild.useWild = false;
            break;
        case types_1.specialIcons.losPollos:
            gameInstance.settings.losPollos.SymbolName = symbol.Name;
            gameInstance.settings.losPollos.SymbolID = symbol.Id;
            gameInstance.settings.losPollos.useWild = false;
            break;
        case types_1.specialIcons.coins:
            gameInstance.settings.coins.SymbolName = symbol.Name;
            gameInstance.settings.coins.SymbolID = symbol.Id;
            gameInstance.settings.coins.useWild = false;
            break;
        case types_1.specialIcons.link:
            gameInstance.settings.link.SymbolName = symbol.Name;
            gameInstance.settings.link.SymbolID = symbol.Id;
            gameInstance.settings.link.useWild = false;
            break;
        case types_1.specialIcons.megalink:
            gameInstance.settings.megalink.SymbolName = symbol.Name;
            gameInstance.settings.megalink.SymbolID = symbol.Id;
            gameInstance.settings.megalink.useWild = false;
            break;
        case types_1.specialIcons.prizeCoin:
            gameInstance.settings.prizeCoin.SymbolName = symbol.Name;
            gameInstance.settings.prizeCoin.SymbolID = symbol.Id;
            gameInstance.settings.prizeCoin.useWild = false;
            break;
        case types_1.specialIcons.cashCollect:
            gameInstance.settings.cashCollect.SymbolName = symbol.Name;
            gameInstance.settings.cashCollect.SymbolID = symbol.Id;
            gameInstance.settings.cashCollect.useWild = false;
            break;
        default:
    }
}
function generateInitialReel(gameSettings) {
    const reels = [[], [], [], [], []];
    const validSymbols = gameSettings.Symbols.filter(symbol => !symbol.useHeisenberg || symbol.Name === "CashCollect" || symbol.Name === "Coins");
    validSymbols.forEach(symbol => {
        for (let i = 0; i < 5; i++) {
            const count = symbol.reelInstance[i] || 0;
            for (let j = 0; j < count; j++) {
                reels[i].push(symbol.Id);
            }
        }
    });
    // Shuffle each reel
    reels.forEach(reel => {
        shuffleArray(reel);
    });
    gameSettings.reels = reels;
    return reels;
}
//GENERATE INITIAL HEISENBERG REEL
function generateInitialBonusReel(gameSettings) {
    const reels = [[], [], [], [], []];
    const bonusSymbols = gameSettings.Symbols.filter(symbol => symbol.useHeisenberg);
    bonusSymbols.forEach(symbol => {
        for (let i = 0; i < 5; i++) {
            const count = symbol.reelInstance[i] || 0;
            for (let j = 0; j < count; j++) {
                reels[i].push(symbol.Id);
            }
        }
    });
    reels.forEach(reel => {
        shuffleArray(reel);
    });
    gameSettings.bonusReels = reels;
    return reels;
}
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
function sendInitData(gameInstance) {
    gameUtils_1.UiInitData.paylines = (0, gameUtils_1.convertSymbols)(gameInstance.settings.Symbols);
    const credits = gameInstance.getPlayerData().credits;
    const Balance = credits.toFixed(2);
    // const reels = generateInitialReel(gameInstance.settings);
    // const heisenbergReels = generateInitialBonusReel(gameInstance.settings);
    // gameInstance.settings.reels = reels;
    // gameInstance.settings.bonusReels = heisenbergReels;
    const dataToSend = {
        GameData: {
            Reel: gameInstance.settings.reels,
            BonusReel: gameInstance.settings.bonusReels,
            Lines: gameInstance.currentGameData.gameSettings.linesApiData,
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
function getRandomValue(gameInstance, type) {
    const { currentGameData } = gameInstance;
    let values;
    let probabilities;
    if (type === 'coin') {
        values = currentGameData.gameSettings.coinsvalue;
        probabilities = currentGameData.gameSettings.coinsvalueprob;
    }
    else if (type === 'freespin') {
        values = currentGameData.gameSettings.freeSpin.LPValues;
        probabilities = currentGameData.gameSettings.freeSpin.LPProbs;
    }
    else if (type === 'prizes') {
        values = currentGameData.gameSettings.prizes;
        probabilities = currentGameData.gameSettings.prizesProbs;
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
// Function to set "Coins" symbols with their respective values
function getCoinsValues(gameInstance, matrixType) {
    const { settings } = gameInstance;
    const matrix = matrixType === 'result'
        ? settings.resultSymbolMatrix
        : settings.bonusResultMatrix;
    for (let row = 0; row < matrix.length; row++) {
        for (let col = 0; col < matrix[row].length; col++) {
            const symbol = matrix[row][col];
            if (symbol == settings.coins.SymbolID.toString()) {
                const coinValue = getRandomValue(gameInstance, "coin");
                // Check if index already exists in settings.coins.values
                const indexExists = settings.coins.values.find(item => item.index[0] === row && item.index[1] === col);
                // Only add the new value if the index does not already exist
                if (!indexExists) {
                    settings.coins.values.push({ index: [row, col], value: coinValue });
                }
            }
        }
    }
}
//COINS +CASH COLLECT ON 0 OR 4 -> triggers coin collection with cash collect
function handleCoinsAndCashCollect(gameInstance, matrixType) {
    const { settings } = gameInstance;
    settings.isCashCollect = true;
    let totalCoinValue = 0;
    let cashCollectCount = 0;
    const cashCollectSymbolId = settings.cashCollect.SymbolID;
    const coinSymbolId = settings.coins.SymbolID;
    let hasCoinSymbols;
    if (matrixType == 'heisenberg') {
        hasCoinSymbols = hasSymbolInMatrix(settings.bonusResultMatrix, coinSymbolId.toString());
        //handle cc count 
        for (let i = 0; i < settings.bonusResultMatrix.length; i++) {
            for (let j = 0; j < settings.bonusResultMatrix[i].length; j++) {
                if (settings.bonusResultMatrix[i][j] == cashCollectSymbolId.toString()) {
                    cashCollectCount++;
                }
            }
        }
    }
    else if (matrixType == 'result') {
        hasCoinSymbols = hasSymbolInMatrix(settings.resultSymbolMatrix, coinSymbolId.toString());
        //handle cc count 
        if (hasSymbolInMatrix(settings.resultSymbolMatrix, cashCollectSymbolId.toString())) {
            for (let i = 0; i < settings.resultSymbolMatrix.length; i++) {
                for (let j of [0, 4]) {
                    if (settings.resultSymbolMatrix[i][j] == cashCollectSymbolId.toString()) {
                        cashCollectCount++;
                    }
                }
            }
        }
    }
    if (settings.coins.values.length > 0) {
        const coinValue = settings.coins.values.reduce((total, coin) => total + coin.value, 0);
        totalCoinValue += coinValue;
    }
    if (cashCollectCount > 0) {
        totalCoinValue *= cashCollectCount;
        return totalCoinValue;
    }
    return 0;
}
//NOTE: lp freespin
function handleFreeSpin(hasLP, hasCC, gameInstance) {
    const { settings } = gameInstance;
    if (hasLP && hasCC) {
        settings.losPollos.values = [];
        const matrix = settings.resultSymbolMatrix;
        for (let row = 0; row < matrix.length; row++) {
            for (let col = 0; col < matrix[row].length; col++) {
                const losPollosValue = getRandomValue(gameInstance, "freespin");
                const symbol = matrix[row][col];
                if (symbol === settings.losPollos.SymbolID) {
                    settings.losPollos.values.push({ index: [row, col], value: losPollosValue });
                }
            }
        }
        let count = 0;
        settings.losPollos.values.map((value) => {
            count += value.value;
        });
        if (count > 0) {
            settings.freeSpin.isTriggered = true;
        }
        settings.freeSpin.isFreeSpin = true;
        settings.freeSpin.count += count;
    }
}
//ACCESS DATA
function accessData(symbol, matchCount, gameInstance) {
    const { settings } = gameInstance;
    try {
        const symbolData = settings.Symbols.find((s) => s.Id.toString() === symbol.toString());
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
//HAS SYMBOL IN MATRIX
function hasSymbolInMatrix(matrix, symbolId) {
    return matrix.some(row => row.find(symbol => symbol == symbolId));
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
        // console.error("Error in findFirstNonWildSymbol:");
        return null;
    }
}
//NOTE: 
//TO CALCUALTE AND CHECK WINNINGS
function checkForWin(gameInstance) {
    try {
        let coinWins = 0;
        let totalWin = 0;
        // let winningLines: number[] = [];
        const { settings, currentGameData } = gameInstance;
        settings.isCashCollect = false;
        // if (settings.heisenberg.isTriggered) {
        //   handleHeisenbergSpin(gameInstance)
        // }
        const coinSymbolId = settings.coins.SymbolID;
        const cashCollectId = settings.cashCollect.SymbolID;
        const linkSymbolId = settings.link.SymbolID;
        const megaLinkSymbolId = settings.megalink.SymbolID;
        const losPollosId = settings.losPollos.SymbolID;
        const prizeCoinId = settings.prizeCoin.SymbolID;
        const linesApiData = currentGameData.gameSettings.linesApiData;
        const resultSymbolMatrix = settings.resultSymbolMatrix;
        const hasCoinSymbols = hasSymbolInMatrix(resultSymbolMatrix, coinSymbolId);
        const hasCashCollect = hasSymbolInMatrix(resultSymbolMatrix, cashCollectId);
        const hasLinkSymbols = hasSymbolInMatrix(resultSymbolMatrix, linkSymbolId);
        const hasMegaLinkSymbols = hasSymbolInMatrix(resultSymbolMatrix, megaLinkSymbolId);
        const hasLosPollosSymbols = hasSymbolInMatrix(resultSymbolMatrix, losPollosId);
        const hasPrizeCoinSymbols = hasSymbolInMatrix(resultSymbolMatrix, prizeCoinId);
        console.log("Result Matrix", gameInstance.settings.resultSymbolMatrix);
        //NOTE: freespin lp
        settings.freeSpin.isTriggered = false;
        // if()
        if (settings.bonus.count > 0) {
            // handleBonusSpin(gameInstance)
        }
        else {
            if (hasCoinSymbols) {
                getCoinsValues(gameInstance, 'result');
            }
            settings.lineData.forEach((line, index) => {
                const firstSymbolPosition = line[0];
                let firstSymbol = settings.resultSymbolMatrix[firstSymbolPosition][0];
                if (settings.wild.useWild && firstSymbol == settings.wild.SymbolID.toString()) {
                    firstSymbol = findFirstNonWildSymbol(line, gameInstance);
                }
                const { isWinningLine, matchCount, matchedIndices } = checkLineSymbols(firstSymbol, line, gameInstance);
                if (isWinningLine && matchCount >= 3) {
                    const symbolMultiplier = accessData(firstSymbol, matchCount, gameInstance);
                    console.log(matchedIndices);
                    if (symbolMultiplier > 0) {
                        totalWin += symbolMultiplier * settings.BetPerLines;
                        settings._winData.winningLines.push(index);
                        console.log(`Line ${index + 1}:`, line);
                        console.log(`Payout multiplier for Line ${index + 1}:`, 'payout', symbolMultiplier);
                        const formattedIndices = matchedIndices.map(({ col, row }) => `${col},${row}`);
                        const validIndices = formattedIndices.filter(index => index.length > 2);
                        if (validIndices.length > 0) {
                            settings._winData.winningSymbols.push(validIndices);
                        }
                    }
                }
            });
            console.log(totalWin, "Total win before coins ");
            if (hasCoinSymbols && hasCashCollect && !settings.bonus.isTriggered) {
                coinWins = handleCoinsAndCashCollect(gameInstance, "result");
                console.log(coinWins, "coin collected");
                totalWin += coinWins;
            }
            if (settings.bonus.isTriggered) {
                totalWin += settings.bonus.payout;
                settings.bonus.payout = 0;
            }
        }
        //TODO: bonus check
        (0, bonus_1.checkForBonus)(gameInstance, hasCashCollect, hasLinkSymbols, hasMegaLinkSymbols);
        //TODO: freespin check 
        handleFreeSpin(hasLosPollosSymbols, hasCashCollect, gameInstance);
        gameInstance.playerData.currentWining = totalWin;
        gameInstance.playerData.haveWon += totalWin;
        makeResultJson(gameInstance);
        gameInstance.incrementPlayerBalance(gameInstance.playerData.currentWining);
        settings._winData.winningLines = [];
        settings._winData.winningSymbols = [];
        settings.losPollos.values = [];
        settings.coins.values = [];
        gameInstance.playerData.currentWining = 0;
        settings._winData.winningLines = [];
    }
    catch (error) {
        console.error("Error in checkForWin", error);
        return {
            totalWin: 0,
            winningLines: [],
        };
    }
}
//checking matching lines with first symbol and wild subs
function checkLineSymbols(firstSymbol, line, gameInstance) {
    try {
        const { settings } = gameInstance;
        const wildSymbol = settings.wild.SymbolID.toString() || "";
        let matchCount = 1;
        let currentSymbol = firstSymbol;
        const matchedIndices = [{ col: 0, row: line[0] }];
        for (let i = 1; i < line.length; i++) {
            const rowIndex = line[i];
            const symbol = settings.resultSymbolMatrix[rowIndex][i];
            if (symbol == undefined) {
                console.error(`Symbol at position [${rowIndex}, ${i}] is undefined.`);
                return { isWinningLine: false, matchCount: 0, matchedIndices: [] };
            }
            // if (i === 1 && currentSymbol !== wildSymbol) {
            //     break;
            // }
            if (symbol == currentSymbol || symbol == wildSymbol) {
                matchCount++;
                matchedIndices.push({ col: i, row: rowIndex });
            }
            else if (currentSymbol == wildSymbol) {
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
        console.error('Error in checkLineSymbols:', error);
        return { isWinningLine: false, matchCount: 0, matchedIndices: [] };
    }
}
function makeResultJson(gameInstance) {
    try {
        const { settings, playerData } = gameInstance;
        const credits = gameInstance.getPlayerData().credits + playerData.currentWining;
        const Balance = Number(credits.toFixed(2));
        const sendData = {
            GameData: {
                ResultReel: settings.resultSymbolMatrix,
                // isFreeSpin: settings.freeSpin.isTriggered,
                // freeSpinCount: settings.freeSpin.freeSpinCount,
                linesToEmit: settings._winData.winningLines,
                symbolsToEmit: settings._winData.winningSymbols,
                WinAmount: gameInstance.playerData.currentWining,
                freeSpins: {
                    count: settings.freeSpin.count,
                    isNewAdded: settings.freeSpin.isTriggered
                },
                winData: {
                    coinValues: settings.coins.values,
                    losPollos: settings.losPollos.values
                },
                // isCashCollect: settings.isCashCollect,
                jackpot: settings.jackpot.payout,
                // bonus: {
                //   isBonus: settings.heisenberg.isTriggered,
                //   BonusResult: settings.heisenbergSymbolMatrix.map(row => row.map(item => Number(item))),
                //   payout: settings.heisenberg.payout,
                //   spinCount: settings.heisenberg.freeSpin.noOfFreeSpins,
                //   freeSpinAdded: settings.heisenberg.freeSpin.freeSpinsAdded,
                //   isWalterStash: settings.jackpot.isTriggered,
                //   walterStashPayout: settings.jackpot.payout,
                //   isGrandPrize: settings.grandPrize.isTriggered,
                //   grandPrizePayout: settings.grandPrize.payout,
                //   freezeIndices: Array.from(settings.heisenbergFreeze, item =>
                //     item.split(',').map(Number)
                //   ),
                // },
            },
            PlayerData: {
                Balance: Balance,
                currentWining: playerData.currentWining,
                totalbet: playerData.totalbet,
                haveWon: playerData.haveWon,
            }
        };
        //FIX: remove logs
        // console.log("losPollosValues", settings.losPollos.values);
        // console.log("coins", settings.coins.values);
        // console.log("linestoemit", settings._winData.winningLines);
        // console.log("symtoemit", settings._winData.winningSymbols);
        gameInstance.sendMessage('ResultData', sendData);
        console.log(sendData);
        console.log("coins", sendData.GameData.winData.coinValues);
        console.log("lp", sendData.GameData.winData.losPollos);
        console.log("symbolsToEmit", sendData.GameData.symbolsToEmit);
    }
    catch (error) {
        console.error("Error generating result JSON or sending message:", error);
    }
}
