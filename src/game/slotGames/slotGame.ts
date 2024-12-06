import { currentGamedata } from "../../Player";
import BaseSlotGame from "./BaseSlotGame/BaseSlotGame";
import { SLCM } from "./SL-CM/cashMachineBase";
import { SLCRZ } from "./SL-CRZ/crazy777Base";
import { SLWOF } from "./SL-WOF/wheelOfFortuneBase";
import { SLPM } from "./SL-PM(MOOLAH)/planetMoolahBase";
import { SLSR } from "./SL-SR/stinkinRichBase";
import { SLONE } from "./SL-ONE/OneOfAKindBase";
import { SLBE } from "./SL-BE/bloodEternalBase"
import { SLBB } from "./SL-BB/breakingBadBase";
import { SLLOL } from "./SL-LOL/LifeOfLuxury";
import { SLZEUS } from "./SL-Z3/zeusBase";
import { SLBT } from "./SL-BT/buffaloTrailBase"
import { SLTM } from "./SL-TM/TimeMachineBase";
import { SLSM } from "./SL-SM/sizzlingMoonBase";
import { SLPSF } from "./SL-PSF/president45Base";
import { SLSB } from "./SL-SB/Starburst"
import { SLPB } from "./SL-PB/peakyBlindersBase";
export default class SlotGameManager {
  public currentGame: any;

  gameClassMapping: { [key: string]: any } = {
    "SL-CM": SLCM, "SL-CRZ": SLCRZ, "SL-WOF": SLWOF, "SL-PM": SLPM, "SL-BE": SLBE,
    "SL-ONE": SLONE, "SL-LOL": SLLOL, "SL-SR": SLSR, "SL-BB": SLBB, "SL-Z3": SLZEUS, "SL-SM": SLSM,
    "SL-TM": SLTM,
    "SL-BT": SLBT,
    "SL-PSF": SLPSF,
    "SL-SB": SLSB,
    "SL-PB":SLPB
  };

  constructor(public currentGameData: currentGamedata) {

    // console.log("Requesting Game : ",currentGameData.gameSettings.id);

    const slotGameClass = this.gameClassMapping[currentGameData.gameSettings.id];

    if (slotGameClass) {
      this.currentGame = new slotGameClass(currentGameData);
    } else {
      this.currentGame = new BaseSlotGame(currentGameData);
      // throw new Error(`No game class found for id: ${currentGameData.gameSettings.id}`);
    }
  }
}



