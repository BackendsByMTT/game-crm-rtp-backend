import { generatetrueRandomNumber } from "../../Utils/gameUtils";
import { SLFLC } from "./FireLinkChinaTownBase";
import { getRandomValue } from "./helper";

export class RandomBonusGenerator {
  constructor(current: SLFLC) {
    let matrix: any[][] = [];
    let scatterIndices = current.settings.scatter.values.map(sc => `${sc.index[0]},${sc.index[1]}`);
    // let coinIndices = current.settings.coins.bonusValues.map(cc => `${cc.index[0]},${cc.index[1]}`);
    // console.log("ccIndices", ccIndices);
    // console.log("coinIndices", coinIndices);

    for (let x = 0; x < current.settings.currentGamedata.matrix.x; x++) {
      const startPosition = this.getRandomIndex((current.settings.bonusReels[x].length - 1));
      for (let y = 0; y < current.settings.currentGamedata.matrix.y; y++) {
        if (!matrix[y]) matrix[y] = [];
        matrix[y][x] = current.settings.bonusReels[x][(startPosition + y) % current.settings.bonusReels[x].length];
        // TODO: freeze sc  positions 
        if (scatterIndices.includes(`${y},${x}`)) {
          matrix[y][x] = current.settings.scatter.SymbolID
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
  getRandomIndex(maxValue: number): number {
    let seed = Date.now() + Math.random() * 1000;


    // return Math.floor(generateRandomNumber(seed, (maxValue + 1)));
    return Math.floor(generatetrueRandomNumber(maxValue + 1));

  }

}

export function generateBonusReel(gameSettings: any): string[][] {
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
function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
export function populateScatterValues(gameInstance: SLFLC, type: "base" | "bonus") {
  const { settings } = gameInstance
  const matrix = type === "base" ? settings.resultSymbolMatrix : settings.bonusResultMatrix

  const prevScatter = settings.scatter.values.map(v => `${v.index[0]},${v.index[1]}`)

  matrix.map((row, x) => {
    row.map((symbol, y) => {
      if (symbol == settings.scatter.SymbolID.toString()) {
        if (!prevScatter.includes(`${x},${y}`)) {
          if (type === "bonus") {
            settings.bonus.spinCount = 3
          }
          //NOTE: add scatter to values
          const scatterValue = getRandomValue(gameInstance, "scatter") * settings.currentBet
          console.log("populate sc", x, y, scatterValue);

          settings.scatter.values.push({
            value: scatterValue,
            index: [x, y]
          })
        }
      }
    })
  })
}

export function checkForBonus(gameInstance: SLFLC): boolean {
  const { settings } = gameInstance
  const scatterCount = settings.scatter.values.length
  if (scatterCount >= settings.scatter.bonusTrigger[0].count[0]) {
    settings.bonus.scatterCount = settings.scatter.values.length
    settings.bonus.isTriggered = true
    settings.bonus.spinCount = 3
    return true
  }
  return false
}
export function handleBonusSpin(gameInstance: SLFLC) {
  const { settings } = gameInstance
  new RandomBonusGenerator(gameInstance)
  populateScatterValues(gameInstance, "bonus")
  const scatterCount = settings.scatter.values.length
  const triggers = settings.scatter.bonusTrigger
  const rows = rowsOnExpand(scatterCount, triggers)
  settings.currentGamedata.matrix.y = rows
  settings.bonus.spinCount--
  settings.bonus.scatterCount = scatterCount
  if(scatterCount === 40){
    settings.bonus.spinCount = -1
  }
  if(settings.bonus.spinCount < 0){
    collectScatter(gameInstance)
  }
}
export function rowsOnExpand(count: number, triggers: { count: [number, number], rows: number }[]): number {
  for (let trigger of triggers) {
    if (count >= trigger.count[0] && count <= trigger.count[1]) {
      return trigger.rows
    }
  }
}

export function collectScatter(gameInstance: SLFLC) {
  const { settings } = gameInstance
  const totalPayout = settings.scatter.values.reduce((acc, sc) => acc + sc.value, 0)
  console.log(totalPayout);
  
  gameInstance.playerData.currentWining = totalPayout

}
