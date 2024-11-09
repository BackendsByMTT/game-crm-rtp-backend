import { SLBB } from "./breakingBadBase";
import { getCoinsValues, getRandomValue, handleCoinsAndCashCollect } from "./helper";

export class RandomBonusGenerator {
  constructor(current: SLBB) {
    let matrix: string[][] = [];
    let ccIndices = current.settings.cashCollect.values.map(cc => `${cc.index[0]},${cc.index[1]}`);
    let coinIndices = current.settings.coins.bonusValues.map(cc => `${cc.index[0]},${cc.index[1]}`);
    console.log("ccIndices", ccIndices);
    console.log("coinIndices", coinIndices);

    for (let x = 0; x < current.settings.currentGamedata.matrix.x; x++) {
      const startPosition = this.getRandomIndex((current.settings.bonusReels[x].length - 1));
      for (let y = 0; y < current.settings.currentGamedata.matrix.y; y++) {
        if (!matrix[y]) matrix[y] = [];
        matrix[y][x] = current.settings.bonusReels[x][(startPosition + y) % current.settings.bonusReels[x].length];
        //TODO: freeze cc and coin positions 
        if (ccIndices.includes(`${y},${x}`)) {
          matrix[y][x] = current.settings.cashCollect.SymbolID.toString()
        }
        if (coinIndices.includes(`${y},${x}`)) {
          matrix[y][x] = current.settings.coins.SymbolID.toString()
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

    matrix.forEach(row => console.log(row.join(' ')));
    // current.settings.resultReelIndex = matrix;
    current.settings.bonusResultMatrix = matrix;

  }
  getRandomIndex(maxValue: number): number {
    return Math.floor(Math.random() * (maxValue + 1));
  }

}

export function checkForBonus(gameInstance: SLBB, hasCC: boolean, hasL: boolean, hasML: boolean): boolean {
  const { settings } = gameInstance

  if (hasCC && (hasL || hasML)) {
    settings.bonus.isTriggered = true
    settings.bonus.isBonus = true
    settings.bonus.count = 3
    //TODO: also init bonus 
    // 1. set coins and cc to []
    // 2. freeze cc and swapped coins at link

    settings.cashCollect.values = []


    settings.resultSymbolMatrix.forEach((row, i) => {
      row.forEach((symbol, j) => {
        //check if cc already exists
        const ccIndices = settings.cashCollect.values.map(cc => `${cc.index[0]},${cc.index[1]}`);

        if (symbol == settings.cashCollect.SymbolID.toString()) {
          if (!ccIndices.includes(`${i},${j}`)) {
            settings.cashCollect.values.push({
              index: [i, j],
              value: -1
            })
          }
        }
        else if (symbol == settings.link.SymbolID.toString() || symbol == settings.megalink.SymbolID.toString()) {
          settings.coins.bonusValues.push({
            index: [i, j],
            value: getRandomValue(gameInstance, "coin")
          })
        }
      })
    })
    // console.log("bonus coins",settings.coins.bonusValues);
    // console.log("cc",settings.cashCollect.values);

    return true
  }
  return false
}
export function handleBonusSpin(gameInstance: SLBB) {
  const { settings } = gameInstance
  //TODO: 
  //      1. generate bonus matrix 
  //      2. put frozen cc and link(to be swapped with coin) in bonus matrix
  //      3. check and freeze cc and coins 
  //      4. decrement count if there are no new coins 
  //      5. calculate payout
  settings.bonus.isTriggered = false
  //1. 2.
  new RandomBonusGenerator(gameInstance)
  //3.
  for (let i = 0; i < settings.bonusResultMatrix.length; i++) {
    for (let j = 0; j < settings.bonusResultMatrix[i].length; j++) {
      if (settings.bonusResultMatrix[i][j] == settings.cashCollect.SymbolID.toString()) {
        const ccIndices = settings.cashCollect.values.map(cc => `${cc.index[0]},${cc.index[1]}`);
        if (!ccIndices.includes(`${i},${j}`)) {
          settings.cashCollect.values.push({
            index: [i, j],
            value: -1
          })
        }
      }
      else if (settings.bonusResultMatrix[i][j] == settings.link.SymbolID.toString() || settings.bonusResultMatrix[i][j] == settings.megalink.SymbolID.toString()) {
        settings.coins.bonusValues.push({
          index: [i, j],
          value: getRandomValue(gameInstance, "coin")
        })
      }

    }
  }
  //4.
  settings.bonus.count -= 1
  //5. 
  getCoinsValues(gameInstance, "bonus")

  if (settings.bonus.count == 0) {
    const bonusPayout = handleCoinsAndCashCollect(gameInstance, "bonus")
    settings.bonus.payout = bonusPayout
  }



}
