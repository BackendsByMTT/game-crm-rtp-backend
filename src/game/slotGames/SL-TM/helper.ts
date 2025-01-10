import { SymbolType, GameResult, WinningCombination, SpecialSymbols } from './types';
import { WinData } from "../BaseSlotGame/WinData";
import { convertSymbols, UiInitData, shuffleArray } from '../../Utils/gameUtils';
import { precisionRound } from '../../../utils/utils';
import { SLTM } from './TimeMachineBase';

export function initializeGameSettings(gameData: any, gameInstance: SLTM) {

  const gameSettings = gameData.gameSettings || gameData; // Handle both possible structures

  const settings = {
    id: gameSettings.id,
    isSpecial: gameSettings.isSpecial,
    matrix: gameSettings.matrix,
    isEnabled: gameSettings.isEnabled ?? true,
    bets: gameSettings.bets,
    Symbols: gameInstance.initSymbols,
    resultSymbolMatrix: [],
    currentGamedata: gameSettings,
    currentBet: 0,
    _winData: null,
    currentLines: 0,
    BetPerLines: 0,
    reels: [],
    // freeSpinReels: [],
    level: 0 as 0 | 1 | 2 | 3 | 4,
    isLevelUp: false,
    minMatchCount: gameSettings.minMatchCount || 3,
    isFreeSpin: false,
    isFreeSpinTriggered: false,
    freeSpinCount: 0,
    freeSpinIncrement: gameSettings.freeSpin.incrementCount,
    freeSpinRetriggerProbs: gameSettings.freeSpin.retriggerProbs,
    winningCombinations: [],
    wild: {
      SymbolId: gameInstance.currentGameData.gameSettings.Symbols.find((sym: SymbolType) => sym.Name == SpecialSymbols.WILD).Id
      ,
      SymbolName: SpecialSymbols.WILD,
      cutoffLevel: gameSettings.wildCutoffLevel,
      subs: gameSettings.wildSubs
    },
    freeSpin: {
      SymbolId: gameInstance.currentGameData.gameSettings.Symbols.find((sym: SymbolType) => sym.Name == SpecialSymbols.FREE_SPIN).Id
      ,
      SymbolName: SpecialSymbols.FREE_SPIN,
    }
  };
  // Add WinData separately to avoid circular reference in logging
  settings._winData = new WinData(gameInstance);

  return settings;
}

export function generateInitialReel(gameSettings: any): number[][] {
  try {

    if (!gameSettings || !gameSettings.matrix || !gameSettings.Symbols) {
      console.error("Invalid gameSettings object:", gameSettings);
      return [];
    }

    const reels: number[][] = [];
    const numReels = gameSettings.matrix.x;
    // console.log("Number of reels:", numReels);

    for (let i = 0; i < numReels; i++) {
      const reel: number[] = [];
      const validSymbols = gameSettings.Symbols.filter(symbol => symbol.Name !== SpecialSymbols.FREE_SPIN);
      validSymbols.forEach((symbol: any) => {
        if (!symbol || !symbol.reelInstance) {
          // console.warn("Invalid symbol object:", symbol);
          return;
        }
        const count = symbol.reelInstance[i] || 0;
        // console.log(`Reel ${i}, Symbol ${symbol.Name}, Count: ${count}`);
        for (let j = 0; j < count; j++) {
          reel.push(symbol.Id);
        }
      });
      shuffleArray(reel);
      reels.push(reel);
    }
    // console.log("Generated reels:", reels);
    return reels;
  } catch (e) {
    console.error("Error in generateInitialReel:", e);
    return [];
  }
}


export function sendInitData(gameInstance: SLTM) {
  UiInitData.paylines = convertSymbols(gameInstance.settings.Symbols);
  const credits = gameInstance.getPlayerData().credits
  const Balance = credits.toFixed(2)
  const reels = gameInstance.settings.reels
  gameInstance.settings.reels = reels;
  const dataToSend = {
    GameData: {
      Reel: reels,
      Bets: gameInstance.settings.currentGamedata.bets,
      FreespinBonusCount: gameInstance.settings.freeSpinIncrement,
    },
    UIData: UiInitData,
    PlayerData: {
      Balance: Balance,
      haveWon: gameInstance.playerData.haveWon,
      currentWining: gameInstance.playerData.currentWining,
      totalbet: gameInstance.playerData.totalbet,
    },
  };
  gameInstance.sendMessage("InitData", dataToSend);
}


export function getSymbol(id: number, Symbols: SymbolType[]): SymbolType | undefined {
  return Symbols.find(s => s.Id == id);
}

