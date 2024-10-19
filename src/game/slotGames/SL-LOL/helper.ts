import { SLLOL } from './LifeOfLuxury';
import { SymbolType, GameResult, WinningCombination } from './types';
import { WinData } from "../BaseSlotGame/WinData";
import { convertSymbols, UiInitData } from '../../Utils/gameUtils';


export function initializeGameSettings(gameData: any, gameInstance: SLLOL) {
  // console.log("Entering initializeGameSettings function");
  // console.log("gameData:", JSON.stringify(gameData, null, 2));

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
    isFreeSpin: false,
    freeSpinCount:0,
    freeSpinMultipliers: [],
  };

  // Add WinData separately to avoid circular reference in logging
  settings._winData = new WinData(gameInstance);

  return settings;
}

export function generateInitialReel(gameSettings: any): number[][] {
  try {
    // console.log("Entering generateInitialReel function");
    // console.log("gameSettings:", JSON.stringify(gameSettings, (key, value) => key === '_winData' ? undefined : value, 2));

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

export function sendInitData(gameInstance: SLLOL) {
  UiInitData.paylines = convertSymbols(gameInstance.settings.Symbols);
  const credits = gameInstance.getPlayerData().credits
  const Balance = credits.toFixed(2)
  const reels = generateInitialReel(gameInstance.settings);
  gameInstance.settings.reels = reels;
  const dataToSend = {
    GameData: {
      // Reel: reels,
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

// export function calculatePayout(gameInstance: SLLOL,  symbolId: number, count: number): number {
//   const symbol = gameInstance.settings.Symbols.find(sym => sym.Id === symbolId);
//   if (!symbol) return 0;
//
//   const payoutIndex = Math.min(count - 3, symbol.payout.length - 1);
//   return symbol.payout[payoutIndex] * gameInstance.settings.BetPerLines;
// }

export function makeResultJson(gameInstance: SLLOL) {
  try {
    const { settings, playerData } = gameInstance;
    const credits = gameInstance.getPlayerData().credits;
    const Balance = credits.toFixed(2);
    const sendData = {
      gameData: {
        resultSymbols: settings.resultSymbolMatrix,
      },
      PlayerData: {
        Balance: Balance,
        currentWining: playerData.currentWining,
        totalbet: playerData.totalbet,
        haveWon: playerData.haveWon,
      }
    };

    gameInstance.sendMessage('ResultData', sendData);
  } catch (error) {
    console.error("Error generating result JSON or sending message:", error);
  }
}

// export function getRandomSymbolForReel(symbols: SymbolType[], reelIndex: number): number {
//   const availableSymbols = symbols.filter(symbol => symbol.reelInstance.hasOwnProperty(reelIndex));
//   const totalInstances = availableSymbols.reduce((sum, symbol) => sum + symbol.reelInstance[reelIndex], 0);
//   let randomValue = crypto.getRandomValues(new Uint32Array(1))[0] % totalInstances;
//
//   for (const symbol of availableSymbols) {
//     if (randomValue < symbol.reelInstance[reelIndex]) {
//       return symbol.Id;
//     }
//     randomValue -= symbol.reelInstance[reelIndex];
//   }
//
//   // This should never happen, but TypeScript requires a return statement
//   return availableSymbols[0].Id;
// }

export function printMatrix(matrix: GameResult, getSymbol: (id: number) => SymbolType | undefined, gameInstance: SLLOL): void {
  const symbolNames = matrix.map(col =>
    col.map(symbolId => getSymbol(symbolId)?.Name.substring(0, 4) || 'Unkn')
  );

  for (let row = 0; row < gameInstance.settings.matrix.y; row++) {
    console.log(symbolNames.map(col => col[row].padEnd(4)).join(' | '));
  }
}
export function printWinningCombinations(winningCombinations: WinningCombination[]): void {
  if (winningCombinations.length === 0) {
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
// export function printWinningGrid(result: GameResult, winningCombinations: WinningCombination[]): void {
//   // Print the game result matrix
//   console.log("Game Result:");
//   result.forEach(row => console.log(row.join(' ')));
//
//   console.log("\nWinning Combinations:");
//
//   winningCombinations.forEach(combo => {
//     console.log(`${combo.symbolId} ->`);
//
//     const grid = result.map(row => row.map(() => '-'));
//
//     combo.positions.forEach(([col, row]) => {
//       grid[row][col] = '0';
//     });
//
//     grid.forEach(row => console.log(row.join(' ')));
//     console.log();  // Empty line for separation
//   });
// }


export function logGame(result: GameResult, payout: number, winningCombinations: WinningCombination[], getSymbol: (id: number) => SymbolType | undefined, gameInstance: SLLOL): void {
  console.log("Game Result:");
  printMatrix(result, getSymbol, gameInstance);
  console.log("\nTotal Payout:", payout);

  if (winningCombinations.length > 0) {
    console.log("\nWinning Combinations:");
    winningCombinations.forEach((combo, index) => {
      const symbol = getSymbol(combo.symbolId);
      console.log(`\nCombination ${index + 1}:`);
      console.log(`Symbol: ${symbol?.Name}`);
      console.log(`Payout: ${combo.payout}`);
      // printWinningCombination(result, combo.positions, getSymbol, gameInstance);
    });
  } else {
    console.log("\nNo winning combinations.");
  }
}
