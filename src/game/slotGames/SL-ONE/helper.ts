import Payouts from "../../../dashboard/payouts/payoutModel";
import { convertSymbols, UiInitData } from "../../Utils/gameUtils";
import { WinData } from "../BaseSlotGame/WinData";
import { SLONE } from "./OneOfAKindBase";
import { BoosterResult, LevelUpResult, ScatterBlueResult, ScatterPurpleResult, Symbol, JokerResponse } from "./types";


export function initializeGameSettings(gameData: any, gameInstance: SLONE) {
  return {
    id: gameData.gameSettings.id,
    isSpecial: gameData.gameSettings.isSpecial,
    matrix: gameData.gameSettings.matrix,
    bets: gameData.gameSettings.bets,
    Symbols: gameInstance.initSymbols,
    resultSymbolMatrix: [],
    currentGamedata: gameData.gameSettings,
    _winData: new WinData(gameInstance),
    currentBet: 0,
    currentLines: 0,
    BetPerLines: 0,
    reels: [],
    scatterBlue: gameData.gameSettings.scatterBlue,
    scatterPurple: gameData.gameSettings.scatterPurple,
    joker: gameData.gameSettings.joker,
    booster: gameData.gameSettings.booster,
    levelUp: gameData.gameSettings.levelUp,
    defaultPayout: gameData.gameSettings.defaultPayout,
    SpecialType: gameData.gameSettings.SpecialType,
    freeSpinCount: 0,
    freeSpinType: "NONE" as "NONE" | "BLUE" | "PURPLE",
    multiplierType: "NONE" as "NONE" | "SIMPLE" | "EXHAUSTIVE",
  }
}

export function generateInitialReel(gameSettings: any): string[] {
  const reel: string[] = [];
  gameSettings.Symbols.forEach(symbol => {
    const count = symbol.reelInstance[0] || 0; // Using reelInstance[0] for frequency
    for (let j = 0; j < count; j++) {
      reel.push(symbol.Id);
    }
  });

  shuffleArray(reel);

  return reel;
}

