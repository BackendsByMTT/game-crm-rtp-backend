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
    lineData: gameSettings.linesApiData,
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
      diamondMultiplier: gameSettings.freeSpin.diamondMultiplier || []
    },
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

// export function printMatrix(matrix: GameResult, getSymbol: (id: number) => SymbolType | undefined, gameInstance: SLLLL): void {
//   const symbolNames = matrix.map(col =>
//     col.map(symbolId => getSymbol(symbolId)?.Name.substring(0, 4) || 'Unkn')
//   );
//
//   for (let row = 0; row < gameInstance.settings.matrix.y; row++) {
//     console.log(symbolNames.map(col => col[row].padEnd(4)).join(' | '));
//   }
// }
// export function printWinningCombinations(winningCombinations: WinningCombination[]): void {
//   if (winningCombinations.length == 0) {
//     console.log("No winning combinations.");
//     return;
//   }
//
//   console.log("Winning Combinations:");
//   winningCombinations.forEach((combo, index) => {
//     console.log(`Combination ${index + 1}:`);
//     console.log(`  Symbol ID: ${combo.symbolId}`);
//     console.log(`  Positions: ${combo.positions.map(pos => `(${pos[0]},${pos[1]})`).join(', ')}`);
//     console.log(`  Payout: ${combo.payout}`);
//     console.log(); // Empty line for separation
//   });
//
//   const totalPayout = winningCombinations.reduce((sum, combo) => sum + combo.payout, 0);
//   console.log(`Total Payout: ${totalPayout}`);
// }


export function getSymbol(id: number, Symbols: SymbolType[]): SymbolType | undefined {
  return Symbols.find(s => s.Id == id);
}




//checking matching lines with first symbol and wild subs
type MatchedIndex = { col: number; row: number };
type CheckLineResult = { isWinningLine: boolean; matchCount: number; matchedIndices: MatchedIndex[], isWild: boolean };
//checking matching lines with first symbol and wild subs
function checkLineSymbols(
  firstSymbol: string,
  line: number[],
  gameInstance: SLLLL,
  direction: 'LTR' | 'RTL' = 'LTR'
): CheckLineResult {
  try {
    const { settings } = gameInstance;
    const wildSymbol = settings.scatter.SymbolID || "";
    let matchCount = 1;
    let currentSymbol = firstSymbol;
    let isWild = firstSymbol === wildSymbol
    const matchedIndices: MatchedIndex[] = [];
    const start = direction === 'LTR' ? 0 : line.length - 1;
    const end = direction === 'LTR' ? line.length : -1;
    const step = direction === 'LTR' ? 1 : -1;
    matchedIndices.push({ col: start, row: line[start] });
    for (let i = start + step; i !== end; i += step) {
      const rowIndex = line[i];
      const symbol = settings.resultSymbolMatrix[rowIndex][i];
      if (symbol === wildSymbol) {
        isWild = true
      }
      if (symbol === undefined) {
        // console.error(`Symbol at position [${rowIndex}, ${i}] is undefined.`);
        return { isWinningLine: false, matchCount: 0, matchedIndices: [], isWild };
      }
      switch (true) {
        case symbol.toString() === currentSymbol || symbol === wildSymbol:
          matchCount++;
          matchedIndices.push({ col: i, row: rowIndex });
          break;
        case currentSymbol === wildSymbol:
          currentSymbol = symbol.toString();
          matchCount++;
          matchedIndices.push({ col: i, row: rowIndex });
          break;
        default:
          return { isWinningLine: matchCount >= 3, matchCount, matchedIndices, isWild };
      }
    }
    return { isWinningLine: matchCount >= 3, matchCount, matchedIndices, isWild };
  } catch (error) {
    console.error("Error in checkLineSymbols:", error);
    return { isWinningLine: false, matchCount: 0, matchedIndices: [], isWild: false };
  }
}
//checking first non wild symbol in lines which start with wild symbol
function findFirstNonWildSymbol(line, gameInstance: SLLLL) {
  try {
    const { settings } = gameInstance;
    const wildSymbol = settings.scatter.SymbolID;
    for (let i = 0; i < line.length; i++) {
      const rowIndex = line[i];
      const symbol = settings.resultSymbolMatrix[rowIndex][i];
      if (symbol !== wildSymbol) {
        return symbol;
      }
    }
    return wildSymbol;
  } catch (error) {
    // console.error("Error in findFirstNonWildSymbol:");
    return null;
  }
}
//payouts to user according to symbols count in matched lines
function accessData(symbol, matchCount, gameInstance: SLLLL) {
  const { settings } = gameInstance;
  try {
    const symbolData = settings.currentGamedata.Symbols.find(
      (s) => s.Id.toString() === symbol.toString()
    );

    if (symbolData) {
      const multiplierArray = symbolData.multiplier;
      if (multiplierArray && multiplierArray[5 - matchCount]) {
        // if (symbol == settings.freeSpin.SymbolID) {
        //   return multiplierArray[5 - matchCount][1];
        // } else {
        return multiplierArray[5 - matchCount][0];
        // }
      }
    }
    return 0;
  } catch (error) {
    // console.error("Error in accessData:");
    return 0;
  }
}
/**
 * Finds symbols for a special case element in the result matrix.
 * @param gameInstance - The instance of the SLPSF class containing the game settings and player data.
 * @param SymbolName - The name of the symbol to search for in the symbol matrix.
 * @returns An array of strings representing the positions of the matching symbols in the format "column,row".
 */
