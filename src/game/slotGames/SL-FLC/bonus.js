"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RandomBonusGenerator = void 0;
exports.generateBonusReel = generateBonusReel;
exports.populateScatterValues = populateScatterValues;
exports.checkForBonus = checkForBonus;
exports.shiftScatterValues = shiftScatterValues;
exports.handleBonusSpin = handleBonusSpin;
exports.rowsOnExpand = rowsOnExpand;
exports.collectScatter = collectScatter;
const gameUtils_1 = require("../../Utils/gameUtils");
const helper_1 = require("./helper");
class RandomBonusGenerator {
    constructor(current) {
        let matrix = [];
        let scatterIndices = current.settings.scatter.values.map(sc => `${sc.index[0]},${sc.index[1]}`);
        // let coinIndices = current.settings.coins.bonusValues.map(cc => `${cc.index[0]},${cc.index[1]}`);
        // console.log("ccIndices", ccIndices);
        // console.log("coinIndices", coinIndices);
        for (let x = 0; x < current.settings.matrix.x; x++) {
            const startPosition = this.getRandomIndex((current.settings.bonusReels[x].length - 1));
            for (let y = 0; y < current.settings.matrix.y; y++) {
                if (!matrix[y])
                    matrix[y] = [];
                matrix[y][x] = current.settings.bonusReels[x][(startPosition + y) % current.settings.bonusReels[x].length];
                // TODO: freeze sc  positions 
                if (scatterIndices.includes(`${y},${x}`)) {
                    matrix[y][x] = current.settings.scatter.SymbolID;
                }
            }
        }
        // matrix.pop();
        // matrix.pop();
        // matrix.pop();
        // matrix.push(['10', '6', '10', '0', '4','6'])
        // matrix.push(['1', '11', '14', '10', '1','6'])
        // matrix.push(['5', '8', '1', '5', '1','6'])
        console.log("bonus matrix");
        console.log(matrix);
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
function generateBonusReel(gameSettings) {
    const reels = [[], [], [], [], []];
    gameSettings.Symbols.forEach((symbol) => {
        for (let i = 0; i < 5; i++) {
            const count = symbol.reelInstance[i] || 0;
            for (let j = 0; j < count; j++) {
                if (symbol.useBonus) {
                    reels[i].push(symbol.Id);
                }
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
function populateScatterValues(gameInstance, type) {
    const { settings } = gameInstance;
    const matrix = type === "base" ? settings.resultSymbolMatrix : settings.bonusResultMatrix;
    const prevScatter = settings.scatter.values.map(v => `${v.index[0]},${v.index[1]}`);
    matrix.map((row, x) => {
        row.map((symbol, y) => {
            if (symbol == settings.scatter.SymbolID.toString()) {
                if (!prevScatter.includes(`${x},${y}`)) {
                    if (type === "bonus") {
                        settings.bonus.spinCount = 3;
                    }
                    //NOTE: add scatter to values
                    const scatterValue = (0, helper_1.getRandomValue)(gameInstance, "scatter") * settings.currentBet;
                    console.log("populate sc", x, y, scatterValue);
                    settings.scatter.values.push({
                        value: scatterValue,
                        index: [x, y]
                    });
                }
            }
        });
    });
}
function checkForBonus(gameInstance) {
    const { settings } = gameInstance;
    const scatterCount = settings.scatter.values.length;
    if (scatterCount >= settings.scatter.bonusTrigger[0].count[0]) {
        settings.bonus.scatterCount = settings.scatter.values.length;
        settings.bonus.isTriggered = true;
        settings.bonus.spinCount = 3;
        // const triggers = settings.scatter.bonusTrigger
        // const rows = rowsOnExpand(scatterCount, triggers)
        // const currentRows = settings.currentGamedata.matrix.y
        // if (rows !== currentRows) {
        //
        //   settings.currentGamedata.matrix.y = rows
        //   settings.scatter.values = shiftScatterValues(settings.scatter.values, rows - currentRows)
        // }
        return true;
    }
    return false;
}
function shiftScatterValues(scatterValues, shift) {
    return scatterValues.map(sc => {
        return {
            value: sc.value,
            index: [sc.index[0] + shift, sc.index[1]]
        };
    });
}
function handleBonusSpin(gameInstance) {
    const { settings } = gameInstance;
    new RandomBonusGenerator(gameInstance);
    populateScatterValues(gameInstance, "bonus");
    const scatterCount = settings.scatter.values.length;
    // const triggers = settings.scatter.bonusTrigger
    // const rows = rowsOnExpand(scatterCount, triggers)
    // const currentRows = settings.currentGamedata.matrix.y
    // if (rows !== currentRows) {
    //
    //   settings.scatter.values = shiftScatterValues(settings.scatter.values, rows - currentRows)
    //   settings.currentGamedata.matrix.y = rows
    // }
    settings.bonus.spinCount--;
    //NOTE: bonus inside freespin
    if (settings.bonus.spinCount < 0 && settings.freespinCount === settings.freespin.options[settings.freespin.optionIndex].count) {
        settings.isFreespin = true;
    }
    settings.bonus.scatterCount = scatterCount;
    if (scatterCount === 40) {
        settings.bonus.spinCount = -1;
    }
    if (settings.bonus.spinCount < 0) {
        collectScatter(gameInstance);
    }
}
function rowsOnExpand(count, triggers) {
    for (let trigger of triggers) {
        if (count >= trigger.count[0] && count <= trigger.count[1]) {
            return trigger.rows;
        }
    }
}
function collectScatter(gameInstance) {
    const { settings } = gameInstance;
    const totalPayout = settings.scatter.values.reduce((acc, sc) => acc + sc.value, 0);
    console.log(totalPayout);
    gameInstance.playerData.currentWining = totalPayout;
}
