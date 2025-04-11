import { WinData } from "../BaseSlotGame/WinData";
import {
  convertSymbols,
  UiInitData,
  shuffleArray,
} from "../../Utils/gameUtils";
import { specialIcons } from "./types";
import { SLGOW } from "./god-of-wealth-base";

/**
 * Initializes the game settings using the provided game data and game instance.
 * @param gameData - The data used to configure the game settings.
 * @param gameInstance - The instance of the SLCM class that manages the game logic.
 * @returns An object containing initialized game settings.
 */
export function initializeGameSettings(gameData: any, gameInstance: SLGOW) {
  return {
    id: gameData.gameSettings.id,
    matrix: gameData.gameSettings.matrix,
    bets: gameData.gameSettings.bets,
    Symbols: gameInstance.initSymbols,
    resultSymbolMatrix: [],
    currentGamedata: gameData.gameSettings,
    lineData: [],
    _winData: new WinData(gameInstance),
    currentBet: 0,
    currentLines: 0,
    BetPerLines: 0,
    reels: [],
    freeSpin: {
      SymbolID: "-1",
      SymbolName: "",
      freeSpinCount: 0,
      isEnabled: gameData.gameSettings.freeSpin.isEnabled,
      isFreeSpin: false,
      isTriggered: false,
      goldRowsProb: gameData.gameSettings.freeSpin.goldRowsProb,
      goldRowCountProb: gameData.gameSettings.freeSpin.goldRowCountProb,
      countIncrement: gameData.gameSettings.Symbols.find(
        (s: any) => s.Name === specialIcons.freeSpin,
      )
        .multiplier.flat()
        .filter((c: number) => c !== 0),
    },
    gamble: {
      isEnabled: gameData.gameSettings.gamble.isEnabled,
    },
    blueWild: {
      SymbolName: "",
      SymbolID: -1,
    },
    goldWild: {
      SymbolName: "",
      SymbolID: -1,
      rows: [],
    },
  };
}
/**
 * Generates the initial reel setup based on the game settings.
 * @param gameSettings - The settings used to generate the reel setup.
 * @returns A 2D array representing the reels, where each sub-array corresponds to a reel.
 */
export function generateInitialReel(gameSettings: any): string[][] {
  const reels = [[], [], [], [], [], []];
  gameSettings.Symbols.forEach((symbol) => {
    for (let i = 0; i < 6; i++) {
      const count = symbol.reelInstance[i] || 0;
      for (let j = 0; j < count; j++) {
        reels[i].push(symbol.Id);
      }
    }
  });
  reels.forEach((reel) => {
    shuffleArray(reel);
  });
  return reels;
}
/**
 * Shuffles the elements of an array in place using the Fisher-Yates algorithm.
 * @param array - The array to be shuffled.
 */

export function makePayLines(gameInstance: SLGOW) {
  const { settings } = gameInstance;
  settings.currentGamedata.Symbols.forEach((element) => {
    if (!element.useWildSub) {
      handleSpecialSymbols(element, gameInstance);
    }
  });
}

function handleSpecialSymbols(symbol: any, gameInstance: SLGOW) {
  switch (symbol.Name) {
    case specialIcons.blueWild:
      gameInstance.settings.blueWild.SymbolName = symbol.Name;
      gameInstance.settings.blueWild.SymbolID = symbol.Id;
      break;
    case specialIcons.goldWild:
      gameInstance.settings.goldWild.SymbolName = symbol.Name;
      gameInstance.settings.goldWild.SymbolID = symbol.Id;
      break;
    case specialIcons.freeSpin:
      gameInstance.settings.freeSpin.SymbolName = symbol.Name;
      gameInstance.settings.freeSpin.SymbolID = symbol.Id;
      break;
    default:
  }
}