export function findSymbol(gameInstance: SLLLL, SymbolName: string): string[] {
  const { settings } = gameInstance;
  const foundArray: string[] = [];
  try {
    let symbolId: number = -1;
    settings.currentGamedata.Symbols.forEach((element) => {
      if (SymbolName === element.Name) symbolId = element.Id;
    });

    if (symbolId === -1) return foundArray;
    for (let i = 0; i < settings.resultSymbolMatrix.length; i++) {
      for (let j = 0; j < settings.resultSymbolMatrix[i].length; j++) {
        if (settings.resultSymbolMatrix[i][j] === symbolId) {
          foundArray.push(`${j},${i}`);
        }
      }
    }
  } catch (error) {
    console.error("Error in findSymbol:", error);
  }

  return foundArray;
}

export function checkForDouble(gameInstance: SLLLL): boolean {
  try {
    const { settings } = gameInstance;
    const resultMatrix = settings.resultSymbolMatrix;
    const rows = resultMatrix.length;

    // Check if 1st, 2nd, and 3rd columns have symbol with ID 12 regardless of row
    let col1Hasscatter = false;
    let col2Hasscatter = false;
    let col3Hasscatter = false;


    for (let j = 0; j < rows; j++) { // Loop through rows
      if (resultMatrix[j][1] == settings.scatter.SymbolID) col1Hasscatter = true; // Check 1st column
      if (resultMatrix[j][2] == settings.scatter.SymbolID) col2Hasscatter = true; // Check 2nd column
      if (resultMatrix[j][3] == settings.scatter.SymbolID) col3Hasscatter = true; // Check 3rd column


      // If all three columns have the symbol, return true
      if (col1Hasscatter &&
        col2Hasscatter &&
        col3Hasscatter) {
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
    let col1Hasfreespin = false;
    let col2Hasfreespin = false;
    let col3Hasfreespin = false;


    for (let j = 0; j < rows; j++) { // Loop through rows
      if (resultMatrix[j][0] == settings.freeSpin.SymbolID) col1Hasfreespin = true; // Check 1st column
      if (resultMatrix[j][1] == settings.freeSpin.SymbolID) col2Hasfreespin = true; // Check 2nd column
      if (resultMatrix[j][2] == settings.freeSpin.SymbolID) col3Hasfreespin = true; // Check 3rd column


      // If all three columns have the symbol, return true
      if (col1Hasfreespin &&
        col2Hasfreespin &&
        col3Hasfreespin) {
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

export function checkWin(gameInstance: SLLLL): { payout: number; } {
  const { settings, playerData } = gameInstance;
  let totalPayout = 0;

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

  settings.lineData.forEach((line, index) => {
    const firstSymbolPositionLTR = line[0];
    // const firstSymbolPositionRTL = line[line.length - 1];

    // Get first symbols for both directions
    let firstSymbolLTR = settings.resultSymbolMatrix[firstSymbolPositionLTR][0];
    // let firstSymbolRTL = settings.resultSymbolMatrix[firstSymbolPositionRTL][line.length - 1];

    // Handle wild symbols for both directions
    if (firstSymbolLTR === settings.scatter.SymbolID) {
      firstSymbolLTR = findFirstNonWildSymbol(line, gameInstance);
    }

    // Left-to-right check
    const LTRResult = checkLineSymbols(firstSymbolLTR.toString(), line, gameInstance, 'LTR');
    if (LTRResult.isWinningLine && LTRResult.matchCount >= 3) {

      //NOTE: add freespin multiplier feat
      let symbolMultiplierLTR = accessData(firstSymbolLTR, LTRResult.matchCount, gameInstance);
      if (symbolMultiplierLTR > 0) {
        if (settings.freeSpin.freeSpinCount > -1) {

          // console.log("matchCount", LTRResult.matchCount);
          // console.log("multiplierBase", symbolMultiplierLTR);
          // switch (LTRResult.matchCount) {
          //   case 3:
          //     symbolMultiplierLTR *= settings.freespin.options[settings.freespin.optionIndex].multiplier[0];
          //     break;
          //   case 4:
          //     symbolMultiplierLTR *= settings.freespin.options[settings.freespin.optionIndex].multiplier[1];
          //     break;
          //   case 5:
          //     symbolMultiplierLTR *= settings.freespin.options[settings.freespin.optionIndex].multiplier[2];
          //     break;
          //   default:
          //     console.log('error in freespin multiplier')
          //     break;
          // }

          console.log("multiplierNew", symbolMultiplierLTR);
        }
        const payout = symbolMultiplierLTR * gameInstance.settings.BetPerLines;
        totalPayout += payout;
        settings._winData.winningLines.push(index + 1);
        // winningLines.push({
        //   line,
        //   symbol: firstSymbolLTR,
        //   multiplier: symbolMultiplierLTR,
        //   matchCount: LTRResult.matchCount,
        //   direction: 'LTR'
        // });
        const formattedIndices = LTRResult.matchedIndices.map(({ col, row }) => `${col},${row}`);
        const validIndices = formattedIndices.filter(
          (index) => index.length > 2
        );
        if (validIndices.length > 0) {
          settings._winData.winningSymbols.push(validIndices);
          settings._winData.totalWinningAmount = precisionRound((totalPayout * settings.BetPerLines), 4);
        }
        return;
      }
    }
  });
  checkForFreespin(gameInstance)

  //reset multiplers for freespin when its over 
  // if (settings.freeSpin.freeSpinCount <= 0 && settings.freeSpin.isFreeSpin === false) {
  //   settings.freeSpin.freeSpinMultipliers = 1
  // }
  // else {
  //   settings.freeSpinCount -= 1
  // }
  if (settings.isDouble) {
    // console.info("before", totalPayout);
    totalPayout *= 2
    // console.info("after", totalPayout);
  }

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

  return { payout: totalPayout };
}


export function makeResultJson(gameInstance: SLLLL) {
  try {
    const { settings, playerData } = gameInstance;
    const credits = gameInstance.getPlayerData().credits;
    const Balance = credits.toFixed(5);
    const sendData = {
      GameData: {
        resultSymbols: settings.resultSymbolMatrix,
        freeSpin: {
          isFreeSpin: settings.freeSpin.isFreeSpin,
          freeSpinCount: settings.freeSpin.freeSpinCount,
          // freeSpinMultipliers: settings.freeSpin.freeSpinMultipliers
        },
        isDouble: settings.isDouble,
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
