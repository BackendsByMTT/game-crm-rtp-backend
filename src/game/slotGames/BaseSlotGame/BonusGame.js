"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BonusGame = void 0;
exports.runMiniSpin = runMiniSpin;
const gameUtils_1 = require("../../Utils/gameUtils");
class BonusGame {
    constructor(nosOfItem, parent) {
        this.noOfItems = nosOfItem;
        this.type = gameUtils_1.bonusGameType.default;
        this.result = [];
        this.parent = parent;
    }
    generateData(totalPay = 0) {
        this.result = [];
        let res = [];
        this.result = this.parent.settings.currentGamedata.bonus.payOut;
        if (this.parent.settings.bonus.start && this.parent.settings.currentGamedata.bonus.type == gameUtils_1.bonusGameType.tap)
            this.shuffle(this.result);
        for (let i = 0; i < this.result.length; i++) {
            res.push(this.result[i].toString());
        }
        return res;
    }
    generateSlotData(reps = 0) {
        let res = [];
        let slot_array = [];
        let multiplier_array = [];
        slot_array.push(1);
        slot_array.push(2);
        slot_array.push(1);
        let reelNum = 1;
        if (!slot_array.includes(reelNum)) {
            reelNum = -1;
        }
        slot_array.forEach((element) => {
            if (element === reelNum)
                multiplier_array.push(this.parent.settings.currentGamedata.bonus.payTable[element]);
            else
                multiplier_array.push(0);
        });
        this.result = [...slot_array, reelNum, ...multiplier_array];
        for (let i = 0; i < this.result.length; i++) {
            res.push(this.result[i].toString());
        }
        return res;
    }
    setRandomStopIndex() {
        let amount = 0;
        // console.log("bonus: ", this.parent.settings.currentGamedata.bonus);
        if (this.parent.settings.bonus.start) {
            const bonusType = this.parent.settings.currentGamedata.bonus.type;
            const betPerLine = this.parent.settings.BetPerLines;
            const result = this.result;
            if (bonusType === gameUtils_1.bonusGameType.spin) {
                this.parent.settings.bonus.stopIndex = this.getRandomPayoutIndex(this.parent.settings.currentGamedata.bonus.payOutProb);
                amount = betPerLine * result[this.parent.settings.bonus.stopIndex];
                return amount;
            }
            else if (bonusType === gameUtils_1.bonusGameType.tap) {
                for (let index = 0; index < result.length; index++) {
                    if (result[index] === 0)
                        break;
                    amount += betPerLine * result[index];
                }
                return amount;
            }
            else if (bonusType === "slot") {
                // Slot bonus type
                for (let index = 1; index <= 3; index++) {
                    amount += betPerLine * result[result.length - index];
                }
                return amount;
            }
        }
        if (this.parent.settings.bonus.start && this.parent.settings.currentGamedata.bonus.type == gameUtils_1.bonusGameType.layerTap) {
            console.log('Condition met for layerTap bonus type');
            let totalWinAmount = 0;
            const bonusData = this.parent.settings.currentGamedata.bonus;
            var selectedIndex = [];
            for (let layerIndex = 0; layerIndex < bonusData.payOut.length; layerIndex++) {
                const layerPayOuts = bonusData.payOut[layerIndex];
                const layerPayOutProb = bonusData.payOutProb[layerIndex];
                selectedIndex[layerIndex] = this.getRandomPayoutIndex(layerPayOutProb);
                const selectedPayOut = layerPayOuts[selectedIndex[layerIndex]];
                if (selectedPayOut === 0) {
                    console.log(`Payout is 0 at layer ${layerIndex}, exiting...`);
                    break;
                }
                totalWinAmount += this.parent.settings.BetPerLines * selectedPayOut;
            }
            amount += totalWinAmount;
            return { selectedIndex, amount };
        }
        if (!amount || amount < 0)
            amount = 0;
        return amount;
    }
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            let k = array[i];
            array[i] = array[j];
            array[j] = k;
        }
    }
    getRandomPayoutIndex(payOutProb) {
        const totalProb = payOutProb.reduce((sum, prob) => sum + prob, 0);
        const normalizedProb = payOutProb.map(prob => prob / totalProb);
        const cumulativeProb = [];
        normalizedProb.reduce((acc, prob, index) => {
            cumulativeProb[index] = acc + prob;
            return cumulativeProb[index];
        }, 0);
        const randomNum = Math.random();
        for (let i = 0; i < cumulativeProb.length; i++) {
            if (randomNum <= cumulativeProb[i]) {
                return i;
            }
        }
        return cumulativeProb.length - 1;
    }
}
exports.BonusGame = BonusGame;
/**
 * Selects a random index from a probability array based on weighted probabilities.
 *
 * @param probArray - An array of probabilities for each index. Each value represents the weight
 *                    for selecting that index.
 * @returns The index of the randomly selected item based on the probabilities.
 */
