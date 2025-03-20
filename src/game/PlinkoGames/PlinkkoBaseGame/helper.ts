import { log } from "node:console";
import { precisionRound } from "../../../utils/utils";
import PlinkoBaseGame from "./PlinkoBaseGame";


/**
 * Initializes the game settings using the provided game data and game instance.
 * @param gameData - The data used to configure the game settings.
 * @param gameInstance - The instance of the SLBOD class that manages the game logic.
 * @returns An object containing initialized game settings.
 */
export function initializeGameSettings(gameData: any, gameInstance: PlinkoBaseGame) {
  return {
    id: gameData.gameSettings.id,
    currentGamedata: gameData.gameSettings,
    rows: gameData.gameSettings.rows,
    risk: gameData.gameSettings.risk,
    selectedRisk: 0,
    selectedRows: 0,
    multiplier: gameData.gameSettings.multiplier,
    prob: gameData.gameSettings.prob,
    bets: gameData.gameSettings.bets,
    currentBet: 0,
    ballFinalPosition: 0,
    selectedMultiplier: 0,
  };
}

/**
 * Sends the initial game data to the game instance.
 * @param gameInstance - The instance of the KenoBaseGame class.
 */
export function sendInitData(gameInstance: PlinkoBaseGame) {
  const dataToSend = {
    GameData: {
      Bets: gameInstance.settings.currentGamedata.bets,
      rows: gameInstance.settings.currentGamedata.rows,
      risk: gameInstance.settings.currentGamedata.risk,
      multiplier: gameInstance.settings.currentGamedata.multiplier,
    },
    PlayerData: {
      Balance: gameInstance.getPlayerData().credits,
    },
  };
  gameInstance.sendMessage("InitData", dataToSend);
}


/**
 * Determines the ball's final position based on weighted probability.
 * @param probArray - The probability array for the selected rows and risk.
 * @returns The final ball position index.
 */
function getBallFinalPosition(probArray: number[]): number {
  const cumulativeProbabilities = [];
  let sum = 0;

  // Compute cumulative probabilities
  for (let i = 0; i < probArray.length; i++) {
    sum += probArray[i];
    cumulativeProbabilities.push(sum);
  }

  // Generate a random number between 0 and sum of all probabilities
  const rand = Math.random() * sum;

  // Determine where the ball lands based on probability
  for (let i = 0; i < cumulativeProbabilities.length; i++) {
    if (rand < cumulativeProbabilities[i]) {
      return i;
    }
  }
  return probArray.length - 1; // Fallback (shouldn't happen)
}

/**
 * Checks for the win based on Plinko game logic.
 * @param gameInstance - The instance of the Plinko game.
 * @returns The win details including selected rows, risk, final multiplier, and win amount.
 */
export function checkForWin(gameInstance: PlinkoBaseGame) {
  try {
    const { multiplier, prob, bets, currentBet } = gameInstance.settings;
    let { ballFinalPosition } = gameInstance.settings;

    // Ensure valid bet selection
    if (!bets.includes(currentBet)) {
      throw new Error("Invalid bet selected.");
    }

    // User-selected values from prepareDraw
    const selectedRows = gameInstance.settings.selectedRows; // Assigned dynamically from prepareDraw
    const selectedRisk = gameInstance.settings.selectedRisk; // Assigned dynamically from prepareDraw

    // Find the index for selected rows and risk
    const rowIndex = gameInstance.settings.rows.indexOf(selectedRows);
    const riskIndex = gameInstance.settings.risk.indexOf(selectedRisk);

    if (rowIndex === -1 || riskIndex === -1) {
      throw new Error("Invalid rows or risk selection.");
    }

    // Select the correct multiplier and probability array
    const chosenMultiplierArray = multiplier[rowIndex][riskIndex];
    const chosenProbArray = prob[rowIndex][riskIndex];

    // Determine the ball's final position using probability
    gameInstance.settings.ballFinalPosition = getBallFinalPosition(chosenProbArray);

    if (
      gameInstance.settings.ballFinalPosition < 0 || 
      gameInstance.settings.ballFinalPosition >= chosenMultiplierArray.length
    ) {
      throw new Error("Invalid ball position calculated.");
    }

    // Get the final multiplier from the selected position
    gameInstance.settings.selectedMultiplier = chosenMultiplierArray[gameInstance.settings.ballFinalPosition];

    // Calculate the winning amount
    const winAmount = precisionRound(currentBet * gameInstance.settings.selectedMultiplier, 2);
    gameInstance.playerData.currentWinning = precisionRound(winAmount, 5);
    gameInstance.playerData.haveWon = precisionRound(
      gameInstance.playerData.haveWon + gameInstance.playerData.currentWinning, 
      5
    );
    console.log("Win amount:", winAmount);
    console.log("Ball Position", gameInstance.settings.ballFinalPosition);
    console.log("MultiplierWO", gameInstance.settings.selectedMultiplier);
    
    // Generate the result JSON
    makeResultJson(gameInstance);
    gameInstance.playerData.currentWinning = 0;

    return 0;
  } catch (error) {
    console.error("Error in checkForWin:", error.message);
    return -1; // Return an error code
  }
}

export function makeResultJson(gameInstance: PlinkoBaseGame) {
  try {
    const { settings, playerData } = gameInstance;
    const credits = gameInstance.getPlayerData().credits;
    const Balance = credits.toFixed(2);
    const sendData = {
      GameData: {
        ballPosition: settings.ballFinalPosition,
        selectedMultiplier: settings.selectedMultiplier,
      },
      PlayerData: {
        Balance: Balance,
        totalbet: playerData.totalBet,
        haveWon: playerData.haveWon,
        currentWining: playerData.currentWinning,
      }
    };
    console.log(JSON.stringify(sendData));

    gameInstance.sendMessage('ResultData', sendData);
  } catch (error) {
    console.error("Error generating result JSON or sending message:", error);
  }
}