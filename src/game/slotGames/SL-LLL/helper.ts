import { SymbolType, GameResult, WinningCombination, FreeSpinResponse, specialIcons } from './types';
import { WinData } from "../BaseSlotGame/WinData";
import { convertSymbols, UiInitData } from '../../Utils/gameUtils';
import { precisionRound } from '../../../utils/utils';
import { SLLLL } from './LifeOfLuxuryLiteBase';


export function initializeGameSettings(gameData: any, gameInstance: SLLLL) {

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
    defaultPayout: gameSettings.defaultPayout || 0,
    minMatchCount: gameSettings.minMatchCount || 3,
    maxMultiplier: 10,
    scatter: {
      SymbolName: "",
      SymbolID: -1,
      useWild: false
    },
    isDouble: false,
    freeSpin: {
      SymbolName: "",
      SymbolID: -1,
      useWild: false,
      isFreeSpin: false,
      isFreeSpinTriggered: false,
      freeSpinCount: 0,
      freeSpinMultipliers: 1,
      freeSpinIncrement: gameSettings.freeSpin.incrementCount || 10,
    },
    winningCombinations: []
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
      gameSettings.Symbols.forEach((symbol: any) => {
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

function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export function sendInitData(gameInstance: SLLLL) {
  UiInitData.paylines = convertSymbols(gameInstance.settings.Symbols);
  const credits = gameInstance.getPlayerData().credits
  const Balance = credits.toFixed(2)
  const reels = gameInstance.settings.reels
  gameInstance.settings.reels = reels;
  const dataToSend = {
    GameData: {
      Reel: reels,
      Bets: gameInstance.settings.currentGamedata.bets,
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

export function makePayLines(gameInstance: SLLLL) {
  const { settings } = gameInstance;
  settings.currentGamedata.Symbols.forEach((element) => {
    // if (!element.useWildSub) {
    handleSpecialSymbols(element, gameInstance);
    // }
  });
}
function handleSpecialSymbols(symbol: any, gameInstance: SLLLL) {
  switch (symbol.Name) {
    case specialIcons.scatter:
      gameInstance.settings.scatter.SymbolName = symbol.Name;
      gameInstance.settings.scatter.SymbolID = symbol.Id;
      gameInstance.settings.scatter.useWild = false
      break;
    case specialIcons.freeSpin:
      gameInstance.settings.freeSpin.SymbolName = symbol.Name;
      gameInstance.settings.freeSpin.SymbolID = symbol.Id;
      gameInstance.settings.freeSpin.useWild = false
      break;
    default:
      break;
  }
}

export function printMatrix(matrix: GameResult, getSymbol: (id: number) => SymbolType | undefined, gameInstance: SLLLL): void {
  const symbolNames = matrix.map(col =>
    col.map(symbolId => getSymbol(symbolId)?.Name.substring(0, 4) || 'Unkn')
  );

  for (let row = 0; row < gameInstance.settings.matrix.y; row++) {
    console.log(symbolNames.map(col => col[row].padEnd(4)).join(' | '));
  }
}
export function printWinningCombinations(winningCombinations: WinningCombination[]): void {
  if (winningCombinations.length == 0) {
    console.log("No winning combinations.");
    return;
  }

  console.log("Winning Combinations:");
  winningCombinations.forEach((combo, index) => {
    console.log(`Combination ${index + 1}:`);
    console.log(`  Symbol ID: ${combo.symbolId}`);
    console.log(`  Positions: ${combo.positions.map(pos => `(${pos[0]},${pos[1]})`).join(', ')}`);
    console.log(`  Payout: ${combo.payout}`);
    console.log(); // Empty line for separation
  });

  const totalPayout = winningCombinations.reduce((sum, combo) => sum + combo.payout, 0);
  console.log(`Total Payout: ${totalPayout}`);
}


export function getSymbol(id: number, Symbols: SymbolType[]): SymbolType | undefined {
  return Symbols.find(s => s.Id == id);
}


export function checkForDouble(gameInstance: SLLLL): boolean {
  try {
    const { settings } = gameInstance;
    const resultMatrix = settings.resultSymbolMatrix;
    const rows = resultMatrix.length;

    // Check if 1st, 2nd, and 3rd columns have symbol with ID 12 regardless of row
    let col1Has12 = false;
    let col2Has12 = false;
    let col3Has12 = false;


    for (let j = 0; j < rows; j++) { // Loop through rows
      if (resultMatrix[j][1] == settings.scatter.SymbolID) col1Has12 = true; // Check 1st column
      if (resultMatrix[j][2] == settings.scatter.SymbolID) col2Has12 = true; // Check 2nd column
      if (resultMatrix[j][3] == settings.scatter.SymbolID) col3Has12 = true; // Check 3rd column


      // If all three columns have the symbol, return true
      if (col1Has12 && col2Has12 && col3Has12) {
        settings.isDouble = true
        return true;
      }
    }

    return false;


  } catch (e) {
    console.error("Error in checkForFreespin:", e);
    return false; // Handle error by returning false in case of failure
  }
}

export function checkForFreespin(gameInstance: SLLLL): boolean {
  try {
    const { settings } = gameInstance;
    const resultMatrix = settings.resultSymbolMatrix;
    const rows = resultMatrix.length;

    // Check if 1st, 2nd, and 3rd columns have symbol with ID 12 regardless of row
    let col1Has12 = false;
    let col2Has12 = false;
    let col3Has12 = false;


    for (let j = 0; j < rows; j++) { // Loop through rows
      if (resultMatrix[j][0] == settings.freeSpin.SymbolID) col1Has12 = true; // Check 1st column
      if (resultMatrix[j][1] == settings.freeSpin.SymbolID) col2Has12 = true; // Check 2nd column
      if (resultMatrix[j][2] == settings.freeSpin.SymbolID) col3Has12 = true; // Check 3rd column


      // If all three columns have the symbol, return true
      if (col1Has12 && col2Has12 && col3Has12) {
        settings.freeSpin.isFreeSpinTriggered = true
        settings.freeSpin.isFreeSpin = true;
        settings.freeSpin.freeSpinCount += settings.freeSpin.freeSpinIncrement;
        return true;
      }
    }

    settings.freeSpin.isFreeSpin = false;
    // If one of the columns doesn't have the symbol, return false
    return false;


  } catch (e) {
    console.error("Error in checkForFreespin:", e);
    return false; // Handle error by returning false in case of failure
  }
}

export function checkWin(gameInstance: SLLLL): { payout: number; winningCombinations: WinningCombination[] } {
  const { settings, playerData } = gameInstance;
  let totalPayout = 0;
  let winningCombinations: WinningCombination[] = [];
  checkForDouble(gameInstance)
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
      if (currentSymbolId == symbolId || (currentSymbolId === settings.scatter.SymbolID)) {
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
    if (symbol.Name !== settings.scatter.SymbolName) {
      for (let row = 0; row < settings.matrix.y; row++) {
        const startSymbolId = settings.resultSymbolMatrix[row][0]; // Start in the leftmost column (0)
        if (startSymbolId == symbol.Id || (startSymbolId === settings.scatter.SymbolID)) {
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
  //NOTE: check and increment freespinmultipliers 
  // Update multipliers based on symbol occurrences, capped at MAX_MULTIPLIER
  // if (settings.freeSpin.freeSpinCount > 0) {
  //
  //   let flag=false
  //   settings.resultSymbolMatrix.flat().forEach((symbolId) => {
  //     if(symbolId === settings.scatter.SymbolID){
  //       flag=true
  //     }
  //   })
  //   if(flag){
  //     settings.freeSpin.freeSpinMultipliers += 1
  //   }
  // }

  checkForFreespin(gameInstance)

  //reset multiplers for freespin when its over 
  // if (settings.freeSpin.freeSpinCount <= 0 && settings.freeSpin.isFreeSpin === false) {
  //   settings.freeSpin.freeSpinMultipliers = 1
  // }
  // else {
  //   settings.freeSpinCount -= 1
  // }
  winningCombinations.forEach(combo => {
    // alter payout . multiply betsperline with payout
    combo.payout = combo.payout
    totalPayout += combo.payout;
  })
  if (settings.isDouble) {
    // console.info("before", totalPayout);
    totalPayout *= 2
    // console.info("after", totalPayout);
  }

  settings.winningCombinations = winningCombinations
  gameInstance.playerData.currentWining = precisionRound(totalPayout, 5)
  gameInstance.playerData.haveWon += gameInstance.playerData.currentWining
  gameInstance.playerData.haveWon = precisionRound(gameInstance.playerData.haveWon, 5)

  gameInstance.incrementPlayerBalance(gameInstance.playerData.currentWining);
  makeResultJson(gameInstance)
  if (settings.freeSpin.freeSpinCount > 0) {
    settings.freeSpin.freeSpinCount -= 1
  }
  if (settings.isDouble) {
    settings.isDouble = false
  }

  return { payout: totalPayout, winningCombinations };
}


export function makeResultJson(gameInstance: SLLLL) {
  try {
    const { settings, playerData } = gameInstance;
    const credits = gameInstance.getPlayerData().credits;
    const Balance = credits.toFixed(5);
    const sendData = {
      gameData: {
        resultSymbols: settings.resultSymbolMatrix,
        freeSpin: {
          isFreeSpin: settings.freeSpin.isFreeSpin,
          freeSpinCount: settings.freeSpin.freeSpinCount,
          // freeSpinMultipliers: settings.freeSpin.freeSpinMultipliers
        },
        isDouble: settings.isDouble,
        winningCombinations: settings.winningCombinations,
      },
      PlayerData: {
        Balance: Balance,
        currentWining: playerData.currentWining,
        totalbet: playerData.totalbet,
        haveWon: playerData.haveWon,
      }
    };

    // console.log("Sending result JSON:", JSON.stringify(sendData));
    gameInstance.sendMessage('ResultData', sendData);
  } catch (error) {
    console.error("Error generating result JSON or sending message:", error);
  }
}
