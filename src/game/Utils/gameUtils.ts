
import { Player } from "../../dashboard/users/userModel";
import { UserData } from "../../utils/globalTypes";
import crypto from 'crypto';
import * as fs from 'fs';
import { generatePaytables } from "../KenoGames/KenoBaseGame/rtp";

export enum specialIcons {
    bonus = "Bonus",
    scatter = "Scatter",
    jackpot = "Jackpot",
    wild = "Wild",
    any = "any",
    FreeSpin = "FreeSpin"
}
export interface RequiredSocketMethods {
    sendMessage(action: string, message: any): void;
    sendError(error: string): void;
    sendAlert(alert: string): void;
    messageHandler(data: any): void;
    updatePlayerBalance(amount: number): void;
    deductPlayerBalance(amount: number): void;
}
export enum bonusGameType {
    tap = "tap",
    spin = "spin",
    default = "default",
    miniSpin = "miniSpin",
    layerTap = "layerTap"
}

export const PlayerData: UserData = {
    Balance: 0,
    haveWon: 0,
    currentWining: 0
}

export const enum messageType {
    ALERT = "alert",
    MESSAGE = "message",
    ERROR = "internalError",
    CREDITSUPDATE = 'creditsUpdate',
    DATA = "data"
}

export const getCurrentRTP = {
    playerWon: 0,
    playerTotalBets: 0,
};


export enum gameCategory {
    SLOT = "SL",
    KENO = "KN",
}

export interface BonusPayEntry {
    symbolCount: number;
    symbolID: number;
    pay: number;
    highestPayMultiplier: number;
}
export interface ScatterPayEntry {
    symbolCount: number;
    symbolID: number;
    pay: number;
    freeSpins: number;
}

export enum ResultType {
    moolah = "moolah",
    normal = "normal",
}
export const betMultiplier = [0.1, 0.25, 0.5, 0.75, 1];


export const UiInitData = {
    paylines: null,
    spclSymbolTxt: [],
    AbtLogo: {
        logoSprite: "https://iili.io/JrMCqPf.png",
        link: "https://dingding-game.vercel.app/login",
    },
    ToULink: "https://dingding-game.vercel.app/login",
    PopLink: "https://dingding-game.vercel.app/login",
};


export function convertSymbols(data) {


    let uiData = {
        symbols: [],
    };


    if (!Array.isArray(data)) {
        // console.error("Input data is not an array");
        return uiData;
    }
    data.forEach((element) => {

        let symbolData = {
            ID: element.Id,
            Name: element.Name || {},
            "multiplier": element.multiplier || {},
            "defaultAmount": element.defaultAmount || {},
            "symbolsCount": element.symbolsCount || {},
            "increaseValue": element.increaseValue || {},
            "freeSpin": element.freeSpin,
            "description": element.description || {},
            "payout": element.payout || 0,
            "mixedPayout": element.mixedPayout || {},
            "defaultPayout": element.defaultPayout || {}
        };
        // if (element.multiplier) {
        //   const multiplierObject = {};
        //   element.multiplier.forEach((item, index) => {
        //     multiplierObject[(5 - index).toString() + "x"] = item[0];
        //   });
        //   symbolData.multiplier = multiplierObject;
        // }


        uiData.symbols.push(symbolData);
    });

    return uiData;
}


export async function getPlayerCredits(playerName: string) {
    try {
        const currentUser = await Player.findOne({ username: playerName }).exec();
        if (!currentUser) {
            return `No user found with playerName ${playerName}`;
        }
        return currentUser.credits;
    } catch (error) {
        console.error(`Error fetching credits for player ${playerName}:`, error);
        return `An error occurred while fetching credits for player ${playerName}.`;
    }
}

