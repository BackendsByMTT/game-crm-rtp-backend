"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BaseSlotGame_1 = __importDefault(require("./BaseSlotGame/BaseSlotGame"));
const cashMachineBase_1 = require("./SL-CM/cashMachineBase");
const crazy777Base_1 = require("./SL-CRZ/crazy777Base");
const wheelOfFortuneBase_1 = require("./SL-WOF/wheelOfFortuneBase");
const planetMoolahBase_1 = require("./SL-PM(MOOLAH)/planetMoolahBase");
const stinkinRichBase_1 = require("./SL-SR/stinkinRichBase");
const OneOfAKindBase_1 = require("./SL-ONE/OneOfAKindBase");
const bloodEternalBase_1 = require("./SL-BE/bloodEternalBase");
const breakingBadBase_1 = require("./SL-BB/breakingBadBase");
const LifeOfLuxury_1 = require("./SL-LOL/LifeOfLuxury");
const zeusBase_1 = require("./SL-Z3/zeusBase");
const buffaloTrailBase_1 = require("./SL-BT/buffaloTrailBase");
const TimeMachineBase_1 = require("./SL-TM/TimeMachineBase");
const sizzlingMoonBase_1 = require("./SL-SM/sizzlingMoonBase");
const president45Base_1 = require("./SL-PSF/president45Base");
const Starburst_1 = require("./SL-SB/Starburst");
const peakyBlindersBase_1 = require("./SL-PB/peakyBlindersBase");
const BookOfDeadBase_1 = require("./SL-BOD/BookOfDeadBase");
const AgeOfGodsBase_1 = require("./SL-AOG/AgeOfGodsBase");
const spartacusGladitaorBase_1 = require("./SL-SG/spartacusGladitaorBase");
const FireLinkChinaTownBase_1 = require("./SL-FLC/FireLinkChinaTownBase");
const buffalo777Base_1 = require("./SL-BS/buffalo777Base");
const LifeOfLuxuryLiteBase_1 = require("./SL-LLL/LifeOfLuxuryLiteBase");
const luckySevenBase_1 = require("./SL-LS/luckySevenBase");
const wildBuffaloBase_1 = require("./SL-WB/wildBuffaloBase");
const fruitMaryBase_1 = require("./SL-FM/fruitMaryBase");
class SlotGameManager {
    constructor(currentGameData) {
        // console.log("Requesting Game : ",currentGameData.gameSettings.id);
        this.currentGameData = currentGameData;
        this.gameClassMapping = {
            "SL-CM": cashMachineBase_1.SLCM, "SL-CRZ": crazy777Base_1.SLCRZ, "SL-WOF": wheelOfFortuneBase_1.SLWOF, "SL-PM": planetMoolahBase_1.SLPM, "SL-BE": bloodEternalBase_1.SLBE,
            "SL-ONE": OneOfAKindBase_1.SLONE, "SL-LOL": LifeOfLuxury_1.SLLOL, "SL-SR": stinkinRichBase_1.SLSR, "SL-BB": breakingBadBase_1.SLBB, "SL-Z3": zeusBase_1.SLZEUS,
            "SL-SM": sizzlingMoonBase_1.SLSM, "SL-TM": TimeMachineBase_1.SLTM, "SL-BT": buffaloTrailBase_1.SLBT, "SL-PSF": president45Base_1.SLPSF, "SL-SB": Starburst_1.SLSB, "SL-BOD": BookOfDeadBase_1.SLBOD,
            "SL-FM": fruitMaryBase_1.SLFM,
            "SL-PB": peakyBlindersBase_1.SLPB, "SL-SG": spartacusGladitaorBase_1.SLSG, "SL-BS": buffalo777Base_1.SLBS, "SL-AOG": AgeOfGodsBase_1.SLAOG, "SL-LS": luckySevenBase_1.SLLS, "SL-WB": wildBuffaloBase_1.SLWB, "SL-FLC": FireLinkChinaTownBase_1.SLFLC, "SL-LLL": LifeOfLuxuryLiteBase_1.SLLLL
        };
        const slotGameClass = this.gameClassMapping[currentGameData.gameSettings.id];
        if (slotGameClass) {
            this.currentGame = new slotGameClass(currentGameData);
        }
        else {
            this.currentGame = new BaseSlotGame_1.default(currentGameData);
            // throw new Error(`No game class found for id: ${currentGameData.gameSettings.id}`);
        }
    }
}
exports.default = SlotGameManager;
