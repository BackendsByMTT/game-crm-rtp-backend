import { currentGamedata } from "../../Player";
import PlinkoBaseGame from "./PlinkkoBaseGame/PlinkoBaseGame";

export default class PlinkoGameManager {
  public currentGame: any;
  constructor(public currentGameData: currentGamedata) {
    console.log(currentGameData.gameSettings.id);

    if (!currentGameData.gameSettings.isSpecial) {
      this.currentGame = new PlinkoBaseGame(currentGameData);
    } else {
      console.log("Special Game KNEOOOO ");
    }
  }
}