function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export function sendInitData(gameInstance: SLONE) {
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
export function makeResultJson(gameInstance: SLONE) {
  try {
    const { settings, playerData } = gameInstance;
    const credits = gameInstance.getPlayerData().credits
    const Balance = credits.toFixed(2)
    const sendData = {
      gameData: {
        resultSymbols: settings.resultSymbolMatrix,
        // isFreeSpin: settings.isFreeSpin,
        freeSpinCount: settings.freeSpinCount
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

export function calculatePayout(gameInstance: SLONE) {

  const outerSymbol = gameInstance.settings.Symbols.find(sym => sym.Id === gameInstance.settings.resultSymbolMatrix[0]);
  if (!outerSymbol) throw new Error(`Symbol with Id ${gameInstance.settings.resultSymbolMatrix[0]} not found.`);

  console.log("freespin" , gameInstance.settings.freeSpinCount, gameInstance.settings.freeSpinType);
  

  switch (outerSymbol.Name) {
    case "ScatterBlue":
      console.log("Scatter Blue feature triggered");
      handleScatterBlue(gameInstance);
      break;

    case "ScatterPurple":
      console.log("Scatter Purple feature triggered");
      handleScatterPurple(gameInstance);
      break;
    case "Joker":
      console.log("Joker feature triggered");
      handleJoker(gameInstance);
      break;
    default:
      handleNonSpecialSymbol(gameInstance)
  }

  gameInstance.updatePlayerBalance(gameInstance.playerData.currentWining)
  makeResultJson(gameInstance)

  console.log("________________x_______x___________________");
}

function handleJoker(gameInstance: SLONE) {
  let payout: number = 0
  const jokerResponse: JokerResponse = {
    isTriggered: true,
    payout: [],
    blueRound: 0,
    greenRound: 0,
    redRound: 0
  }
  //blueRound
  const matchesInBlue = getRandomIndex(gameInstance.settings.joker.blueRound);
  jokerResponse.blueRound = matchesInBlue

  if (matchesInBlue === 3) {
    console.log("blueRound cleared");
    payout = gameInstance.settings.joker.payout[0] * gameInstance.settings.BetPerLines
    //move to green greenRound
    const matchesInGreen = getRandomIndex(gameInstance.settings.joker.greenRound);
    jokerResponse.greenRound = matchesInGreen
    jokerResponse.payout.push(payout)
    if (matchesInGreen === 3) {
      console.log("greenRound cleared");
      payout = gameInstance.settings.joker.payout[1] * gameInstance.settings.BetPerLines
      //move to red redRound
      const matchesInRed = getRandomIndex(gameInstance.settings.joker.redRound);
      jokerResponse.redRound = matchesInRed
      jokerResponse.payout.push(payout)
      if (matchesInRed === 3) {
        console.log("redRound cleared");
        payout = gameInstance.settings.joker.payout[2] * gameInstance.settings.BetPerLines
        jokerResponse.payout.push(payout)
      } else {
        console.log("redRound not cleared");
        jokerResponse.payout.push(0)
      }
    } else {
      console.log("greenRound not cleared");
      jokerResponse.payout.push(0)
    }
  } else {
    console.log("blueRound not cleared");
    jokerResponse.payout.push(0)
  }

  console.log("jokerResponse", jokerResponse);
  gameInstance.playerData.currentWining = jokerResponse.payout.reduce((a, b) => a + b, 0)
  gameInstance.playerData.haveWon += gameInstance.playerData.currentWining
}

function handleScatterPurple(gameInstance: SLONE) {
  try {
    let lives: number = 10;
    let totalPayout: number = 0;

    let topSymbols: number[] = getTopSymbols(gameInstance);
    console.log("init topSym", topSymbols);

    let purpleResponse: ScatterPurpleResult = {
      isTriggered: true,
      topSymbols: [],
      symbols: [],
      payout: 0,
      levelUp: [],
      booster: [],
      reTriggered: [],
    };

    gameInstance.settings.freeSpinType = "PURPLE";

    while (lives > 0) {
      const index = getRandomIndex(gameInstance.settings.scatterPurple.symbolsProbs);
      let symbol = gameInstance.settings.Symbols[index];

      console.log("TOPSYM", topSymbols);

      purpleResponse.symbols.push(index);
      purpleResponse.topSymbols.push([...topSymbols]); // Create a copy of topSymbols

      console.log("Symbol", symbol.Id, "Payout:", symbol.payout);

      --lives;
      console.log("Remaining lives:", lives);

      gameInstance.settings.freeSpinCount = lives;

      let payout = 0;
      if (index !== 0) {
        payout = applyScatterPurple(gameInstance, symbol, purpleResponse, topSymbols);
      } else {
        // Handle symbol 0 (empty symbol)
        purpleResponse.levelUp.push({ level: 0, isLevelUp: false });
        purpleResponse.booster.push({ type: 'NONE', multipliers: [] });
        // Update topSymbols for symbol 0 as well
        if (topSymbols.includes(0)) {
          const zeroIndex = topSymbols.indexOf(0);
          topSymbols[zeroIndex] = -1; // Mark as processed
        }
      }

      console.log("payout:", payout);
      totalPayout += payout;

      // Check if all the top symbols are empty (processed)
      if (topSymbols.every(symbol => symbol === -1)) {
        console.log("All top symbols are empty. Re-triggering scatter purple feature.");
        lives = 10;
        topSymbols = getTopSymbols(gameInstance);
        purpleResponse.reTriggered.push(1);
      } else {
        purpleResponse.reTriggered.push(0);
      }
      purpleResponse.payout = totalPayout;
    }
    console.log("Scatter Purple response:", purpleResponse);
    gameInstance.playerData.currentWining = totalPayout;
    console.log("totalPayout:", totalPayout);
    gameInstance.playerData.haveWon += totalPayout;
    gameInstance.settings.freeSpinType = "NONE" as "NONE" | "BLUE" | "PURPLE";

  } catch (err) {
    console.log(err);
    console.log("Error in handleScatterPurple");
  }
}

function handleNonSpecialSymbol(gameInstance: SLONE) {
  try {
    console.log("No special symbol found. Proceeding with normal payout calculation.");
    let symbol = gameInstance.settings.Symbols[gameInstance.settings.resultSymbolMatrix[0]];
    const levelUpResult = checkForLevelUp(gameInstance, false);
    if (levelUpResult.isLevelUp) {
      symbol = gameInstance.settings.Symbols[levelUpResult.level];
    }
    const boosterResult = checkForBooster(gameInstance, false);
    console.log("boosterResult:", boosterResult);

    if (boosterResult.type !== 'NONE') {
      gameInstance.playerData.currentWining = symbol.payout * gameInstance.settings.BetPerLines * boosterResult.multipliers.reduce((a, b) => a + b, 0)
    } else {
      gameInstance.playerData.currentWining = symbol.payout * gameInstance.settings.BetPerLines
    }
    gameInstance.playerData.haveWon += gameInstance.playerData.currentWining;
    gameInstance.settings.freeSpinCount = 0;
    gameInstance.settings.freeSpinType = "NONE"

    console.log("currWin:", gameInstance.playerData.currentWining);
  } catch (err) {
    console.log(err)
    console.log("Error in handleNonSpecialSymbol")
  }
}

function handleScatterBlue(gameInstance: SLONE) {
  try {
    let lives = 5;
    let totalPayout: number = 0
    //NOTE: Scatter Blue Response
    let blueResponse: ScatterBlueResult = {
      isTriggered: true,
      symbols: [],
      payout: 0,
      levelUp: [],
      booster: []
    }
    gameInstance.settings.freeSpinType = "BLUE"

    while (lives > 0) {
      const index = getRandomIndex(gameInstance.settings.scatterBlue.symbolsProbs);
      let symbol = gameInstance.settings.Symbols[index];

      blueResponse.symbols.push(index)

      console.log("Symbol", symbol.Id, "Payout:", symbol.payout);

      lives += symbol.freeSpinCount;
      --lives;
      console.log("Remaining lives:", lives);

      gameInstance.settings.freeSpinCount = lives;

      if (index !== 0) {
        const payout = applyScatterBlue(gameInstance, symbol, blueResponse);
        console.log("payout:", payout);

        totalPayout += payout;
      } else if (index === 0) {
        blueResponse.levelUp.push({ isLevelUp: false, level: 0 })
        blueResponse.booster.push({ type: 'NONE', multipliers: [] })
      }
    }

    blueResponse.payout = totalPayout
    gameInstance.playerData.currentWining = totalPayout;
    gameInstance.playerData.haveWon += gameInstance.playerData.currentWining;

    console.log("currWin:", gameInstance.playerData.currentWining);
    console.log("scatterBlueResponse:", blueResponse);
    gameInstance.settings.freeSpinType = "NONE" as "NONE" | "BLUE" | "PURPLE";
    gameInstance.settings.freeSpinCount = 0;
  } catch (err) {
    console.log(err)
    console.log("Error in handleScatterBlue")
  }
}

function applyScatterBlue(gameInstance: SLONE, symbol: Symbol, response: ScatterBlueResult): number {
  try {
    const feature = getRandomIndex(gameInstance.settings.scatterBlue.featureProbs);
    let sym = symbol
    let multiplier = 0
    let levelUpResult: LevelUpResult = { level: 0, isLevelUp: false };
    let boosterResult: BoosterResult = { type: 'NONE', multipliers: [] };

    switch (feature) {
      case 1:
        console.log("Level-up feature triggered");
        levelUpResult = checkForLevelUp(gameInstance, true);
        console.log("lvlUp", levelUpResult);
        if (levelUpResult.isLevelUp) {
          console.log(`Leveled up to symbol: ${levelUpResult.level}`);
          sym = gameInstance.settings.Symbols[levelUpResult.level];
        }
        break;
      case 2:
        console.log("Booster feature triggered");
        boosterResult = checkForBooster(gameInstance, true);
        if (boosterResult.type !== 'NONE') {
          console.log(`Booster applied with multipliers: ${boosterResult.multipliers}`);
          multiplier = boosterResult.multipliers.reduce((a, b) => a + b, 0);
        }
        console.log("booster", boosterResult);
        break;
      case 3:
        console.log("Level-up and booster both triggered");
        levelUpResult = checkForLevelUp(gameInstance, true);
        console.log("lvlUp", levelUpResult);

        if (levelUpResult.isLevelUp) {
          sym = gameInstance.settings.Symbols[levelUpResult.level];
        }
        boosterResult = checkForBooster(gameInstance, true);
        if (boosterResult.type !== 'NONE') {
          multiplier = boosterResult.multipliers.reduce((a, b) => a + b, 0);
        }
        console.log("booster", boosterResult);
        break;
      default:
        console.log("No feature triggered.");
    }
    response.booster.push(boosterResult)
    response.levelUp.push(levelUpResult)

    let payout: number = 0
    if (multiplier !== 0) {
      payout = sym.payout * gameInstance.settings.BetPerLines * multiplier;
    } else {
      payout = sym.payout * gameInstance.settings.BetPerLines;
    }
    return payout
  } catch (err) {
    console.log(err)
    console.log("Error in applyScatterBlue")
  }

}
function applyScatterPurple(gameInstance: SLONE, symbol: Symbol, response: ScatterPurpleResult, topSymbols: number[]): number {
  try {
    const feature = getRandomIndex(gameInstance.settings.scatterPurple.featureProbs);
    let sym = symbol
    let multiplier = 0
    let levelUpResult: LevelUpResult = { level: 0, isLevelUp: false };
    let boosterResult: BoosterResult = { type: 'NONE', multipliers: [] };

    switch (feature) {
      case 1:
        console.log("Level-up feature triggered");
        levelUpResult = checkForLevelUp(gameInstance, true);
        console.log("lvlUp", levelUpResult);
        if (levelUpResult.isLevelUp) {
          console.log(`Leveled up to symbol: ${levelUpResult.level}`);
          sym = gameInstance.settings.Symbols[levelUpResult.level];
        }
        break;
      case 2:
        console.log("Booster feature triggered");
        boosterResult = checkForBooster(gameInstance, true);
        if (boosterResult.type !== 'NONE') {
          console.log(`Booster applied with multipliers: ${boosterResult.multipliers}`);
          multiplier = boosterResult.multipliers.reduce((a, b) => a + b, 0);
        }
        console.log("booster", boosterResult);
        break;
      case 3:
        console.log("Level-up and booster both triggered");
        levelUpResult = checkForLevelUp(gameInstance, true);
        console.log("lvlUp", levelUpResult);

        if (levelUpResult.isLevelUp) {
          sym = gameInstance.settings.Symbols[levelUpResult.level];
        }
        boosterResult = checkForBooster(gameInstance, true);
        if (boosterResult.type !== 'NONE') {
          multiplier = boosterResult.multipliers.reduce((a, b) => a + b, 0);
        }
        console.log("booster", boosterResult);
        break;
      default:
        console.log("No feature triggered.");
    }

    //NOTE: match with topSymbols
    if (topSymbols.includes(sym.Id)) {
      //if os then change it to 0
      topSymbols.forEach((element, index) => {
        if (element === sym.Id) {
          topSymbols[index] = 0
        }
      })
    }
    console.log("topSymbols", topSymbols);
    // response.topSymbols.push(topSymbols)
    response.booster.push(boosterResult)
    response.levelUp.push(levelUpResult)

    let payout: number = 0
    if (multiplier !== 0) {
      payout = sym.payout * gameInstance.settings.BetPerLines * multiplier;
    } else {
      payout = sym.payout * gameInstance.settings.BetPerLines;
    }
    return payout
  } catch (err) {
    console.log(err)
    console.log("Error in applyScatterPurple")
  }
}

export function checkForBooster(gameInstance: SLONE, trigger: boolean): BoosterResult {
  try {
    const { typeProbs, multiplier, multiplierProbs } = gameInstance.settings.booster;

    const boosterType = trigger ? forceBoosterActivation(typeProbs) : getRandomIndex(typeProbs);

    switch (boosterType) {
      case 1:
        return handleSimpleBooster(gameInstance);
      case 2:
        return handleExhaustiveBooster(gameInstance);
      default:
        return { type: 'NONE', multipliers: [] };
    }
  } catch (err) {
    console.log(err)
    console.log("Error in checkForBooster")
  }
}

function forceBoosterActivation(typeProbs: number[]): number {
  let boosterType: number;
  do {
    boosterType = getRandomIndex(typeProbs);
  } while (boosterType === 0);
  return boosterType;
}

//NOTE: for booster
function getSimpleMultiplier(multipliers: number[], multiplierProb: number[]): number {
  const idx = getRandomIndex(multiplierProb);
  return multipliers[idx];
}

//NOTE: for booster
function getExhaustiveMultipliers(multipliers: number[], multiplierProb: number[]): number[] {
  try {
    const allMultipliers: number[] = [];
    const usedIndices = new Set<number>();
    while (true) {
      const index = getRandomIndex(multiplierProb);
      if (usedIndices.has(index)) {
        break;
      }
      usedIndices.add(index);
      allMultipliers.push(multipliers[index]);
    }
    return allMultipliers;
  } catch (err) {
    console.log(err)
    console.log("Error in getExhaustiveMultipliers")
  }
}
//NOTE: for booster
function handleSimpleBooster(gameInstance: SLONE): BoosterResult {
  try {
    const { multiplier, multiplierProbs } = gameInstance.settings.booster;
    return {
      type: 'SIMPLE',
      multipliers: [getSimpleMultiplier(multiplier, multiplierProbs)]
    };
  } catch (err) {
    console.log(err)
    console.log("Error in handleSimpleBooster")
  }
}

//NOTE: for booster
function handleExhaustiveBooster(gameInstance: SLONE): BoosterResult {
  const { multiplier, multiplierProbs } = gameInstance.settings.booster;
  return {
    type: 'EXHAUSTIVE',
    multipliers: getExhaustiveMultipliers(multiplier, multiplierProbs)
  };
}

//NOTE: for level up feature
function getNonSpecialSymbols(symbols: Symbol[]): Symbol[] {
  return symbols.filter(symbol => !symbol.isSpecial && symbol.Id !== 0)
    .sort((a, b) => a.payout - b.payout);
}

//NOTE: for level up feature
function findNextSymbol(currentSymbol: Symbol, levelUp: number, nonSpecialSymbols: Symbol[]): Symbol {
  const currentIndex = nonSpecialSymbols.findIndex(s => s.Id === currentSymbol.Id);
  if (currentIndex === -1) return currentSymbol; // If not found, return the current symbol

  const targetIndex = Math.min(currentIndex + levelUp, nonSpecialSymbols.length - 1);
  return nonSpecialSymbols[targetIndex];
}

//NOTE: level up feature
export function checkForLevelUp(gameInstance: SLONE, trigger: boolean): LevelUpResult {
  try {

    const { resultSymbolMatrix, Symbols, levelUp } = gameInstance.settings;
    const resultSymbolIndex = resultSymbolMatrix[0]
    const resultSymbol = Symbols[resultSymbolIndex];

    // Check if the result symbol is eligible for level up
    if (resultSymbol.isSpecial || resultSymbol.Id === 0) {
      return { level: 0, isLevelUp: false };
    }

    const nonSpecialSymbols = getNonSpecialSymbols(Symbols);
    const { levelProbs, level } = levelUp;

    let levelUpAmount: number;

    if (trigger) {
      // When trigger is true, ensure a level up spin
      do {
        const idx = getRandomIndex(levelProbs);
        levelUpAmount = level[idx];
      } while (levelUpAmount === 0);
    } else {
      // When trigger is false, behave as before
      const idx = getRandomIndex(levelProbs);
      levelUpAmount = level[idx];
    }

    if (levelUpAmount === 0) {
      return { level: 0, isLevelUp: false };
    }

    const newSymbol = findNextSymbol(resultSymbol, levelUpAmount, nonSpecialSymbols);

    console.log("levelUp", newSymbol.Id, newSymbol.payout);
    return {
      isLevelUp: newSymbol.Id !== resultSymbol.Id,
      level: newSymbol.Id
    };
  } catch (error) {
    console.error("Error in checkForLevelUp:", error);
    return { level: 0, isLevelUp: false };
  }
}

//NOTE: Reservoir Sampling or Monte Carlo Sampling is helpful if probabilities are dynamic and you need a different approach for randomness.
function getRandomIndex(probArray: number[]): number {
  try {
    const totalWeight = probArray.reduce((sum, prob) => sum + prob, 0);
    let result = 0;
    let maxProb = 0;

    for (let i = 0; i < probArray.length; i++) {
      const rand = Math.random();
      const normalizedProb = probArray[i] / totalWeight;
      if (rand < normalizedProb && normalizedProb > maxProb) {
        maxProb = normalizedProb;
        result = i;
      }
    }

    return result;
  } catch (err) {
    console.log(err)
    console.log("Error in getRandomIndex")
  }
}
// get 5 unique non special and non zero symbols 
function getTopSymbols(gameInstance: SLONE): number[] {
  try {
    const { topSymbolProbs } = gameInstance.settings.scatterPurple;
    const topSymbols: number[] = [];

    while (topSymbols.length < 5) {
      const index = getRandomIndex(topSymbolProbs);
      if (!topSymbols.includes(index) && index !== 0) {
        topSymbols.push(index);
      }
    }
    return topSymbols;
  } catch (err) {
    console.log(err)
    console.log("Error in getTopSymbols")
  }
}
