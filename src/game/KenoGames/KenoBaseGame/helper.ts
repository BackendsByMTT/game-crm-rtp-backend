import { precisionRound } from "../../../utils/utils";
import KenoBaseGame from "./KenoBaseGame";
import { calculateRTP, examplePayoutMultiplier,  generatePaytableJSON,  generatePaytables, hypergeometric } from "./rtp";
import { cryptoRNG, evaluateRNG, lcg } from "./test";

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
export function sendInitData(gameInstance: KenoBaseGame) {

  const dataToSend = {
    GameData: {
      Bets: gameInstance.settings.currentGamedata.bets,
    },
    PlayerData: {
      Balance: gameInstance.getPlayerData().credits,
    },
  };
  gameInstance.sendMessage("InitData", dataToSend);
}



function findCommonElements(arr1: number[], arr2: number[]): number[] {
  const set1 = new Set(arr1);
  return arr2.filter(num => set1.has(num));
}
function accessData(gameInstance: KenoBaseGame) {
  const { settings } = gameInstance;
  const matchCount = settings.hits.length;
  if (matchCount === 0) return 0
  const pickCount = settings.picks.length;
  if (settings.paytable[pickCount - 1][matchCount - 1] === undefined) {
    console.error("out of bound");
    console.log("pick", pickCount, "hit", matchCount);

  }
  return settings.paytable[pickCount - 1][matchCount - 1] * settings.currentBet;
}

// If you need to preserve the original order from arr1:
function findCommonElementsPreserveOrder(arr1: number[], arr2: number[]): number[] {
  const set2 = new Set(arr2);
  return arr1.filter(num => set2.has(num));
}
//CHECK WINS ON PAYLINES WITH OR WITHOUT WILD
export function checkForWin(gameInstance: KenoBaseGame) {
  try {
    const { settings } = gameInstance;
    let totalPayout = 0;

    if (!settings || !settings.total || !settings.draws) {
      throw new Error('Invalid game instance or missing draws or total setting');
    }

    //NOTE: draw numbers
    settings.drawn = getNNumbers(settings.total, settings.draws);

    settings.hits = findCommonElements(settings.drawn, settings.picks);

    totalPayout = accessData(gameInstance);

    gameInstance.playerData.currentWining = precisionRound(totalPayout, 5);
    gameInstance.playerData.haveWon = precisionRound(gameInstance.playerData.haveWon +
      gameInstance.playerData.currentWining, 5)
    makeResultJson(gameInstance)
    return 0;
  } catch (error) {
    console.error("Error in checkForWin:", error);
    return [];
  }
}

export function getNNumbers(total: number, n: number): number[] {
  if (n > total) {
    throw new Error('n cannot be greater than total');
  }

  const result: number[] = [];
  const usedNumbers = new Set<number>();

  while (result.length < n) {
    // Generate new random values if we've used up the current batch
    const randomArray = new Uint8Array(Math.max(n - result.length, 16)); // Get at least 16 values
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
//MAKERESULT JSON FOR FRONTENT SIDE
export function makeResultJson(gameInstance: KenoBaseGame) {
  try {
    const { settings, playerData } = gameInstance;
    const credits = gameInstance.getPlayerData().credits
    const Balance = credits.toFixed(2)
    const sendData = {
      GameData: {
        drawn: settings.drawn,
        picks: settings.picks,
        hits: settings.hits,
      },
      PlayerData: {
        Balance: Balance,
        totalbet: playerData.totalbet,
        haveWon: playerData.haveWon,
        currentWining: playerData.currentWining
      }
    };
    console.log(JSON.stringify(sendData));

    type RNG = () => number;

    // FIX: remove later
    // Example usage
    // const totalNumbers = 80;
    // const numbersToDraw = 20;
    // const evaluationIterations = 10000;
    
    
    // const rngs: { name: string; rng: RNG }[] = [
    //   // { name: 'LCG', rng: lcg(3.14159 * 1e6) },
    //   // { name: 'LCG date rand', rng: lcg(new Date().getUTCMilliseconds() * Math.random()) },
    //   // { name: 'LCG pi', rng: lcg(3.14159 * 1e6) },
    //   // { name: 'Xorshift pi', rng: xorshift(3.14159 * 1e6) },
    //   // { name: 'Xorshift rand date', rng: xorshift(new Date().getUTCMilliseconds() * Math.random()) },
    //   // { name: 'Crypto', rng: cryptoRNG() },
    //   // { name: 'BBS', rng: bbs(new Date().getUTCMilliseconds() * Math.random()) },
    // ];
    // rngs.forEach(({ name, rng }) => {
    //   const metrics = evaluateRNG(rng, totalNumbers, numbersToDraw, evaluationIterations);
    //   console.log(`${name} Metrics:`);
    //   console.log('Mean:', metrics.mean.toFixed(4));
    //   console.log('Variance:', metrics.variance.toFixed(4));
    //   console.log('Chi-square statistic:', metrics.chiSquare.toFixed(4));
    //   console.log('Chi-square p-value:', metrics.chiSquarePValue.toFixed(4));
    //   console.log('Uniformity score:', metrics.uniformityScore.toFixed(4));
    //   console.log('---');
    // });



// Game Setup
// Example usage
// const N = 40; // Total numbers
// const n = 10; // Numbers drawn
// const maxPicks = 10; // Maximum number of picks
// const desiredRTP = 70; // Desired RTP

// const { paytables, rtps, overallRTP } = generatePaytables(N, n, maxPicks, desiredRTP, examplePayoutMultiplier);

// console.log(`Overall RTP for the game: ${overallRTP.toFixed(2)}%`);
// for (let picks = 1; picks <= maxPicks; picks++) {
//     console.log(`Paytable for ${picks} picks:`);
//     console.table(paytables[picks]);

//     console.log(`RTP for ${picks} picks: ${rtps[picks].toFixed(2)}%`);
// }
// const outputPath = './paytable.json'; // Path to save the JSON file
// generatePaytableJSON(N, n, maxPicks, desiredRTP, examplePayoutMultiplier, outputPath);
    gameInstance.sendMessage('ResultData', sendData);
  } catch (error) {
    console.error("Error generating result JSON or sending message:", error);
  }
}
