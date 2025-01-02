"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RandomResultGenerator = void 0;
const gameUtils_1 = require("../Utils/gameUtils");
class RandomResultGenerator {
    constructor(current) {
        let matrix = [];
        for (let x = 0; x < current.settings.currentGamedata.matrix.x; x++) {
            const startPosition = this.getRandomIndex((current.settings.reels[x].length - 1));
            for (let y = 0; y < current.settings.currentGamedata.matrix.y; y++) {
                if (!matrix[y])
                    matrix[y] = [];
                matrix[y][x] = current.settings.reels[x][(startPosition + y) % current.settings.reels[x].length];
            }
        }
        // matrix.pop();
        // matrix.pop();
        // matrix.pop();
        // matrix.push(['10', '6', '10', '0', '4','6'])
        // matrix.push(['1', '11', '14', '10', '1','6'])
        // matrix.push(['5', '8', '1', '5', '1','6'])
        matrix.forEach(row => console.log(row.join(' ')));
        current.settings.resultReelIndex = matrix;
        current.settings.resultSymbolMatrix = matrix;
    }
    getRandomIndex(maxValue) {
        let seed = Date.now() + Math.random() * 1000;
        // return Math.floor(generateRandomNumber(seed, (maxValue + 1)));
        return Math.floor((0, gameUtils_1.generatetrueRandomNumber)(maxValue + 1));
    }
}
exports.RandomResultGenerator = RandomResultGenerator;
