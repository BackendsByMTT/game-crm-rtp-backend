import { WinData } from "../BaseSlotGame/WinData";
import {
  convertSymbols,
  UiInitData,
  shuffleArray
} from "../../Utils/gameUtils";
import { SLSB } from "./Starburst";
import { specialIcons } from "./types";
import { RandomResultGenerator } from "../RandomResultGenerator";
import { precisionRound } from "../../../utils/utils";

/**
 * Initializes the game settings using the provided game data and game instance.
 * @param gameData - The data used to configure the game settings.
 * @param gameInstance - The instance of the SLCM class that manages the game logic.
 * @returns An object containing initialized game settings.
 */
export function initializeGameSettings(gameData: any, gameInstance: SLSB) {
  return {
    id: gameData.gameSettings.id,
    matrix: gameData.gameSettings.matrix,
    currentGamedata: gameData.gameSettings,
    resultSymbolMatrix: [],
    bets: gameData.gameSettings.bets,
    Symbols: gameInstance.initSymbols,
    lineData: [],
    _winData: new WinData(gameInstance),
    currentBet: 0,
    currentLines: 0,
    BetPerLines: 0,
    reels: [],
    starBurstTriggerMatrix: [],
    isStarBurst: false,
    starBurstReel: [],
    starBurstResponse: [],
    wild: {
      SymbolName: "",
      SymbolID: -1,
      useWild: false,
    }
  };
}
/**
 * Generates the initial reel setup based on the game settings.
 * @param gameSettings - The settings used to generate the reel setup.
 * @returns A 2D array representing the reels, where each sub-array corresponds to a reel.
 */