//check for win function
export function checkForWin(gameInstance: SLGOW) {
  try {
    const { settings } = gameInstance;
    const winningLines = [];
    let totalPayout = 0;

    if (settings.freeSpin.isFreeSpin) {
      handleFreeSpin(gameInstance);
    } else {
      settings.freeSpin.isFreeSpin = false;
    }
    settings.freeSpin.isTriggered = false;
    settings.lineData.forEach((line, index) => {
      const firstSymbolPositionLTR = line[0];
      const firstSymbolPositionRTL = line[line.length - 1];

      // Get first symbols for both directions
      let firstSymbolLTR =
        settings.resultSymbolMatrix[firstSymbolPositionLTR][0];
      let firstSymbolRTL =
        settings.resultSymbolMatrix[firstSymbolPositionRTL][line.length - 1];

      // Handle wild symbols for both directions
      if (
        firstSymbolLTR === settings.blueWild.SymbolID ||
        firstSymbolLTR === settings.goldWild.SymbolID
      ) {
        firstSymbolLTR = findFirstNonWildSymbol(line, gameInstance);
      }
      if (
        firstSymbolRTL === settings.blueWild.SymbolID ||
        firstSymbolRTL === settings.goldWild.SymbolID
      ) {
        firstSymbolRTL = findFirstNonWildSymbol(line, gameInstance, "RTL");
      }

      // Left-to-right check
      const LTRResult = checkLineSymbols(
        firstSymbolLTR,
        line,
        gameInstance,
        "LTR",
      );

      if (LTRResult.isWinningLine && LTRResult.matchCount >= 3) {
        const symbolMultiplierLTR = accessData(
          firstSymbolLTR,
          LTRResult.matchCount,
          gameInstance,
          LTRResult.isWild,
        );
        if (symbolMultiplierLTR > 0) {
          const payout =
            symbolMultiplierLTR * gameInstance.settings.BetPerLines;
          totalPayout += payout;
          gameInstance.playerData.currentWining += payout;
          settings._winData.winningLines.push(index + 1);
          winningLines.push({
            line,
            symbol: firstSymbolLTR,
            multiplier: symbolMultiplierLTR,
            matchCount: LTRResult.matchCount,
            direction: "LTR",
          });
          const formattedIndices = LTRResult.matchedIndices.map(
            ({ col, row }) => `${col},${row}`,
          );
          const validIndices = formattedIndices.filter(
            (index) => index.length > 2,
          );
          if (validIndices.length > 0) {
            // console.log(validIndices);
            settings._winData.winningSymbols.push(validIndices);
            settings._winData.totalWinningAmount =
              totalPayout * settings.BetPerLines;
            // console.log(settings._winData.totalWinningAmount)
          }
          // console.log(`Line ${index + 1} (LTR):`, line);
          // console.log(`Payout for LTR Line ${index + 1}:`, "payout", payout);
          return;
        }
      }

      // Right-to-left check
      const RTLResult = checkLineSymbols(
        firstSymbolRTL,
        line,
        gameInstance,
        "RTL",
      );
      if (RTLResult.isWinningLine && RTLResult.matchCount >= 3) {
        const symbolMultiplierRTL = accessData(
          firstSymbolRTL,
          RTLResult.matchCount,
          gameInstance,
          RTLResult.isWild,
        );
        if (symbolMultiplierRTL > 0) {
          const payout =
            symbolMultiplierRTL * gameInstance.settings.BetPerLines;
          totalPayout += payout;
          gameInstance.playerData.currentWining += payout;
          settings._winData.winningLines.push(index + 1);
          winningLines.push({
            line,
            symbol: firstSymbolRTL,
            multiplier: symbolMultiplierRTL,
            matchCount: RTLResult.matchCount,
            direction: "RTL",
          });
          const formattedIndices = RTLResult.matchedIndices.map(
            ({ col, row }) => `${col},${row}`,
          );
          const validIndices = formattedIndices.filter(
            (index) => index.length > 2,
          );
          if (validIndices.length > 0) {
            // console.log(validIndices);
            settings._winData.winningSymbols.push(validIndices);
            settings._winData.totalWinningAmount =
              totalPayout * settings.BetPerLines;
            // console.log(settings._winData.totalWinningAmount)
          }
          // console.log(`Line ${index + 1} (RTL):`, line);
          // console.log(`Payout for RTL Line ${index + 1}:`, "payout", payout);
        }
      }
    });
    gameInstance.playerData.currentWining = totalPayout;
    gameInstance.updatePlayerBalance(gameInstance.playerData.currentWining);
    //decrement freespin count
    if (settings.freeSpin.freeSpinCount > 0) {
      settings.freeSpin.freeSpinCount -= 1;
    }

    if (settings.freeSpin.freeSpinCount <= 0) {
      const { found, count } = checkForFreeSpin(gameInstance);

      // console.log("checkfreespin :", found, count);

      if (found) {
        settings.freeSpin.isTriggered = true;
        settings.freeSpin.isFreeSpin = true;
        settings.freeSpin.freeSpinCount += count;
      }
    }

    // console.log(
    //   "freespin",
    //   settings.freeSpin.freeSpinCount,
    //   "trig",
    //   settings.freeSpin.isTriggered,
    //   "isF",
    //   settings.freeSpin.isFreeSpin,
    // );
    gameInstance.playerData.haveWon += gameInstance.playerData.currentWining;
    makeResultJson(gameInstance);
    settings._winData.winningLines = [];
    settings._winData.winningSymbols = [];
    return winningLines;
  } catch (error) {
    console.error("Error in checkForWin:", error);
    return [];
  }
}

type MatchedIndex = { col: number; row: number };
type CheckLineResult = {
  isWinningLine: boolean;
  matchCount: number;
  matchedIndices: MatchedIndex[];
  isWild: boolean;
};

