import { sessionManager } from "../../../dashboard/session/sessionManager";
import { currentGamedata } from "../../../Player";
import { precisionRound } from "../../../utils/utils";
import { RequiredSocketMethods } from "../../Utils/gameUtils";
import { checkForWin, getNNumbers, initializeGameSettings, sendInitData } from "./helper";
import { KenoBaseSettings } from "./types";


export default class KenoBaseGame implements RequiredSocketMethods {
  public settings: KenoBaseSettings;
  playerData = {
    haveWon: 0,
    currentWining: 0,
    totalbet: 0,
    rtpSpinCount: 0,
    totalSpin: 0,
    currentPayout: 0,
  };

  constructor(public currentGameData: currentGamedata) {
    this.settings = initializeGameSettings(currentGameData, this);
    sendInitData(this)
  }


  sendMessage(action: string, message: any) {
    this.currentGameData.sendMessage(action, message, true);
  }
  sendError(message: string) {
    this.currentGameData.sendError(message, true);
  }
  sendAlert(message: string) {
    this.currentGameData.sendAlert(message, true);
  }
  updatePlayerBalance(message: number) {
    this.currentGameData.updatePlayerBalance(message);
  }
  deductPlayerBalance(message: number) {
    this.currentGameData.deductPlayerBalance(message);
  }
  getPlayerData() {
    return this.currentGameData.getPlayerData();
  }

  private prepareSpin(data: any) {
    this.settings.currentBet = this.settings.bets[data.currentBet];
    this.settings.picks = data.picks;
  }

  messageHandler(response: any) {

    switch (response.id) {
      case "SPIN":
        this.prepareSpin(response.data);
        this.settings.forRTP = false;
        this.spinResult()
        break;
      case "GENRTP":
        this.settings.forRTP = true;
        this.prepareSpin(response.data);
        this.getRTP(response.data.spins || 1)
        break;
      default:
        console.warn(`Unhandled message ID: ${response.id}`);
        this.sendError(`Unhandled message ID: ${response.id}`);
        break;
    }
  }

  public async getRTP(spins: number): Promise<void> {
    let response: string[] = []
    //Need to generate rtp for all number of picks 
    for (let i = 1; i <= this.settings.maximumPicks; i++) {

      let totalWin = 0;
      let totalBet = 0;

      for (let j = 0; j < spins; j++) {
        this.settings.picks = getNNumbers(this.settings.total, i);

        await this.spinResult();
        totalWin = precisionRound( totalWin + this.playerData.currentWining ,5)
        totalBet = precisionRound( totalBet + this.settings.currentBet ,5)
      }
      response.push(`RTP for ${i} picks is ${precisionRound( (totalWin / totalBet) * 100 ,5)}%`)

    }
    response.forEach((res) => {
      console.log(res);
    })
  }

  public async spinResult(): Promise<void> {
    try {
      const playerData = this.getPlayerData();
      const platformSession = sessionManager.getPlayerPlatform(playerData.username);

      if (this.settings.currentBet > playerData.credits) {
        this.sendError("Low Balance");
        return;
      }
      const { currentBet } = this.settings;


      this.deductPlayerBalance(currentBet);
      this.playerData.totalbet = precisionRound(this.playerData.totalbet + currentBet, 5);


      const spinId = platformSession.currentGameSession.createSpin();
      platformSession.currentGameSession.updateSpinField(spinId, 'betAmount', this.settings.currentBet);

      checkForWin(this)
      const winAmount = this.playerData.currentWining;
      platformSession.currentGameSession.updateSpinField(spinId, 'winAmount', winAmount);
    } catch (error) {
      this.sendError("Spin error");
      console.error("Failed to generate spin results:", error);
    }
  }
}
