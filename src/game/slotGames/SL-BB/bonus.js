"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RandomBonusGenerator = void 0;
exports.checkForBonus = checkForBonus;
exports.handleBonusSpin = handleBonusSpin;
const gameUtils_1 = require("../../Utils/gameUtils");
const helper_1 = require("./helper");
class RandomBonusGenerator {
    constructor(current) {
        let matrix = [];
        let ccIndices = current.settings.cashCollect.values.map(cc => `${cc.index[0]},${cc.index[1]}`);
        let coinIndices = current.settings.coins.bonusValues.map(cc => `${cc.index[0]},${cc.index[1]}`);
        // console.log("ccIndices", ccIndices);
        // console.log("coinIndices", coinIndices);
        for (let x = 0; x < current.settings.currentGamedata.matrix.x; x++) {
            const startPosition = this.getRandomIndex((current.settings.bonusReels[x].length - 1));
            for (let y = 0; y < current.settings.currentGamedata.matrix.y; y++) {
                if (!matrix[y])
                    matrix[y] = [];
                matrix[y][x] = current.settings.bonusReels[x][(startPosition + y) % current.settings.bonusReels[x].length];
                //TODO: freeze cc and coin positions 
                if (ccIndices.includes(`${y},${x}`)) {
                    matrix[y][x] = current.settings.cashCollect.SymbolID.toString();
                }
                if (coinIndices.includes(`${y},${x}`)) {
                    matrix[y][x] = current.settings.coins.SymbolID.toString();
                }
            }
        }
        // matrix.pop();
        // matrix.pop();
        // matrix.pop();
        // matrix.push(['10', '6', '10', '0', '4','6'])
        // matrix.push(['1', '11', '14', '10', '1','6'])
        // matrix.push(['5', '8', '1', '5', '1','6'])
        // console.log("bonus matrix");
        // matrix.forEach(row => console.log(row.join(' ')));
        // current.settings.resultReelIndex = matrix;
        current.settings.bonusResultMatrix = matrix;
    }
    getRandomIndex(maxValue) {
        let seed = Date.now() + Math.random() * 1000;
        // return Math.floor(generateRandomNumber(seed, (maxValue + 1)));
        return Math.floor((0, gameUtils_1.generatetrueRandomNumber)(maxValue + 1));
    }
}
exports.RandomBonusGenerator = RandomBonusGenerator;
function checkForBonus(gameInstance, hasCC, hasL, hasML) {
    const { settings } = gameInstance;
    if (hasCC && (hasL || hasML)) {
        settings.bonus.isTriggered = true;
        settings.bonus.isBonus = true;
        settings.bonus.count = 3;
        //NOTE: add rtpcount 
        //
        //TODO: also init bonus 
        // 1. set coins and cc to []
        // 2. freeze cc and swapped coins at link
        if (hasML) {
            settings.bonus.isMegaLink = true;
        }
        settings.cashCollect.values = [];
        settings.resultSymbolMatrix.forEach((row, i) => {
            row.forEach((symbol, j) => {
                //check if cc already exists
                const ccIndices = settings.cashCollect.values.map(cc => `${cc.index[0]},${cc.index[1]}`);
                if (symbol == settings.cashCollect.SymbolID.toString()) {
                    if (!ccIndices.includes(`${i},${j}`)) {
                        settings.cashCollect.values.push({
                            index: [i, j],
                            value: -1
                        });
                    }
                }
                else if (symbol == settings.link.SymbolID.toString() || symbol == settings.megalink.SymbolID.toString()) {
                    settings.coins.bonusValues.push({
                        index: [i, j],
                        value: (0, helper_1.getRandomValue)(gameInstance, "coin")
                    });
                }
            });
        });
        // console.log("bonus coins",settings.coins.bonusValues);
        // console.log("cc",settings.cashCollect.values);
        return true;
    }
    return false;
}
function handleBonusSpin(gameInstance) {
    const { settings } = gameInstance;
    //TODO: 
    //      1. generate bonus matrix 
    //      2. put frozen cc and link(to be swapped with coin) in bonus matrix
    //      3. check and freeze cc and coins 
    //      4. decrement count if there are no new coins 
    //      5. calculate payout
    //      6. also check if all are filled 
    settings.bonus.isTriggered = false;
    let isWalterStash = true;
    const coinType = settings.bonus.isMegaLink ? "mega" : "coin";
    //1. 2.
    new RandomBonusGenerator(gameInstance);
    //3.
    for (let i = 0; i < settings.bonusResultMatrix.length; i++) {
        for (let j = 0; j < settings.bonusResultMatrix[i].length; j++) {
            if (settings.bonusResultMatrix[i][j] == settings.cashCollect.SymbolID.toString()) {
                const ccIndices = settings.cashCollect.values.map(cc => `${cc.index[0]},${cc.index[1]}`);
                if (!ccIndices.includes(`${i},${j}`)) {
                    settings.cashCollect.values.push({
                        index: [i, j],
                        value: -1
                    });
                }
            }
            if (settings.bonusResultMatrix[i][j] == settings.link.SymbolID.toString() || settings.bonusResultMatrix[i][j] == settings.megalink.SymbolID.toString()) {
                settings.coins.bonusValues.push({
                    index: [i, j],
                    value: (0, helper_1.getRandomValue)(gameInstance, coinType)
                });
            }
            if (settings.blanks.includes(settings.bonusResultMatrix[i][j].toString())) {
                isWalterStash = false;
            }
        }
    }
    //4.
    settings.bonus.count -= 1;
    //5. 
    (0, helper_1.getCoinsValues)(gameInstance, coinType === "mega" ? "mega" : "bonus");
    if (isWalterStash) {
        settings.bonus.isWalterStash = true;
        settings.bonus.payout += settings.jackpot.payout[0] * settings.BetPerLines;
        settings.bonus.count = 0;
    }
    if (settings.bonus.count == 0) {
        const bonusPayout = (0, helper_1.handleCoinsAndCashCollect)(gameInstance, "bonus");
        settings.bonus.payout += bonusPayout;
    }
}