export function isWild(symbolId: number, wildId: string): boolean {
  return symbolId.toString() == wildId
}
function getRandomIndex(probs: number[]): number {
  const total = probs.reduce((acc, prob) => acc + prob, 0);
  const random = Math.random() * total;
  let current = 0;
  for (let i = 0; i < probs.length; i++) {
    current += probs[i];
    if (random < current) {
      return i;
    }
  }
  return probs.length - 1;
}

export function checkWin(gameInstance: SLTM): { payout: number; winningCombinations: WinningCombination[] } {
  try {

    const { settings, playerData } = gameInstance;
    let totalPayout = 0;
    let winningCombinations: WinningCombination[] = [];

    settings.isLevelUp = false

    //NOTE: wild sub 
    //1 check if level above cutoff
    //2 check if there are wild symbols
    //3 substitute wild symbols
    // console.log(settings.level, settings.wild.cutoffLevel);
    

    if (settings.level >= settings.wild.cutoffLevel) {
      let newMatrix = JSON.parse(JSON.stringify(settings.resultSymbolMatrix))
      settings.resultSymbolMatrix.forEach((row, y) => {
        row.forEach((symbolId, x) => {
          if (isWild(symbolId, settings.wild.SymbolId)) {
            newMatrix[y][x] = getRandomIndex(settings.wild.subs)
          }
        })
      })
      settings.resultSymbolMatrix = newMatrix
    }




    //NOTE: freespin plus one substitute
    if (settings.isFreeSpin) {
      // console.log("Free spin mode active.");

      const freeSpinIndex = getRandomIndex(settings.freeSpinRetriggerProbs);
      // console.log("Generated freeSpinIndex:", freeSpinIndex, "from probabilities:", settings.freeSpinRetriggerProbs);

      let y: number = 0;
      if (freeSpinIndex !== 0) {
        y = getRandomIndex([1, 1, 1, 1, 1, 1, 1]);
        // console.log("Generated y index:", y);
      }

      switch (freeSpinIndex) {
        case 0:
          // console.log("No extra free spin triggered.");
          break;

        case 1:
          // console.log("Extra free spin in 1st reel/column at position y:", y);
          settings.resultSymbolMatrix[y][0] = settings.freeSpin.SymbolId;
          settings.isFreeSpinTriggered = true;
          settings.freeSpinCount += 1;
          break;

        case 2:
          // console.log("Extra free spin in 2nd reel/column at position y:", y);
          settings.resultSymbolMatrix[y][1] = settings.freeSpin.SymbolId;
          break;

        case 3:
          // console.log("Extra free spin in 3rd reel/column at position y:", y);
          settings.resultSymbolMatrix[y][2] = settings.freeSpin.SymbolId;
          break;

        case 4:
          // console.log("Extra free spin in 4th reel/column at position y:", y);
          settings.resultSymbolMatrix[y][3] = settings.freeSpin.SymbolId;
          break;

        case 5:
          // console.log("Extra free spin in 5th reel/column at position y:", y);
          settings.resultSymbolMatrix[y][4] = settings.freeSpin.SymbolId;
          settings.isFreeSpinTriggered = true;
          settings.freeSpinCount += 1;
          break;

        default:
          console.error("Invalid freeSpinIndex:", freeSpinIndex);
          break;
      }

      // console.log("Updated resultSymbolMatrix:", settings.resultSymbolMatrix);
      // console.log("Free spin count:", settings.freeSpinCount, "Free spin triggered:", settings.isFreeSpinTriggered);
    }



    const findCombinations = (symbolId: number, col: number, path: [number, number][]): void => {
      // Stop if we've checked all columns or path is complete
      if (col == settings.matrix.x) {
        if (path.length >= settings.minMatchCount) {
          const symbol = getSymbol(symbolId, settings.Symbols);
          const multiplierIndex = Math.abs(path.length - 5);
          if (symbol && symbol.multiplier[multiplierIndex]) { // Check if multiplier exists
            const multiplier = symbol.multiplier[multiplierIndex][0];
            winningCombinations.push({ symbolId, positions: path, payout: multiplier * settings.BetPerLines });
          }
        }
        return;
      }

      for (let row = 0; row < settings.resultSymbolMatrix.length; row++) {
        const currentSymbolId = settings.resultSymbolMatrix[row][col];
        if (currentSymbolId == symbolId || isWild(currentSymbolId, settings.wild.SymbolId)) {
          findCombinations(symbolId, col + 1, [...path, [row, col]]);
        }
      }

      // End the combination if it's long enough
      if (path.length >= settings.minMatchCount) {
        const symbol = getSymbol(symbolId, settings.Symbols)!;
        let multiplierIndex = Math.abs(path.length - 5);
        if (symbol && symbol.multiplier[multiplierIndex]) { // Check if multiplier exists
          const multiplier = symbol.multiplier[multiplierIndex][0];
          winningCombinations.push({ symbolId, positions: path, payout: multiplier * settings.BetPerLines });
        }
      }
    };

    // Iterate over each symbol in the first column
    settings.Symbols.forEach(symbol => {
      if (symbol.Name !== settings.wild.SymbolName) {
        for (let row = 0; row < settings.matrix.y; row++) {
          const startSymbolId = settings.resultSymbolMatrix[row][0]; // Start in the leftmost column (0)
          if (startSymbolId == symbol.Id || isWild(startSymbolId, settings.wild.SymbolId)) {
            findCombinations(symbol.Id, 1, [[row, 0]]);
          }
        }
      }
    });

    // Filter out shorter combinations that are subsets of longer ones
    winningCombinations = winningCombinations.filter((combo, index, self) =>
      !self.some((otherCombo, otherIndex) =>
        index != otherIndex &&
        combo.symbolId == otherCombo.symbolId &&
        combo.positions.length < otherCombo.positions.length &&
        combo.positions.every((pos, i) => pos[0] == otherCombo.positions[i][0] && pos[1] == otherCombo.positions[i][1])
      )
    );

    //NOTE: FREESPIN related checks

    winningCombinations.forEach(combo => {

      combo.payout = combo.payout
      totalPayout += combo.payout;
    })
    if (winningCombinations.length > 0 && !settings.isFreeSpin) {
      settings.isLevelUp = true
      if (settings.level < 4) {
        settings.level += 1
        // settings.matrix.y += 1
      }
      if (settings.level == 4 && !settings.isFreeSpin) {
        settings.isFreeSpin = true
        settings.isFreeSpinTriggered = true
        settings.freeSpinCount = settings.freeSpinIncrement
      }
    } else if (winningCombinations.length === 0 && !settings.isFreeSpin) {
      settings.isLevelUp = false
      settings.level = 0
      // settings.matrix.y = 3
    }
    settings.winningCombinations = winningCombinations
    gameInstance.playerData.currentWining = precisionRound(totalPayout, 3)
    gameInstance.playerData.haveWon += precisionRound(gameInstance.playerData.currentWining, 3)

    gameInstance.incrementPlayerBalance(gameInstance.playerData.currentWining);
    makeResultJson(gameInstance)
    settings.isFreeSpinTriggered = false

    if (settings.level === 4 && settings.freeSpinCount === 0 && settings.isFreeSpin) {
      settings.isFreeSpin = false
      // settings.matrix.y = 3
      settings.level = 0

    }

    if (settings.freeSpinCount > 0) {
      settings.freeSpinCount -= 1
    }

    //NOTE: set matrix y with level
    settings.matrix.y = settings.level + 3
    return { payout: totalPayout, winningCombinations };
  } catch (e) {
    console.error("Error in checkWin:", e);
  }
}

