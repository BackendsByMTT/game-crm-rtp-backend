import { precisionRound } from "../../../utils/utils";
import KenoBaseGame from "./KenoBaseGame";
import { calculateRTP, examplePayoutMultiplier,  generatePaytables, hypergeometric } from "./rtp";

/**
 * Initializes the game settings using the provided game data and game instance.
 * @param gameData - The data used to configure the game settings.
 * @param gameInstance - The instance of the SLBOD class that manages the game logic.
 * @returns An object containing initialized game settings.
 */
export function initializeGameSettings(gameData: any, gameInstance: KenoBaseGame) {
  return {
    id: gameData.gameSettings.id,
    currentGamedata: gameData.gameSettings,
    draws: gameData.gameSettings.draws,
    maximumPicks: gameData.gameSettings.maximumPicks,
    total: gameData.gameSettings.total,
    forRTP: false,
    drawn: [],
    picks: [],
    hits: [],
    bets: gameData.gameSettings.bets,
    paytable: gameData.gameSettings.paytable,
    currentBet: 0,
  };
}

/**
 * Sends the initial game data to the game instance.
 * @param gameInstance - The instance of the KenoBaseGame class.
 */
export function sendInitData(gameInstance: KenoBaseGame) {
  const dataToSend = {
    GameData: {
      Bets: gameInstance.settings.currentGamedata.bets,
      Paytable: gameInstance.settings.paytable,
      MaximumPicks: gameInstance.settings.maximumPicks,
      Draws: gameInstance.settings.draws,
      TotalNumbers: gameInstance.settings.total,
    },
    PlayerData: {
      Balance: gameInstance.getPlayerData().credits,
    },
  };
  gameInstance.sendMessage("InitData", dataToSend);
}

/**
 * Finds common elements between two arrays.
 * @param arr1 - The first array.
 * @param arr2 - The second array.
 * @returns An array of common elements.
 */
function findCommonElements(arr1: number[], arr2: number[]): number[] {
  const set1 = new Set(arr1);
  return arr2.filter(num => set1.has(num));
}

/**
 * Accesses the game data and calculates the payout based on hits and picks.
 * @param gameInstance - The instance of the KenoBaseGame class.
 * @returns The calculated payout.
 */
function accessData(gameInstance: KenoBaseGame) {
  const { settings } = gameInstance;
  const matchCount = settings.hits.length;
  if (matchCount === 0) return 0;
  const pickCount = settings.picks.length;
  if (settings.paytable[pickCount - 1][matchCount - 1] === undefined) {
    console.error("out of bound");
    console.log("pick", pickCount, "hit", matchCount);
  }
  return settings.paytable[pickCount - 1][matchCount - 1] * settings.currentBet;
}

/**
 * Finds common elements between two arrays while preserving the order of the first array.
 * @param arr1 - The first array.
 * @param arr2 - The second array.
 * @returns An array of common elements in the order of the first array.
 */
function findCommonElementsPreserveOrder(arr1: number[], arr2: number[]): number[] {
  const set2 = new Set(arr2);
  return arr1.filter(num => set2.has(num));
}

/**
 * Checks for a win in the game instance and updates the player's data accordingly.
 * @param gameInstance - The instance of the KenoBaseGame class.
 * @returns 0 if successful, an empty array if an error occurs.
 */
export function checkForWin(gameInstance: KenoBaseGame) {
  try {
    const { settings } = gameInstance;
    let totalPayout = 0;

    if (!settings || !settings.total || !settings.draws) {
      throw new Error('Invalid game instance or missing draws or total setting');
    }

    settings.drawn = getNNumbers(settings.total, settings.draws);
    settings.hits = findCommonElements(settings.drawn, settings.picks);
    totalPayout = accessData(gameInstance);

    gameInstance.playerData.currentWinning = precisionRound(totalPayout, 5);
    gameInstance.playerData.hasWon = precisionRound(gameInstance.playerData.hasWon +
      gameInstance.playerData.currentWinning, 5);
    makeResultJson(gameInstance);
    return 0;
  } catch (error) {
    console.error("Error in checkForWin:", error);
    return [];
  }
}

/**
 * Generates an array of n unique random numbers between 1 and total.
 * @param total - The total number of possible values.
 * @param n - The number of unique random numbers to generate.
 * @returns An array of n unique random numbers.
 */
export function getNNumbers(total: number, n: number): number[] {
  if (n > total) {
    throw new Error('n cannot be greater than total');
  }

  const result: number[] = [];
  const usedNumbers = new Set<number>();

  while (result.length < n) {
    const randomArray = new Uint8Array(Math.max(n - result.length, 16));
    crypto.getRandomValues(randomArray);

    for (let i = 0; i < randomArray.length && result.length < n; i++) {
      const number = (randomArray[i] % total) + 1;

      if (!usedNumbers.has(number)) {
        usedNumbers.add(number);
        result.push(number);
      }
    }
  }

  return result;
}

/**
 * Generates a result JSON object and sends it to the game instance.
 * @param gameInstance - The instance of the KenoBaseGame class.
 */
export function makeResultJson(gameInstance: KenoBaseGame) {
  try {
    const { settings, playerData } = gameInstance;
    const credits = gameInstance.getPlayerData().credits;
    const Balance = credits.toFixed(2);
    const sendData = {
      GameData: {
        drawn: settings.drawn,
        picks: settings.picks,
        hits: settings.hits,
      },
      PlayerData: {
        Balance: Balance,
        totalbet: playerData.totalBet,
        haveWon: playerData.hasWon,
        currentWining: playerData.currentWinning,
      }
    };
    console.log(JSON.stringify(sendData));

    gameInstance.sendMessage('ResultData', sendData);
  } catch (error) {
    console.error("Error generating result JSON or sending message:", error);
  }
}
