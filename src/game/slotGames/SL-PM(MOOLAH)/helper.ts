import { WinData } from "../BaseSlotGame/WinData";
import {
  convertSymbols,
  gameCategory,
  PlayerData,
  UiInitData,
  shuffleArray
} from "../../Utils/gameUtils";
import { SLPM } from "./planetMoolahBase";
import { specialIcons } from "./types";
import { RandomResultGenerator } from "../RandomResultGenerator";

/**
 * Initializes the game settings using the provided game data and game instance.
 * @param gameData - The data used to configure the game settings.
 * @param gameInstance - The instance of the SLCM class that manages the game logic.
 * @returns An object containing initialized game settings.
 */
export function initializeGameSettings(gameData: any, gameInstance: SLPM) {
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
    hasCascading: false,
    cascadingNo: 0,
    payoutAfterCascading: 0,
    cascadingResult: [],
    lastReel: [],
    tempReel: [],
    firstReel: [],
    tempReelSym: [],
    freeSpinData: gameData.gameSettings.freeSpinData,
    jackpotWinSymbols: [],
    jackpot: {
      symbolName: "",
      symbolsCount: 0,
      symbolId: 0,
      defaultAmount: 0,
      increaseValue: 0,
      useJackpot: false,
      jackpotCount: 0
    },
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


export function makePayLines(gameInstance: SLPM) {
  const { settings } = gameInstance;
  settings.currentGamedata.Symbols.forEach((element) => {
    if (!element.useWildSub) {
      handleSpecialSymbols(element, gameInstance);
    }
  });
}

function handleSpecialSymbols(symbol: any, gameInstance: SLPM) {
  switch (symbol.Name) {
    case specialIcons.jackpot:
      gameInstance.settings.jackpot.symbolName;
      gameInstance.settings.jackpot.symbolId = symbol.Id;
      gameInstance.settings.jackpot.symbolsCount = symbol.symbolsCount;
      gameInstance.settings.jackpot.defaultAmount = symbol.defaultAmount;
      gameInstance.settings.jackpot.increaseValue = symbol.increaseValue;
      gameInstance.settings.jackpot.useJackpot = true;
      break;
    case specialIcons.wild:
      gameInstance.settings.wild.SymbolName = symbol.Name;
      gameInstance.settings.wild.SymbolID = symbol.Id;
      gameInstance.settings.wild.useWild = true;

      break;
    default:
      break; ``
  }
}

//CHECK WINS ON PAYLINES WITH OR WITHOUT WILD
//check for win function
export function checkForWin(gameInstance: SLPM) {
  try {
    const { settings } = gameInstance;
    if (settings.cascadingNo === 0) {
      settings.firstReel = [...settings.resultSymbolMatrix.map(row => [...row])]; // Deep copy to preserve the original matrix
    }
    if (settings.jackpot?.jackpotCount == 1) {

      console.info("No jackpot to check as count us already 1 !");
    } else {
      checkForJackpot(gameInstance);
    }
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
      if (
        Object.values(specialIcons).includes(
          settings.Symbols[firstSymbol].Name as specialIcons
        )
      ) {

        return;
      }
      const { isWinningLine, matchCount, matchedIndices } = checkLineSymbols(
        firstSymbol,
        line,
        gameInstance
      );
      switch (true) {
        case isWinningLine && matchCount >= 3:
          const symbolMultiplier = accessData(
            firstSymbol,
            matchCount,
            gameInstance
          );
          settings.lastReel = settings.resultSymbolMatrix;


          switch (true) {
            case symbolMultiplier > 0:
              totalPayout += symbolMultiplier;
              settings._winData.winningLines.push(index + 1);
              winningLines.push({
                line,
                symbol: firstSymbol,
                multiplier: symbolMultiplier,
                matchCount,
              });
              // console.log(`Line ${index + 1}:`, line);
              // console.log(
              //   `Payout for Line ${index + 1}:`,
              //   "payout",
              //   symbolMultiplier
              // );
              const formattedIndices = matchedIndices.map(({ col, row }) => `${col},${row}`);
              const validIndices = formattedIndices.filter(
                (index) => index.length > 2
              );
              if (validIndices.length > 0) {
                // console.log(settings.lastReel, 'settings.lastReel')
                console.log(validIndices);
                settings._winData.winningSymbols.push(validIndices);
                settings._winData.totalWinningAmount = totalPayout * settings.BetPerLines;
                console.log(settings._winData.totalWinningAmount)
              }
              break;
            default:
              break;
          }
          break;
        default:
          break;
      }
    });

    switch (true) {
      case winningLines.length >= 1:
        settings.cascadingNo += 1;
        settings.hasCascading = true;
        new RandomResultGenerator(gameInstance);
        settings.tempReel = settings.resultSymbolMatrix;
        ExtractTempReelsWiningSym(gameInstance);
        break;
      default:
        console.log("NO PAYLINE MATCH");
        if (settings.cascadingNo >= 4 && !settings.freeSpin.useFreeSpin && !settings.freeSpin.freeSpinStarted) {
          const freeSpinData = settings.freeSpinData;
          for (let i = 0; i < freeSpinData.length; i++) {
            const [requiredCascadingCount, awardedFreeSpins] = freeSpinData[i];

            if (settings.cascadingNo == requiredCascadingCount) {
              settings.freeSpin.useFreeSpin = true;
              settings.freeSpin.freeSpinStarted = true;
              settings.freeSpin.freeSpinCount += awardedFreeSpins;
              console.log(`Free spins awarded: ${awardedFreeSpins}`);
              break;
            }
            if (settings.cascadingNo > 8) {
              settings.freeSpin.useFreeSpin = true;
              settings.freeSpin.freeSpinStarted = true;
              settings.freeSpin.freeSpinCount = 25;
              console.log(`Free spins awarded: ${settings.freeSpin.freeSpinCount}`);
              break;
            }
          }
        }
        makeResultJson(gameInstance)
        gameInstance.updatePlayerBalance(settings.payoutAfterCascading)
        settings.cascadingNo = 0;
        settings.hasCascading = false;
        settings.resultSymbolMatrix = [];
        settings.tempReelSym = [];
        settings.tempReel = [];
        settings.payoutAfterCascading = 0;
        settings.cascadingResult = [];
        settings.freeSpin.useFreeSpin = false;
        settings.jackpot.jackpotCount = 0;
        settings._winData.jackpotwin = 0;
        settings._winData.winningSymbols = []
        break;
    }
    return winningLines;
  } catch (error) {
    console.error("Error in checkForWin", error);
    return [];
  }
}
//checking matching lines with first symbol and wild subs
function checkLineSymbols(
  firstSymbol: string,
  line: number[],
  gameInstance: SLPM
): {
  isWinningLine: boolean;
  matchCount: number;
  matchedIndices: { col: number; row: number }[];
} {
  try {
    const { settings } = gameInstance;
    const wildSymbol = settings.wild.SymbolID || "";
    let matchCount = 1;
    let currentSymbol = firstSymbol;
    const matchedIndices: { col: number; row: number }[] = [
      { col: 0, row: line[0] },
    ];
    for (let i = 1; i < line.length; i++) {
      const rowIndex = line[i];
      const symbol = settings.resultSymbolMatrix[rowIndex][i];
      if (symbol === undefined) {
        console.error(`Symbol at position [${rowIndex}, ${i}] is undefined.`);
        return { isWinningLine: false, matchCount: 0, matchedIndices: [] };
      }
      switch (true) {
        case symbol == currentSymbol || symbol === wildSymbol:
          matchCount++;
          matchedIndices.push({ col: i, row: rowIndex });
          break;
        case currentSymbol === wildSymbol:
          currentSymbol = symbol;
          matchCount++;
          matchedIndices.push({ col: i, row: rowIndex });
          break;
        default:
          return { isWinningLine: matchCount >= 3, matchCount, matchedIndices };
      }
    }
    return { isWinningLine: matchCount >= 3, matchCount, matchedIndices };
  } catch (error) {
    console.error("Error in checkLineSymbols:", error);
    return { isWinningLine: false, matchCount: 0, matchedIndices: [] };
  }
}