export function generateInitialReel(gameSettings: any): string[][] {
  const reels = [[], [], [], [], []];
  gameSettings.Symbols.forEach((symbol) => {
    for (let i = 0; i < 5; i++) {
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



export function makePayLines(gameInstance: SLSB) {
  const { settings } = gameInstance;
  settings.currentGamedata.Symbols.forEach((element) => {
    if (!element.useWildSub) {
      handleSpecialSymbols(element, gameInstance);
    }
  });
}
function handleSpecialSymbols(symbol: any, gameInstance: SLSB) {
  switch (symbol.Name) {
    case specialIcons.wild:
      gameInstance.settings.wild.SymbolName = symbol.Name;
      gameInstance.settings.wild.SymbolID = symbol.Id;
      gameInstance.settings.wild.useWild = true;
      break;
    default:
      break;
  }
}

//checking matching lines with first symbol and wild subs
type MatchedIndex = { col: number; row: number };
type CheckLineResult = { isWinningLine: boolean; matchCount: number; matchedIndices: MatchedIndex[], isWild: boolean };
type WinningLineDetail = { direction: 'LTR' | 'RTL'; lineIndex: number; details: CheckLineResult };
function checkLineSymbols(
  firstSymbol: string,
  line: number[],
  gameInstance: SLSB,
  direction: 'LTR' | 'RTL' = 'LTR'
): CheckLineResult {
  try {
    const { settings } = gameInstance;
    const wildSymbol = settings.wild.SymbolID || "";
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
function findFirstNonWildSymbol(line: number[], gameInstance: SLSB, direction: 'LTR' | 'RTL' = 'LTR') {
  const { settings } = gameInstance;
  const wildSymbol = settings.wild.SymbolID;
  const start = direction === 'LTR' ? 0 : line.length - 1;
  const end = direction === 'LTR' ? line.length : -1;
  const step = direction === 'LTR' ? 1 : -1;
  for (let i = start; i !== end; i += step) {
    const rowIndex = line[i];
    const symbol = settings.resultSymbolMatrix[rowIndex][i];
    if (symbol !== wildSymbol) {
      return symbol;
    }
  }
  return wildSymbol;
}


//payouts to user according to symbols count in matched lines
function accessData(symbol, matchCount, gameInstance: SLSB) {
  const { settings } = gameInstance;
  try {
    const symbolData = settings.currentGamedata.Symbols.find(
      (s) => s.Id.toString() === symbol.toString()
    );
    if (symbolData) {
      const multiplierArray = symbolData.multiplier;
      if (multiplierArray && multiplierArray[5 - matchCount]) {
        return multiplierArray[5 - matchCount][0];
      }
    }
    return 0;
  } catch (error) {
    console.error("Error in accessData:");
    return 0;
  }
}

/**
 * Sends the initial game and player data to the client.
 * @param gameInstance - The instance of the SLCM class containing the game settings and player data.
 */
export function sendInitData(gameInstance: SLSB) {
  gameInstance.settings.lineData =
    gameInstance.settings.currentGamedata.linesApiData;
  UiInitData.paylines = convertSymbols(gameInstance.settings.Symbols);
  const reels = generateInitialReel(gameInstance.settings);
  gameInstance.settings.reels = reels;
  const dataToSend = {
    GameData: {
      Reel: reels,
      linesApiData: gameInstance.settings.currentGamedata.linesApiData,
      Bets: gameInstance.settings.currentGamedata.bets,
    },
    UIData: UiInitData,
    PlayerData: {
      Balance: gameInstance.getPlayerData().credits,
    },
  };
  gameInstance.sendMessage("InitData", dataToSend);
}

//CHECK WINS ON PAYLINES WITH OR WITHOUT WILD
export function checkForWin(gameInstance: SLSB) {
  try {
    const { settings } = gameInstance;

    const winningLines = [];
    let totalPayout = 0;

    //NOTE: make a temp copy 
    //
    settings.starBurstTriggerMatrix = JSON.parse(JSON.stringify(settings.resultSymbolMatrix));

    //NOTE: if starburst is true check if starBurstReel can be increased
    if (settings.isStarBurst) {
      settings.isStarBurst = false
      settings.resultSymbolMatrix.forEach((row, rowIndex) => {
        [1, 2, 3].forEach((columnIndex) => {
          if (settings.resultSymbolMatrix[rowIndex][columnIndex] == settings.wild.SymbolID &&
            !settings.starBurstReel.includes(columnIndex)
          ) {
            settings.isStarBurst = true
            settings.starBurstReel.push(columnIndex)
          }
        })
      })
    } else {

      //NOTE: check for starburst
      settings.resultSymbolMatrix.forEach((row, rowIndex) => {
        [1, 2, 3].forEach((columnIndex) => {
          if (settings.resultSymbolMatrix[rowIndex][columnIndex] == settings.wild.SymbolID
            && !settings.starBurstReel.includes(columnIndex)
          ) {
            settings.isStarBurst = true
            settings.starBurstReel.push(columnIndex)
          }
        })
      })
    }

    //NOTE: swap wild in resMatrix
    //
    if (settings.starBurstReel.length > 0) {

      settings.resultSymbolMatrix.forEach((row, rowIndex) => {
        settings.starBurstReel.forEach((columnIndex) => {
          settings.resultSymbolMatrix[rowIndex][columnIndex] = settings.wild.SymbolID
        })
      })
      // console.info("after swap:");
      // console.info(settings.resultSymbolMatrix);
    }

    settings.lineData.forEach((line, index) => {
      const firstSymbolPositionLTR = line[0];
      const firstSymbolPositionRTL = line[line.length - 1];

      // Get first symbols for both directions
      let firstSymbolLTR = settings.resultSymbolMatrix[firstSymbolPositionLTR][0];
      let firstSymbolRTL = settings.resultSymbolMatrix[firstSymbolPositionRTL][line.length - 1];

      // Handle wild symbols for both directions
      if (firstSymbolLTR === settings.wild.SymbolID) {
        firstSymbolLTR = findFirstNonWildSymbol(line, gameInstance);
      }
      if (firstSymbolRTL === settings.wild.SymbolID) {
        firstSymbolRTL = findFirstNonWildSymbol(line, gameInstance, 'RTL');
      }

      // Left-to-right check
      const LTRResult = checkLineSymbols(firstSymbolLTR, line, gameInstance, 'LTR');
      if (LTRResult.isWinningLine && LTRResult.matchCount >= 3) {
        const symbolMultiplierLTR = accessData(firstSymbolLTR, LTRResult.matchCount, gameInstance);
        if (symbolMultiplierLTR > 0) {
          const payout = symbolMultiplierLTR * gameInstance.settings.BetPerLines;
          totalPayout += payout;
          gameInstance.playerData.currentWining += payout;
          settings._winData.winningLines.push(index + 1);
          winningLines.push({
            line,
            symbol: firstSymbolLTR,
            multiplier: symbolMultiplierLTR,
            matchCount: LTRResult.matchCount,
            direction: 'LTR'
          });
          const formattedIndices = LTRResult.matchedIndices.map(({ col, row }) => `${col},${row}`);
          const validIndices = formattedIndices.filter(
            (index) => index.length > 2
          );
          if (validIndices.length > 0) {
            // console.log(validIndices);
            settings._winData.winningSymbols.push(validIndices);
            settings._winData.totalWinningAmount = totalPayout * settings.BetPerLines;
            // console.log(settings._winData.totalWinningAmount)
          }
          // console.log(`Line ${index + 1} (LTR):`, line);
          // console.log(`Payout for LTR Line ${index + 1}:`, "payout", payout);
          return;
        }
      }

      // Right-to-left check
      const RTLResult = checkLineSymbols(firstSymbolRTL, line, gameInstance, 'RTL');
      if (RTLResult.isWinningLine && RTLResult.matchCount >= 3) {
        const symbolMultiplierRTL = accessData(firstSymbolRTL, RTLResult.matchCount, gameInstance);
        if (symbolMultiplierRTL > 0) {
          const payout = symbolMultiplierRTL * gameInstance.settings.BetPerLines;
          totalPayout += payout;
          gameInstance.playerData.currentWining += payout;
          settings._winData.winningLines.push(index + 1);
          winningLines.push({
            line,
            symbol: firstSymbolRTL,
            multiplier: symbolMultiplierRTL,
            matchCount: RTLResult.matchCount,
            direction: 'RTL'
          });
          const formattedIndices = RTLResult.matchedIndices.map(({ col, row }) => `${col},${row}`);
          const validIndices = formattedIndices.filter(
            (index) => index.length > 2
          );
          if (validIndices.length > 0) {
            // console.log(validIndices);
            settings._winData.winningSymbols.push(validIndices);
            settings._winData.totalWinningAmount = totalPayout * settings.BetPerLines;
            // console.log(settings._winData.totalWinningAmount)
          }
          // console.log(`Line ${index + 1} (RTL):`, line);
          // console.log(`Payout for RTL Line ${index + 1}:`, "payout", payout);
        }
      }
    });
    //NOTE: not starburst
    if (!settings.isStarBurst && settings.starBurstReel.length === 0) {

      gameInstance.playerData.currentWining = precisionRound(totalPayout,5)
      gameInstance.playerData.haveWon = precisionRound((
        gameInstance.playerData.haveWon + totalPayout), 5)
      gameInstance.updatePlayerBalance(gameInstance.playerData.currentWining)
      makeResultJson(gameInstance)

      settings.starBurstReel = []
      settings.isStarBurst = false
      settings.starBurstResponse = []
      //NOTE: starburst last spin
    } else if (!settings.isStarBurst && settings.starBurstReel.length > 0) {
      //swapback
      settings.resultSymbolMatrix = settings.starBurstTriggerMatrix



      settings.starBurstResponse.push({
        resultMatrix: settings.resultSymbolMatrix,
        symbolsToEmit: settings._winData.winningSymbols,
        linesToEmit: settings._winData.winningLines,
        payout: totalPayout
      })

      let starBurstPayout = 0
      settings.starBurstResponse.forEach((response) => {
        starBurstPayout += response.payout
      })

      gameInstance.playerData.currentWining = precisionRound((
         starBurstPayout ), 5)
      gameInstance.playerData.haveWon = precisionRound((
        gameInstance.playerData.haveWon + gameInstance.playerData.currentWining), 5)

      gameInstance.updatePlayerBalance(gameInstance.playerData.currentWining)
      //FIX:  clearing redundant data .remove it later maybe 
      settings.resultSymbolMatrix = settings.starBurstTriggerMatrix
      settings._winData.winningLines = []
      settings._winData.winningSymbols = []

      makeResultJson(gameInstance)

      settings.starBurstReel = []
      settings.isStarBurst = false
      settings.starBurstResponse = []
      //NOTE: starburst spins
    } else {

      //swapback
      settings.resultSymbolMatrix = settings.starBurstTriggerMatrix

      settings.starBurstResponse.push({
        resultMatrix: settings.resultSymbolMatrix,
        symbolsToEmit: settings._winData.winningSymbols,
        linesToEmit: settings._winData.winningLines,
        payout: totalPayout
      })

      settings._winData.winningLines = []
      settings._winData.winningSymbols = []
      //NOTE: run checkwin again since it is a freespin
      new RandomResultGenerator(gameInstance);
      checkForWin(gameInstance)
    }
    settings._winData.winningLines = []
    settings._winData.winningSymbols = []
    settings.starBurstTriggerMatrix = []

    return winningLines;
  } catch (error) {
    console.error("Error in checkForWin:", error);
    return [];
  }
}


//MAKERESULT JSON FOR FRONTEND 
export function makeResultJson(gameInstance: SLSB) {
  try {
    const { settings, playerData } = gameInstance;
    const credits = gameInstance.getPlayerData().credits
    const Balance = credits.toFixed(4)
    const sendData = {
      GameData: {
        resultSymbols: settings.resultSymbolMatrix,
        linesToEmit: settings._winData.winningLines,
        symbolsToEmit: settings._winData.winningSymbols,
        isStarBurst: settings.starBurstReel.length > 0,
        starBurstReel: settings.starBurstReel,
        starBurstResponse: settings.starBurstResponse
      },
      PlayerData: {
        Balance: Balance,
        totalbet: playerData.totalbet,
        haveWon: playerData.haveWon,
        currentWining: playerData.currentWining
      }
    };
    console.log(JSON.stringify(sendData));

    gameInstance.sendMessage('ResultData', sendData);
  } catch (error) {
    console.error("Error generating result JSON or sending message:", error);
  }
}
