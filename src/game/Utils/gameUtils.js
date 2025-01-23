"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UiInitData = exports.betMultiplier = exports.ResultType = exports.gameCategory = exports.getCurrentRTP = exports.PlayerData = exports.bonusGameType = exports.specialIcons = void 0;
exports.convertSymbols = convertSymbols;
exports.getPlayerCredits = getPlayerCredits;
exports.shuffleArray = shuffleArray;
exports.generateRandomNumber = generateRandomNumber;
exports.generatelcgRandomNumbers = generatelcgRandomNumbers;
exports.generatetrueRandomNumber = generatetrueRandomNumber;
exports.generatePaytableJSON = generatePaytableJSON;
exports.writeMultipleArraysToCSV = writeMultipleArraysToCSV;
const userModel_1 = require("../../dashboard/users/userModel");
const crypto_1 = __importDefault(require("crypto"));
const fs = __importStar(require("fs"));
const rtp_1 = require("../KenoGames/KenoBaseGame/rtp");
var specialIcons;
(function (specialIcons) {
    specialIcons["bonus"] = "Bonus";
    specialIcons["scatter"] = "Scatter";
    specialIcons["jackpot"] = "Jackpot";
    specialIcons["wild"] = "Wild";
    specialIcons["any"] = "any";
    specialIcons["FreeSpin"] = "FreeSpin";
})(specialIcons || (exports.specialIcons = specialIcons = {}));
var bonusGameType;
(function (bonusGameType) {
    bonusGameType["tap"] = "tap";
    bonusGameType["spin"] = "spin";
    bonusGameType["default"] = "default";
    bonusGameType["miniSpin"] = "miniSpin";
    bonusGameType["layerTap"] = "layerTap";
})(bonusGameType || (exports.bonusGameType = bonusGameType = {}));
exports.PlayerData = {
    Balance: 0,
    haveWon: 0,
    currentWining: 0
};
exports.getCurrentRTP = {
    playerWon: 0,
    playerTotalBets: 0,
};
var gameCategory;
(function (gameCategory) {
    gameCategory["SLOT"] = "SL";
    gameCategory["KENO"] = "KN";
})(gameCategory || (exports.gameCategory = gameCategory = {}));
var ResultType;
(function (ResultType) {
    ResultType["moolah"] = "moolah";
    ResultType["normal"] = "normal";
})(ResultType || (exports.ResultType = ResultType = {}));
exports.betMultiplier = [0.1, 0.25, 0.5, 0.75, 1];
exports.UiInitData = {
    paylines: null,
    spclSymbolTxt: [],
    AbtLogo: {
        logoSprite: "https://iili.io/JrMCqPf.png",
        link: "https://dingding-game.vercel.app/login",
    },
    ToULink: "https://dingding-game.vercel.app/login",
    PopLink: "https://dingding-game.vercel.app/login",
};
function convertSymbols(data) {
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
function getPlayerCredits(playerName) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const currentUser = yield userModel_1.Player.findOne({ username: playerName }).exec();
            if (!currentUser) {
                return `No user found with playerName ${playerName}`;
            }
            return currentUser.credits;
        }
        catch (error) {
            console.error(`Error fetching credits for player ${playerName}:`, error);
            return `An error occurred while fetching credits for player ${playerName}.`;
        }
    });
}
function shuffleArray(array) {
    // List of RNG functions
    const rngFunctions = [
        (max) => generateRandomNumber(Date.now(), max), // RNG1
        (max) => chaoticRandom(generateUniqueSeed()) * max, // RNG2
        (max) => generatelcgRandomNumbers(generateUniqueSeed(), max), // RNG3
        (max) => generatetrueRandomNumber(max) // RNG4
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
function generateRandomNumber(seed, number) {
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
function generatelcgRandomNumbers(seed, count) {
    seed = Math.abs(seed + Math.random() * 1000);
    const randomValue = lcg(seed >>> 0);
    const randomNumber = Math.round(randomValue * count);
    return randomNumber;
}
// RNG4 - TRUE RANDOM
function trueRandom(min, max) {
    const randomBytes = crypto_1.default.randomBytes(4);
    const randomValue = randomBytes.readUInt32BE(0);
    return min + (randomValue % (max - min));
}
function generatetrueRandomNumber(max) {
    const randomNumber = trueRandom(0, max);
    return randomNumber;
}
function generateUniqueSeed() {
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
function generatePaytableJSON(N, n, maxPicks, desiredRTP, payoutMultiplier, outputPath) {
    const { paytables } = (0, rtp_1.generatePaytables)(N, n, maxPicks, desiredRTP, payoutMultiplier);
    const payoutArray = [];
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
function writeMultipleArraysToCSV(filename, data) {
    try {
        const csvContent = data.map(row => row.join(',')).join('\n');
        fs.writeFileSync(filename, csvContent);
        console.log(`Successfully wrote data to ${filename}`);
    }
    catch (error) {
        console.error('Error writing CSV file:', error);
        throw error;
    }
}