export function shuffleArray<T>(array: T[]): T[] {
    // List of RNG functions
    const rngFunctions = [
        (max: number) => generateRandomNumber(Date.now(), max), // RNG1
        (max: number) => chaoticRandom(generateUniqueSeed()) * max, // RNG2
        (max: number) => generatelcgRandomNumbers(generateUniqueSeed(), max), // RNG3
        (max: number) => generatetrueRandomNumber(max) // RNG4
    ];

    for (let i = array.length - 1; i > 0; i--) {
        const rngIndex = Math.floor(Math.random() * rngFunctions.length);
        const rngFunction = rngFunctions[rngIndex];
        const j = Math.floor(rngFunction(i + 1));

        // Swap elements at index i and j
        [array[i], array[j]] = [array[j], array[i]];
    }

    // Return the shuffled array
    return array;
}


// RNG1

function newtonRng(seed, maxIterations = 10) {
    let x = seed;
    const constant = 71;

    const epsilon = 1e-10;

    for (let i = 0; i < maxIterations; i++) {
        let fx = Math.sin(x * x) - constant;
        let fpx = 2 * x * Math.cos(x);

        let nextX = x - fx / (fpx + epsilon);

        if (Math.abs(nextX - x) < epsilon) {
            break;
        }

        x = nextX + Math.random();
    }

    return Math.abs(x % 1);
}

function generateBetRng(seed, number, maxIterations = 20) {
    const randomValue = newtonRng(seed, maxIterations);
    return Math.floor(randomValue * number);
}

export function generateRandomNumber(seed, number) {
    let randomNum = generateBetRng(seed, number);
    seed = (seed * Math.random() * Math.sin(seed) + Date.now()) % (1e10 * Math.random()) + Math.random();
    return randomNum;
}

// RNG2

function chaoticRandom(seed) {
    const noise = Math.sin(seed) * 10000;
    const randomValue = (Math.random() + noise) % 1;

    return Math.abs(randomValue);
}

// RNG3 - LCG

function lcg(seed) {
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);

    seed = (a * seed + c) % m;

    return seed / m;
}

export function generatelcgRandomNumbers(seed, count) {
    seed = Math.abs(seed + Math.random() * 1000);
    const randomValue = lcg(seed >>> 0);
    const randomNumber = Math.round(randomValue * count);
    return randomNumber;
}

// RNG4 - TRUE RANDOM

function trueRandom(min, max) {
    const randomBytes = crypto.randomBytes(4);
    const randomValue = randomBytes.readUInt32BE(0);
    return min + (randomValue % (max - min));
}

export function generatetrueRandomNumber(max) {
    const randomNumber = trueRandom(0, max);
    return randomNumber;
}
function generateUniqueSeed(): number {
    return Math.floor(Date.now() * Math.random() + performance.now());
}

/**
 * Function to generate paytable JSON file
 * @param {number} N - The population size
 * @param {number} n - The number of draws
 * @param {number} maxPicks - The maximum number of picks
 * @param {number} desiredRTP - The desired RTP
 * @param {(k: number, picks: number, desiredRTP: number) => number} payoutMultiplier - The function to calculate the payout multiplier
 * @param {string} outputPath - The path to save the JSON file
 */
export function generatePaytableJSON(
    N: number,
    n: number,
    maxPicks: number,
    desiredRTP: number,
    payoutMultiplier: (k: number, picks: number, desiredRTP: number) => number,
    outputPath: string
  ) {
    const { paytables } = generatePaytables(N, n, maxPicks, desiredRTP, payoutMultiplier);
  
    const payoutArray: number[][] = [];
  
    for (let picks = 1; picks <= maxPicks; picks++) {
      const payoutsForPicks = paytables[picks].map(entry => entry.payout).slice(1);
      payoutArray.push(payoutsForPicks);
  
    }
  
    const jsonData = {
      desiredRTP,
      payoutArray
    };
  
    fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf-8');
  
    console.log(`Paytable JSON file successfully generated at: ${outputPath}`);
  }


  export function writeMultipleArraysToCSV(filename: string, data: number[][]): void {
    try {
      const csvContent = data.map(row => row.join(',')).join('\n');
      fs.writeFileSync(filename, csvContent);
      console.log(`Successfully wrote data to ${filename}`);
    } catch (error) {
      console.error('Error writing CSV file:', error);
      throw error;
    }
  }