//checking first non wild symbol in lines which start with wild symbol
function findFirstNonWildSymbol(line, gameInstance: SLPM) {
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
    // console.error("Error in findFirstNonWildSymbol:");
    return null;
  }
}

//payouts to user according to symbols count in matched lines
function accessData(symbol, matchCount, gameInstance: SLPM) {
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
//
function shuffleTempArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
function ExtractTempReelsWiningSym(gameInstance) {
  const { settings } = gameInstance;
  settings.tempReel = shuffleTempArray(settings.tempReel.flat());
  settings.tempReelSym = settings.tempReel
  setToMinusOne(gameInstance);
}

function setToMinusOne(gameInstance: SLPM) {
  const { settings } = gameInstance;
  const valuesWithIndices = settings._winData.winningSymbols.flatMap(
    (symbolIndices) => {
      return symbolIndices.map((indexStr) => {
        const [col, row] = indexStr.split(",").map(Number);
        const symbolValues = (settings.lastReel[row][col] = -1);
        return {
          value: symbolValues,
        };
      });
    }
  );
  console.log(settings.lastReel, "Winning symbols set to -1");
  cascadeSymbols(gameInstance);
  return valuesWithIndices;
}

/**
 * Handles cascading mechanic and checks for additional wins.
 * @param gameInstance - The game instance to apply cascading to.
 */
function cascadeSymbols(gameInstance) {
  const data = {
    symbolsToFill: [],
    winingSymbols: [],
    lineToEmit: [],
    currentWining: 0,
  }
  const { settings } = gameInstance;
  const rows = settings.lastReel.length;
  const cols = settings.lastReel[0].length;

  for (let col = 0; col < cols; col++) {
    let columnSymbols = [];
    for (let row = rows - 1; row >= 0; row--) {
      if (settings.lastReel[row][col] !== -1) {
        columnSymbols.push(settings.lastReel[row][col]);
      }
    }

    let index = rows - 1;
    for (let symbol of columnSymbols) {
      settings.lastReel[index--][col] = symbol;
    }
    while (index >= 0) {
      settings.lastReel[index--][col] = -1;
    }
  }

  const flattenedReel = settings.lastReel;
  let tempSymbols = settings.tempReelSym.flat();
  const assignedSymbolsByCol = [];
  for (let col = 0; col < cols; col++) {
    let assignedSymbols = [];
    let totalEmptySlots = 0;
    for (let row = 0; row < rows; row++) {
      if (flattenedReel[row][col] === -1) {
        totalEmptySlots++;
      }
    }
    let symbolsToUse = tempSymbols.slice(0, totalEmptySlots);
    tempSymbols = tempSymbols.slice(totalEmptySlots);
    for (let row = 0; row < rows; row++) {
      if (flattenedReel[row][col] === -1 && symbolsToUse.length > 0) {
        flattenedReel[row][col] = symbolsToUse.shift();
        assignedSymbols.push(flattenedReel[row][col]);
      }
    }
    assignedSymbolsByCol.push(assignedSymbols);
    console.log(flattenedReel, "newreel");

  }
  data.symbolsToFill = assignedSymbolsByCol;
  data.lineToEmit = settings._winData.winningLines;
  data.winingSymbols = settings._winData.winningSymbols;
  data.currentWining = settings._winData.totalWinningAmount;
  settings.payoutAfterCascading += settings._winData.totalWinningAmount;
  gameInstance.playerData.payoutAfterCascading += settings._winData.totalWinningAmount;
  gameInstance.playerData.haveWon += settings._winData.totalWinningAmount;
  settings.cascadingResult.push({ ...data });
  data.symbolsToFill = [];
  data.lineToEmit = [];
  data.winingSymbols = [];
  data.currentWining = 0;
  settings.resultSymbolMatrix = flattenedReel;
  settings._winData.winningSymbols = []
  settings.tempReelSym = [];
  settings.tempReel = [];
  settings._winData.winningLines = [];
  checkForWin(gameInstance);

}
/**
 * Evaluates and processes jackpot conditions for the game.
 * If the jackpot is triggered, updates game settings, player data, and win data accordingly.
 * 
 * @param {SLPM} gameInstance - The instance of the game containing settings and player data.
 */
export function checkForJackpot(gameInstance) {
  try {
    const { settings, playerData } = gameInstance;

    console.log("!!!!! CHECK JACKPOT!!!!!");

    if (settings.jackpot.useJackpot) {
      const jackpotSymbols = findSymbol(specialIcons.jackpot, gameInstance);
      switch (true) {

        case jackpotSymbols.length >= 5:

          settings.jackpotWinSymbols.push(...jackpotSymbols);

          console.log("jackpotWinSymbols", settings.jackpotWinSymbols.length);
        case settings.jackpot.symbolsCount > 0 &&
          settings.jackpotWinSymbols.length == settings.jackpot.symbolsCount:
          console.log("!!!!!JACKPOT WON!!!!!");
          settings.jackpot.jackpotCount = 1;
          const jackpotAmount = settings.jackpot.defaultAmount * settings.BetPerLines;
          settings._winData.winningSymbols.push(settings.jackpotWinSymbols);
          settings._winData.totalWinningAmount += jackpotAmount;
          settings.payoutAfterCascading += jackpotAmount;
          settings._winData.jackpotwin += jackpotAmount;
          playerData.haveWon += jackpotAmount;
          break;

        default:
          console.info("No jackpot conditions met.");
          break;
      }
    }
  } catch (error) {
    console.error(`An error occurred in checkForJackpot: ${error.message}`);
  }
}


/**
 * Searches for the coordinates of a specific symbol in the game's result matrices.
 * The function adapts based on whether the game uses cascading symbols.
 * 
 * @param {string} symbolName - The name of the symbol to find.
 * @param {SLPM} gameInstance - The instance of the game containing settings and data.
 * @returns {string[]} An array of coordinate strings ("x,y") where the symbol is found.
 */
function findSymbol(symbolName, gameInstance) {
  try {
    const { settings } = gameInstance;
    let symbolId = -1;
    const foundArray = [];

    // Find the symbol ID based on the provided name.
    const targetSymbol = settings.currentGamedata.Symbols.find(
      (symbol) => symbol.Name === symbolName
    );

    if (targetSymbol) {
      symbolId = targetSymbol.Id;
    } else {
      console.warn(`Symbol "${symbolName}" not found in game data.`);
      return foundArray;
    }

    // Determine the matrix to search based on cascading settings.
    const matrixToSearch = settings.hasCascading
      ? settings.lastReel
      : settings.resultSymbolMatrix;

    if (!Array.isArray(matrixToSearch) || matrixToSearch.length === 0) {
      console.error("Matrix to search is not valid or empty.");
      return foundArray;
    }

    // Iterate through the matrix to find symbol coordinates.
    for (let row = 0; row < matrixToSearch.length; row++) {
      for (let col = 0; col < matrixToSearch[row].length; col++) {
        if (matrixToSearch[row][col] === symbolId) {
          foundArray.push(`${col},${row}`);
        }
      }
    }

    if (foundArray.length === 0) {
      console.info(`Symbol "${symbolName}" with ID ${symbolId} not found in the matrix.`);
    }

    return foundArray;
  } catch (error) {
    console.error(`An error occurred while finding the symbol: ${error.message}`);
    return [];
  }
}

/**
 * Sends the initial game and player data to the client.
 * @param gameInstance - The instance of the SLCM class containing the game settings and player data.
 */
export function sendInitData(gameInstance: SLPM) {
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
      freeSpinData: gameInstance.settings.freeSpinData,
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

export function makeResultJson(gameInstance: SLPM) {
  try {
    const { settings, playerData } = gameInstance;
    const credits = gameInstance.getPlayerData().credits + settings.payoutAfterCascading
    const Balance = credits.toFixed(2)
    const sendData = {
      GameData: {
        resultSymbols: settings.firstReel,
        linesToEmit: settings._winData.winningLines,
        symbolsToEmit: settings._winData.winningSymbols,
        jackpot: settings._winData.jackpotwin,
        cascading: settings.cascadingResult,
        isCascading: settings.hasCascading,
        isFreeSpin: settings.freeSpin.useFreeSpin,
        freeSpinCount: settings.freeSpin.freeSpinCount,

      },
      PlayerData: {
        Balance: Balance,
        currentWining: settings.payoutAfterCascading,
        totalbet: playerData.totalbet,
        haveWon: playerData.haveWon,
      }
    };
    gameInstance.sendMessage('ResultData', sendData);
  } catch (error) {
    console.error("Error generating result JSON or sending message:", error);
  }
}