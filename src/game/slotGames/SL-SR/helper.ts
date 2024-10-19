import { WinData } from "../BaseSlotGame/WinData";
import {
  convertSymbols,
  gameCategory,
  PlayerData,
  UiInitData,
} from "../../Utils/gameUtils";
import { SLSR } from "./stinkinRichBase";
import { specialIcons } from "./types";
import { RandomResultGenerator } from "../RandomResultGenerator";

/**
 * Initializes the game settings using the provided game data and game instance.
 * @param gameData - The data used to configure the game settings.
 * @param gameInstance - The instance of the SLCM class that manages the game logic.
 * @returns An object containing initialized game settings.
 */
export function initializeGameSettings(gameData: any, gameInstance: SLSR) {
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
    freeSpinCount: 0,
    freeSpin: {
      symbolID: "-1",
      freeSpinMuiltiplier: [],
      freeSpinStarted: false,
      freeSpinsAdded: false,
      freeSpinCount: 0,
      noOfFreeSpins: 0,
      useFreeSpin: false,
    },
    wild: {
      SymbolName: "",
      SymbolID: -1,
      useWild: false,
    },
    bonus: {
      start: false,
      stopIndex: -1,
      game: null,
      id: -1,
      symbolCount: -1,
      pay: -1,
      useBonus: false,
    },
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

export function makePayLines(gameInstance: SLSR) {
  const { settings } = gameInstance;
  settings.currentGamedata.Symbols.forEach((element) => {
    if (!element.useWildSub) {
      handleSpecialSymbols(element, gameInstance);
    }
  });
}

function handleSpecialSymbols(symbol: any, gameInstance: SLSR) {
  switch (symbol.Name) {
    case specialIcons.FreeSpin:
      gameInstance.settings.freeSpin.symbolID = symbol.Id;
      gameInstance.settings.freeSpin.freeSpinMuiltiplier = symbol.multiplier;
      gameInstance.settings.freeSpin.useFreeSpin = true;
      break;

    case specialIcons.wild:
      gameInstance.settings.wild.SymbolName = symbol.Name;
      gameInstance.settings.wild.SymbolID = symbol.Id;
      gameInstance.settings.wild.useWild = true;
      break;
    case specialIcons.bonus:
      gameInstance.settings.bonus.id = symbol.Id;
      gameInstance.settings.bonus.symbolCount = symbol.symbolCount;
      gameInstance.settings.bonus.pay = symbol.pay;
      gameInstance.settings.bonus.useBonus = true;
       break;
    default:
      break;
  }
}

/// Function to check for wins on paylines with or without wild symbols
export function checkForWin(gameInstance: SLSR) {
  try {
    const { settings } = gameInstance;
    const winningLines = [];
    let totalPayout = 0;

    settings.lineData.forEach((line, index) => {
      const firstSymbolPosition = line[0];
      let firstSymbol = settings.resultSymbolMatrix[firstSymbolPosition][0];

      // Handle wild symbols
      if (settings.wild.useWild && firstSymbol === settings.wild.SymbolID) {
        firstSymbol = findFirstNonWildSymbol(line, gameInstance);
      }

      // Handle special icons
      if (Object.values(specialIcons).includes(settings.Symbols[firstSymbol].Name as specialIcons)) {
        console.log("Special Icon Matched : ", settings.Symbols[firstSymbol].Name);
        return;
      }

      // Check for matching symbols on the line
      const { isWinningLine, matchCount } = checkLineSymbols(firstSymbol, line, gameInstance);

      if (firstSymbol === gameInstance.settings.freeSpin.symbolID )
        {
          const { isWinningLine, matchCount } = checkLineSymbols(firstSymbol, line, gameInstance);
          
        }

      if (isWinningLine && matchCount >= 3) {
        const symbolMultiplier = accessData(firstSymbol, matchCount, gameInstance);

        if (symbolMultiplier > 0) {
          totalPayout = symbolMultiplier * gameInstance.settings.BetPerLines;
          gameInstance.playerData.currentWining += totalPayout ;
          settings._winData.winningLines.push(index + 1);
          winningLines.push({
            line,
            symbol: firstSymbol,
            multiplier: symbolMultiplier,
            matchCount,
          });
          console.log(`Line ${index + 1}:`, line);
          console.log(`Payout for Line ${index + 1}:`, "payout",totalPayout);
        }
      }
    });
    
    console.log("Total Winning",gameInstance.playerData.currentWining);
    console.log("freespin id ",gameInstance.settings.freeSpin.symbolID);
    console.log("bonus id ",gameInstance.settings.bonus.id);
    gameInstance.playerData.haveWon += gameInstance.playerData.currentWining
    makeResultJson(gameInstance)
    return winningLines;
  } catch (error) {
    console.error("Error in checkForWin", error);
    return [];
  }
}

// Function to check for matching symbols on a line (with wild substitution)
function checkLineSymbols(
  firstSymbol: string,
  line: number[],
  gameInstance: SLSR
): {
  isWinningLine: boolean;
  matchCount: number;
} {
  try {
    const { settings } = gameInstance;
    const wildSymbol = settings.wild.SymbolID || "";
    let matchCount = 1;
    let currentSymbol = firstSymbol;

    for (let i = 1; i < line.length; i++) {
      const rowIndex = line[i];
      const symbol = settings.resultSymbolMatrix[rowIndex][i];

      if (symbol === undefined) {
        console.error(`Symbol at position [${rowIndex}, ${i}] is undefined.`);
        return { isWinningLine: false, matchCount: 0 };
      }

      if (symbol === currentSymbol || symbol === wildSymbol) {
        matchCount++;
      } else if (currentSymbol === wildSymbol) {
        currentSymbol = symbol;
        matchCount++;
      } else {
        return { isWinningLine: matchCount >= 3, matchCount };
      }
    }

    return { isWinningLine: matchCount >= 3, matchCount };
  } catch (error) {
    console.error("Error in checkLineSymbols:", error);
    return { isWinningLine: false, matchCount: 0 };
  }
}

// Function to find the first non-wild symbol on a line
function findFirstNonWildSymbol(line: number[], gameInstance: SLSR) {
  try {
    const { settings } = gameInstance;
    const wildSymbol = settings.wild.SymbolID;

    for (let i = 0; i < line.length; i++) {
      const rowIndex = line[i];
      const symbol = settings.resultSymbolMatrix[rowIndex][i];
      
      if (symbol !== wildSymbol) {
        return symbol;
      }
    }

    return wildSymbol;
  } catch (error) {
    console.error("Error in findFirstNonWildSymbol:", error);
    return null;
  }
}

//payouts to user according to symbols count in matched lines
function accessData(symbol, matchCount, gameInstance: SLSR) {
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
    // console.error("Error in accessData:");
    return 0;
  }
}


/**
 * Handles cascading mechanic and checks for additional wins.
 * @param gameInstance - The game instance to apply cascading to.
 */

/**
 * Sends the initial game and player data to the client.
 * @param gameInstance - The instance of the SLCM class containing the game settings and player data.
 */
export function sendInitData(gameInstance: SLSR) {
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
      // freeSpinData: gameInstance.settings.currentGamedata.freeSpinData,
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

export function makeResultJson(gameInstance: SLSR) {
  try {
    const { settings, playerData } = gameInstance;
    const credits = gameInstance.getPlayerData().credits 
    const Balance = credits.toFixed(2)
    const sendData = {
      GameData: {
        linesToEmit: settings._winData.winningLines,
        symbolsToEmit: settings._winData.winningSymbols,
        isFreeSpin: settings.freeSpin.useFreeSpin,
        freeSpinCount: settings.freeSpin.freeSpinCount,
      },
      PlayerData: {
        Balance: Balance,
        totalbet: playerData.totalbet,
        currentWining : playerData.currentWining,
        haveWon: playerData.haveWon,
      }
    };
    gameInstance.sendMessage('ResultData', sendData);
  } catch (error) {
    console.error("Error generating result JSON or sending message:", error);
  }
}