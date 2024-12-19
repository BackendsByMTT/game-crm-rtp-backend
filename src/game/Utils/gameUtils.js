"use strict";
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
const userModel_1 = require("../../dashboard/users/userModel");
const crypto_1 = __importDefault(require("crypto"));
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
        let j = Math.floor(rngFunction(i + 1));
        let k = array[i];
        array[i] = array[j];
        array[j] = k;
    }
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