export function makeResultJson(gameInstance: SLTM) {
  try {
    const { settings, playerData } = gameInstance;
    const credits = gameInstance.getPlayerData().credits;
    const Balance = credits.toFixed(3);
    const symbolsToEmit = settings.winningCombinations.map(combo => {
      return combo.positions.map(pos => `${pos[1]},${pos[0]}`);
    }).flatMap(pos => pos);
    const sendData = {
      GameData: {
        resultSymbols: settings.resultSymbolMatrix,
        symbolsToEmit,
        // freeSpin: {
        //   isFreeSpin: settings.isFreeSpin,
        //   freeSpinCount: settings.freeSpinCount,
        //   freeSpinMultipliers: settings.freeSpinMultipliers
        // },
        // winningCombinations: settings.winningCombinations,
        isLevelUp: settings.isLevelUp,
        level: settings.level,
        isFreeSpin: settings.isFreeSpinTriggered,
        freeSpinCount: settings.freeSpinCount
      },
      PlayerData: {
        Balance: Balance,
        currentWining: playerData.currentWining,
        totalbet: playerData.totalbet,
        haveWon: playerData.haveWon,
      }
    };

    // console.log("Sending result JSON:");
    // console.log(JSON.stringify(sendData));


    gameInstance.sendMessage('ResultData', sendData);
  } catch (error) {
    console.error("Error generating result JSON or sending message:", error);
  }
}