function checkLineSymbols(
  firstSymbol: string,
  line: number[],
  gameInstance: SLGOW,
  direction: "LTR" | "RTL" = "LTR",
): CheckLineResult {
  try {
    const { settings } = gameInstance;
    const wildSymbol =
      settings.blueWild.SymbolID || settings.goldWild.SymbolID || "";
    let matchCount = 1;
    let currentSymbol = firstSymbol;

    let isWild = firstSymbol === wildSymbol;

    const matchedIndices: MatchedIndex[] = [];
    const start = direction === "LTR" ? 0 : line.length - 1;
    const end = direction === "LTR" ? line.length : -1;
    const step = direction === "LTR" ? 1 : -1;

    matchedIndices.push({ col: start, row: line[start] });

    for (let i = start + step; i !== end; i += step) {
      const rowIndex = line[i];
      const symbol = settings.resultSymbolMatrix[rowIndex][i];

      if (symbol === wildSymbol) {
        isWild = true;
      }

      if (symbol === undefined) {
        // console.error(`Symbol at position [${rowIndex}, ${i}] is undefined.`);
        return {
          isWinningLine: false,
          matchCount: 0,
          matchedIndices: [],
          isWild,
        };
      }

      switch (true) {
        case symbol === currentSymbol || symbol === wildSymbol:
          matchCount++;
          matchedIndices.push({ col: i, row: rowIndex });
          break;
        case currentSymbol === wildSymbol:
          currentSymbol = symbol;
          matchCount++;
          matchedIndices.push({ col: i, row: rowIndex });
          break;
        default:
          return {
            isWinningLine: matchCount >= 3,
            matchCount,
            matchedIndices,
            isWild,
          };
      }
    }
    return {
      isWinningLine: matchCount >= 3,
      matchCount,
      matchedIndices,
      isWild,
    };
  } catch (error) {
    console.error("Error in checkLineSymbols:", error);
    return {
      isWinningLine: false,
      matchCount: 0,
      matchedIndices: [],
      isWild: false,
    };
  }
}

//checking first non wild symbol in lines which start with wild symbol
function findFirstNonWildSymbol(
  line: number[],
  gameInstance: SLGOW,
  direction: "LTR" | "RTL" = "LTR",
) {
  const { settings } = gameInstance;
  const blueWildSymbol = settings.blueWild.SymbolID;
  const goldWildSymbol = settings.goldWild.SymbolID;
  const start = direction === "LTR" ? 0 : line.length - 1;
  const end = direction === "LTR" ? line.length : -1;
  const step = direction === "LTR" ? 1 : -1;

  for (let i = start; i !== end; i += step) {
    const rowIndex = line[i];
    const symbol = settings.resultSymbolMatrix[rowIndex][i];
    if (symbol !== blueWildSymbol && symbol !== goldWildSymbol) {
      return symbol;
    }
  }
  return blueWildSymbol;
}

//payouts to user according to symbols count in matched lines
function accessData(symbol, matchCount, gameInstance: SLGOW, isWild: boolean) {
  const { settings } = gameInstance;

  try {
    // if (isWild) {
    //   return settings.wild.multiplier[matchCount - 3];
    // }
    const symbolData = settings.currentGamedata.Symbols.find(
      (s) => s.Id.toString() === symbol.toString(),
    );
    if (symbolData) {
      const multiplierArray = symbolData.multiplier;

      if (multiplierArray && multiplierArray[settings.matrix.x - matchCount]) {
        return multiplierArray[settings.matrix.x - matchCount][0];
      }
    }
    return 0;
  } catch (error) {
    // console.error("Error in accessData:");
    return 0;
  }
}

/**
 * Sends the initial game and player data to the client.
 * @param gameInstance - The instance of the SLCM class containing the game settings and player data.
 */
export function sendInitData(gameInstance: SLGOW) {
  gameInstance.settings.lineData =
    gameInstance.settings.currentGamedata.linesApiData;
  UiInitData.paylines = convertSymbols(gameInstance.settings.Symbols);
  const reels = generateInitialReel(gameInstance.settings);
  gameInstance.settings.reels = reels;
  const dataToSend = {
    GameData: {
      Reel: reels,
      Lines: gameInstance.settings.currentGamedata.linesApiData,
      Bets: gameInstance.settings.currentGamedata.bets,
    },
    UIData: UiInitData,
    PlayerData: {
      Balance: gameInstance.getPlayerData().credits,
      haveWon: gameInstance.playerData.haveWon,
      currentWining: gameInstance.playerData.currentWining,
      totalbet: gameInstance.playerData.totalbet,
    },
  };
  gameInstance.sendMessage("InitData", dataToSend);
}