const getRandomIndex = (probArray) => {
    const totalProb = probArray.reduce((sum, prob) => sum + prob, 0);
    const rand = Math.random() * totalProb;
    let sum = 0;
    for (let i = 0; i < probArray.length; i++) {
        sum += probArray[i];
        if (rand < sum)
            return i;
    }
    return probArray.length - 1;
};
const getRandomSymbol = (symbols, probArray) => {
    const index = getRandomIndex(probArray);
    return symbols[index];
};
const generateInnerMatrix = (symbols, miniSlotProb) => {
    return Array.from({ length: 3 }, () => getRandomSymbol(symbols, miniSlotProb));
};
/**
 * Simulates a mini slot game spin based on bonus information and the bet per line.
 *
 * @param bonus - The bonus object containing information about symbols, probabilities, payouts, etc.
 * @param betPerLines - The amount of bet per line.
 * @returns An object containing the result of the mini spin, including the inner matrix, outer ring symbols, winnings, and total win amount.
 */
function runMiniSpin(bonus, symCnt, betPerLines) {
    try {
        if (bonus.noOfItem < symCnt) {
            return;
        }
        //NOTE: 
        //lives should be dynamic 
        //noofitems - match count 
        //symcount - 3 
        //winningValue - [1,2,3]
        //so with 3 match count 1 life 
        //3 - 1 life 
        //4 - 2
        //5 - 3
        let lives = 0;
        // let lives = bonus.noOfItem > 5 ? 3 : bonus.noOfItem - ((bonus.winningValue).length + 1);
        if (bonus.noOfItem >= symCnt + 2) {
            lives = bonus.winningValue[2];
        }
        else if (bonus.noOfItem == symCnt + 1) {
            lives = bonus.winningValue[1];
        }
        else if (bonus.noOfItem == symCnt) {
            lives = bonus.winningValue[0];
        }
        let totalWinAmount = 0;
        const { symbols, miniSlotProb, outerRingProb, payOut } = bonus;
        let result = {
            innerMatrix: [],
            outerRingSymbol: [],
            totalWinAmount: 0,
            winings: [],
        };
        while (lives > 0) {
            const innerMatrix = generateInnerMatrix(symbols, miniSlotProb);
            const outerRingSymbol = getRandomSymbol(symbols, outerRingProb);
            const matchCount = innerMatrix.filter(symbol => symbol == outerRingSymbol).length;
            const winAmt = payOut[outerRingSymbol] * matchCount * betPerLines;
            const win = winAmt.toString();
            // const win = winAmt.toFixed(1);
            result.winings.push(win);
            result.innerMatrix.push(innerMatrix);
            result.outerRingSymbol.push(outerRingSymbol);
            result.totalWinAmount += Number(win);
            totalWinAmount += Number(win);
            if (outerRingSymbol === 7) {
                lives--;
            }
        }
        return result;
    }
    catch (error) {
        console.error(error);
    }
}
