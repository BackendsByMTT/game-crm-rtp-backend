"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RandomBonusGenerator = void 0;
exports.checkForBonus = checkForBonus;
exports.handleBonusSpin = handleBonusSpin;
class RandomBonusGenerator {
    constructor(current) {
        let matrix = [];
        for (let x = 0; x < current.settings.currentGamedata.matrix.x; x++) {
            const startPosition = this.getRandomIndex((current.settings.reels[x].length - 1));
            for (let y = 0; y < current.settings.currentGamedata.matrix.y; y++) {
                if (!matrix[y])
                    matrix[y] = [];
                matrix[y][x] = current.settings.bonusReels[x][(startPosition + y) % current.settings.reels[x].length];
            }
        }
        // matrix.pop();
        // matrix.pop();
        // matrix.pop();
        // matrix.push(['10', '6', '10', '0', '4','6'])
        // matrix.push(['1', '11', '14', '10', '1','6'])
        // matrix.push(['5', '8', '1', '5', '1','6'])
        matrix.forEach(row => console.log(row.join(' ')));
        // current.settings.resultReelIndex = matrix;
        current.settings.bonusResultMatrix = matrix;
    }
    getRandomIndex(maxValue) {
        return Math.floor(Math.random() * (maxValue + 1));
    }
}
exports.RandomBonusGenerator = RandomBonusGenerator;
function checkForBonus(gameInstance, hasCC, hasL, hasML) {
    const { settings } = gameInstance;
    if (hasCC && (hasL || hasML)) {
        settings.bonus.isTriggered = true;
        settings.bonus.isBonus = true;
        settings.bonus.count = 3;
        return true;
    }
    return false;
}
function handleBonusSpin(gameInstance) {
    const { settings } = gameInstance;
    //TODO: 1. freeze cc and link from res matrix
    //      2. generate bonus matrix 
    //      3. put frozen cc and link(to be swapped with coin) in bonus matrix
    //      4. decrement count if there are no new coins 
    //      5. 
}