function getRandomFromProbability(probArray: number[]): number {
  try {
    const totalProb = probArray.reduce((sum, p) => sum + p, 0);
    const randValue = Math.random() * totalProb;

    let cumulativeProb = 0;
    for (let i = 0; i < probArray.length; i++) {
      cumulativeProb += probArray[i];
      if (randValue <= cumulativeProb) {
        return i + 1;
      }
    }

    return probArray.length;
  } catch (e) {
    console.log("error in getRandomFromProbability", e);
  }
}

function handleFreeSpin(gameInstance: SLGOW) {
  try {
    const goldRowCount =
      getRandomFromProbability(
        gameInstance.settings.freeSpin.goldRowCountProb,
      ) - 1;
    let goldRows = [];
    for (let i = 0; i < goldRowCount; i++) {
      goldRows.push(
        getRandomFromProbability(gameInstance.settings.freeSpin.goldRowsProb) -
          1,
      );
    }
    // console.log("golsym", gameInstance.settings.goldWild.SymbolID);

    if (goldRowCount > 0) {
      //substituting gold wilds in random rows
      const newMat: number[][] = [];
      gameInstance.settings.resultSymbolMatrix.forEach((row, rowIndex) => {
        let newRow = [];
        row.forEach((symbol, colIndex) => {
          if (goldRows.includes(colIndex)) {
            newRow.push(gameInstance.settings.goldWild.SymbolID);
          } else {
            newRow.push(symbol);
          }
        });
        newMat.push(newRow);
      });
      gameInstance.settings.resultSymbolMatrix = newMat;
      // console.log("mat", newMat);
    }

    // console.log("gold rows:", goldRows, goldRowCount);
    gameInstance.settings.goldWild.rows = goldRows;
  } catch (e: any) {
    console.log("error in handleFreeSpin", e);
  }
}

function checkForFreeSpin(gameInstance: SLGOW): {
  found: boolean;
  count: number;
} {
  try {
    if (!gameInstance?.settings?.resultSymbolMatrix) {
      console.error("Invalid game instance or missing matrix");
      return { found: false, count: 0 };
    }

    const matrix = gameInstance.settings.resultSymbolMatrix;

    let count = 0;
    matrix.forEach((row, rowIndex) => {
      row.forEach((symbol, colIndex) => {
        if (
          symbol.toString() ===
          gameInstance.settings.freeSpin.SymbolID.toString()
        )
          count += 1;
      });
    });
    if (count > 2) {
      if (count === 3) count = gameInstance.settings.freeSpin.countIncrement[2];
      else if (count === 4)
        count = gameInstance.settings.freeSpin.countIncrement[1];
      else count = gameInstance.settings.freeSpin.countIncrement[0];
    }

    return {
      found: count > 2,
      count: count,
    };
  } catch (error) {
    console.error("Error in checkForFreeSpin:", error);
    return { found: false, count: 0 };
  }
}

function getRandomEmptyPositions(
  matrix: string[][],
  symbolIds: string[],
): {
  row: number;
  col: number;
}[] {
  try {
    // Get all empty positions
    const emptyPositions: {
      row: number;
      col: number;
    }[] = [];

    // Collect all positions that don't have any of the symbolIds
    for (let row = 0; row < matrix.length; row++) {
      for (let col = 0; col < matrix[row].length; col++) {
        // Check if current position doesn't contain any of the symbolIds
        if (!symbolIds.includes(matrix[row][col].toString())) {
          emptyPositions.push({ row, col });
        }
      }
    }

    // Shuffle the empty positions array using Fisher-Yates algorithm
    for (let i = emptyPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [emptyPositions[i], emptyPositions[j]] = [
        emptyPositions[j],
        emptyPositions[i],
      ];
    }

    return emptyPositions;
  } catch (e) {
    console.log("error in getRandomEmptyPositions", e);
    return []; // Return empty array in case of error
  }
}

export function makeResultJson(gameInstance: SLGOW) {
  try {
    const { settings, playerData } = gameInstance;
    const credits = gameInstance.getPlayerData().credits;
    // const Balance = credits.toFixed(2)
    const Balance = credits;
    const sendData = {
      GameData: {
        ResultReel: settings.resultSymbolMatrix,
        linesToEmit: settings._winData.winningLines,
        symbolsToEmit: settings._winData.winningSymbols,
        isFreeSpin: settings.freeSpin.isTriggered,
        count: settings.freeSpin.freeSpinCount,
        goldWildRows: settings.goldWild.rows,
      },
      PlayerData: {
        Balance: Balance,
        currentWining: playerData.currentWining,
        totalbet: playerData.totalbet,
        haveWon: playerData.haveWon,
      },
    };
    // console.info("ResultData", JSON.stringify(sendData.GameData));

    gameInstance.sendMessage("ResultData", sendData);
  } catch (error) {
    console.error("Error generating result JSON or sending message:", error);
  }
}
