import { WinData } from "../BaseSlotGame/WinData";
import {
  convertSymbols,
  UiInitData,
  shuffleArray
} from "../../Utils/gameUtils";

import { specialIcons } from "./types";
import { SLFLC } from "./FireLinkChinaTownBase";
import { precisionRound } from "../../../utils/utils";
import { checkForBonus, handleBonusSpin, populateScatterValues } from "./bonus";

/**
 * Initializes the game settings using the provided game data and game instance.
 * @param gameData - The data used to configure the game settings.
 * @param gameInstance - The instance of the SLCM class that manages the game logic.
 * @returns An object containing initialized game settings.
 */
export function initializeGameSettings(gameData: any, gameInstance: SLFLC) {
  return {
    id: gameData.gameSettings.id,
    matrix: gameData.gameSettings.matrix,
    currentGamedata: gameData.gameSettings,
    resultSymbolMatrix: [],
    bonusResultMatrix: [],
    bets: gameData.gameSettings.bets,
    Symbols: gameInstance.initSymbols,
    lineData: [],
    _winData: new WinData(gameInstance),
    currentBet: 0,
    currentLines: 0,
    BetPerLines: 0,
    reels: [],
    bonusReels: [],
    isFreespin: false,
    freespinCount: -1,
    bonus: {
      isTriggered: false,
      scatterCount: 0,
      spinCount: -1
    },
    wild: {
      SymbolName: "",
      SymbolID: -1,
      useWild: false,
    },
    freespin: {
      SymbolName: "",
      SymbolID: -1,
      defaultOptionIndex: gameData.gameSettings.defaultFreespinOption,
      optionIndex: gameData.gameSettings.defaultFreespinOption,
      options: gameData.gameSettings.freespinOptions,
    },
    scatter: {
      SymbolName: "",
      SymbolID: -1,
      bonusTrigger: gameData.gameSettings.scatterTrigger,
      scatterMultipliers: gameData.gameSettings.scatterValues,
      scatterProbs: gameData.gameSettings.scatterProbs,
      values: []
    },
    blank: {
      SymbolName: "",
      SymbolID: -1,
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
  // const baseSymbols = gameSettings.Symbols.filter((symbol) => !symbol.useBonus || symbol.Name === specialIcons.scatter);
  // console.log(baseSymbols);

  gameSettings.Symbols.forEach((symbol) => {
    for (let i = 0; i < 5; i++) {
      const count = symbol.reelInstance[i] || 0;
      for (let j = 0; j < count; j++) {
        if (!symbol.useBonus || symbol.Name == specialIcons.scatter) {
          reels[i].push(symbol.Id);
        }
      }
    }
  });
  reels.forEach((reel) => {
    shuffleArray(reel);
  });
  gameSettings.reels = reels;

  return reels;
}


export function makePayLines(gameInstance: SLFLC) {
  const { settings } = gameInstance;
  settings.currentGamedata.Symbols.forEach((element) => {
    if (!element.useWildSub) {
      handleSpecialSymbols(element, gameInstance);
    }
  });
}
function handleSpecialSymbols(symbol: any, gameInstance: SLFLC) {
  switch (symbol.Name) {
    case specialIcons.wild:
      gameInstance.settings.wild.SymbolName = symbol.Name;
      gameInstance.settings.wild.SymbolID = symbol.Id;
      gameInstance.settings.wild.useWild = true;
      break;
    case specialIcons.scatter:
      gameInstance.settings.scatter.SymbolName = symbol.Name;
      gameInstance.settings.scatter.SymbolID = symbol.Id;
      break;
    case specialIcons.freespin:
      gameInstance.settings.freespin.SymbolName = symbol.Name;
      gameInstance.settings.freespin.SymbolID = symbol.Id;
      // gameInstance.settings.freespin.freeSpinMuiltiplier = symbol.multiplier
      // gameInstance.settings.freespin.useFreeSpin = true;
      break;
    case specialIcons.blank:
      gameInstance.settings.blank.SymbolName = symbol.Name;
      gameInstance.settings.blank.SymbolID = symbol.Id;
      break;
    default:
      break;
  }
}


//checking matching lines with first symbol and wild subs
type MatchedIndex = { col: number; row: number };
type CheckLineResult = { isWinningLine: boolean; matchCount: number; matchedIndices: MatchedIndex[], isWild: boolean };
//checking matching lines with first symbol and wild subs
function checkLineSymbols(
  firstSymbol: string,
  line: number[],
  gameInstance: SLFLC,
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
function findFirstNonWildSymbol(line, gameInstance: SLFLC) {
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
function accessData(symbol, matchCount, gameInstance: SLFLC) {
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
export function findSymbol(gameInstance: SLFLC, SymbolName: string): string[] {
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


export function getRandomValue(gameInstance: SLFLC, type:
  'scatter'
): number {
  const { settings } = gameInstance;

  let values: number[];
  let probabilities: number[];

  switch (type) {
    case "scatter":
      if (settings.matrix.y === settings.scatter.bonusTrigger.slice(-1)[0].rows) {
        values = settings.scatter.scatterMultipliers
        probabilities = settings.scatter.scatterProbs
      } else {
        values = settings.scatter.scatterMultipliers.slice(0, -3)
        probabilities = settings.scatter.scatterProbs.slice(0, -3)
      }
      break;
    default:
      console.error("Invalid type, expected 'scatter' or 'blank'");
      break;
  }

  const totalProbability = probabilities.reduce((sum, prob) => sum + prob, 0);
  const randomValue = Math.random() * totalProbability;

  let cumulativeProbability = 0;
  for (let i = 0; i < probabilities.length; i++) {
    cumulativeProbability += probabilities[i];
    if (randomValue < cumulativeProbability) {
      return values[i];
    }
  }
  return values[0];
}

/**
 * Checks if the Free Spin condition is met and awards free spins to the player.
 * @param gameInstance - The instance of the SLPSF class containing the game settings and player data.
 */
export function checkForFreeSpin(gameInstance: SLFLC): boolean {
  const { settings } = gameInstance;
  try {
    let flag1 = false;
    let flag2 = false;
    let flag3 = false;
    findSymbol(gameInstance, settings.freespin.SymbolName).forEach((pos) => {
      switch (pos.split(',')[0]) {
        case "1":
          flag1 = true;
          break;
        case "2":
          flag2 = true;
          break;
        case "3":
          flag3 = true;
          break;
        default:
          // console.log("no found in freespin check")
          break;
      }
    })
    return flag1 && flag2 && flag3
  } catch (error) {
    console.error("Error in checkForFreeSpin:", error);
  }
}

//CHECK WINS ON PAYLINES WITH OR WITHOUT WILD
export function checkForWin(gameInstance: SLFLC) {
  try {
    const { settings } = gameInstance;

    const winningLines = [];
    let totalPayout = 0;



    if (settings.bonus.spinCount <= 0) {
      settings.lineData.forEach((line, index) => {
        const firstSymbolPositionLTR = line[0];
        // const firstSymbolPositionRTL = line[line.length - 1];

        // Get first symbols for both directions
        let firstSymbolLTR = settings.resultSymbolMatrix[firstSymbolPositionLTR][0];
        // let firstSymbolRTL = settings.resultSymbolMatrix[firstSymbolPositionRTL][line.length - 1];

        // Handle wild symbols for both directions
        if (firstSymbolLTR === settings.wild.SymbolID) {
          firstSymbolLTR = findFirstNonWildSymbol(line, gameInstance);
        }

        // Left-to-right check
        const LTRResult = checkLineSymbols(firstSymbolLTR, line, gameInstance, 'LTR');
        if (LTRResult.isWinningLine && LTRResult.matchCount >= 3) {

          //FIX: add freespin multiplier feat
          let symbolMultiplierLTR = accessData(firstSymbolLTR, LTRResult.matchCount, gameInstance);
          if (symbolMultiplierLTR > 0) {
            if (settings.freespinCount > -1) {

              // console.log("matchCount", LTRResult.matchCount);
              // console.log("multiplierBase", symbolMultiplierLTR);
              switch (LTRResult.matchCount) {
                case 3:
                  symbolMultiplierLTR *= settings.freespin.options[settings.freespin.optionIndex].multiplier[0];
                  break;
                case 4:
                  symbolMultiplierLTR *= settings.freespin.options[settings.freespin.optionIndex].multiplier[1];
                  break;
                case 5:
                  symbolMultiplierLTR *= settings.freespin.options[settings.freespin.optionIndex].multiplier[2];
                  break;
                default:
                  console.log('error in freespin multiplier')
                  break;
              }

              console.log("multiplierNew", symbolMultiplierLTR);
            }
            const payout = symbolMultiplierLTR * gameInstance.settings.BetPerLines;
            totalPayout += payout;
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
              settings._winData.winningSymbols.push(validIndices);
              settings._winData.totalWinningAmount = precisionRound((totalPayout * settings.BetPerLines), 4);
            }
            return;
          }
        }
      });

      //NOTE: check for freespin 
      if (checkForFreeSpin(gameInstance)) {
        console.info("Freespin triggered")
        settings.isFreespin = true
        settings.freespinCount = settings.freespin.options[settings.freespin.optionIndex].count
      }
    }
    populateScatterValues(gameInstance, settings.bonus.spinCount < 0 ? "base" : "bonus")


    if (settings.bonus.spinCount < 0) {
      //NOTE: check for bonus 
      console.log("bonus", checkForBonus(gameInstance))
      gameInstance.playerData.currentWining = precisionRound(totalPayout, 5);
      gameInstance.playerData.haveWon = precisionRound(gameInstance.playerData.haveWon +
        gameInstance.playerData.currentWining, 5)
    } else {
      handleBonusSpin(gameInstance)
      gameInstance.playerData.haveWon = precisionRound(gameInstance.playerData.haveWon +
        gameInstance.playerData.currentWining, 5)
    }

    makeResultJson(gameInstance)

    settings.isFreespin = false
    if (settings.bonus.spinCount > 0) {
      settings.bonus.isTriggered = false
    }
    if (settings.bonus.spinCount < 0) {
      settings.bonus.scatterCount = 0
      settings.bonusResultMatrix = []
      settings.scatter.values = []
    }
    settings._winData.winningLines = []
    settings._winData.winningSymbols = []

    return winningLines;
  } catch (error) {
    console.error("Error in checkForWin", error);
    return [];
  }
}

/**
 * Sends the initial game and player data to the client.
 * @param gameInstance - The instance of the SLCM class containing the game settings and player data.
 */
export function sendInitData(gameInstance: SLFLC) {
  gameInstance.settings.lineData =
    gameInstance.settings.currentGamedata.linesApiData;
  UiInitData.paylines = convertSymbols(gameInstance.settings.Symbols);
  // const reels = generateInitialReel(gameInstance.settings);
  // gameInstance.settings.reels = reels;
  const dataToSend = {
    GameData: {
      Reel: gameInstance.settings.reels,
      bonusReel: gameInstance.settings.bonusReels,
      linesApiData: gameInstance.settings.currentGamedata.linesApiData,
      Bets: gameInstance.settings.currentGamedata.bets,
      freespinOptions: gameInstance.settings.freespin.options,
    },
    UIData: UiInitData,
    PlayerData: {
      Balance: gameInstance.getPlayerData().credits,
    },
  };
  gameInstance.sendMessage("InitData", dataToSend);
}
//MAKERESULT JSON FOR FRONTENT SIDE
export function makeResultJson(gameInstance: SLFLC) {
  try {
    const { settings, playerData } = gameInstance;
    const credits = gameInstance.getPlayerData().credits + playerData.currentWining
    const Balance = credits.toFixed(3)
    const sendData = {
      GameData: {
        resultSymbols: settings.resultSymbolMatrix,
        linesToEmit: settings._winData.winningLines,
        symbolsToEmit: settings._winData.winningSymbols,
        scatterValues: settings.scatter.values,
        freeSpins: {
          isTriggered: settings.isFreespin,
          count: settings.freespinCount,
          optionIndex: settings.freespin.optionIndex,
        },
        bonus: {
          isTriggered: settings.bonus.isTriggered,
          scatterCount: settings.bonus.scatterCount,
          spinCount: settings.bonus.spinCount
        }
      },
      PlayerData: {
        Balance: Balance,
        totalbet: playerData.totalbet,
        haveWon: playerData.haveWon,
        currentWining: playerData.currentWining
      }
    };
    gameInstance.sendMessage('ResultData', sendData);
    console.log(JSON.stringify(sendData));

  } catch (error) {
    console.error("Error generating result JSON or sending message:", error);
  }
}
