import { sessionManager } from "../../../dashboard/session/sessionManager";
import { currentGamedata } from "../../../Player";
import { precisionRound } from "../../../utils/utils";
import { generatePaytableJSON, RequiredSocketMethods, writeMultipleArraysToCSV } from "../../Utils/gameUtils";
import { checkForWin, getNNumbers, initializeGameSettings, sendInitData } from "./helper";
import { examplePayoutMultiplier } from "./rtp";
import { KenoBaseSettings } from "./types";

/**
 * Class representing the base game logic for Keno.
 * Implements the RequiredSocketMethods interface.
 */
export default class KenoBaseGame implements RequiredSocketMethods {
  public settings: KenoBaseSettings;
  playerData = {
    hasWon: 0,
    currentWinning: 0,
    totalBet: 0,
    totalSpins: 0,
  };

  /**
   * Creates an instance of KenoBaseGame.
   * @param currentGameData - The current game data.
   */
  constructor(public currentGameData: currentGamedata) {
    this.settings = initializeGameSettings(currentGameData, this);
    sendInitData(this);
  }

  /**
   * Sends a message to the player.
   * @param action - The action type.
   * @param payload - The message payload.
   */
  sendMessage(action: string, payload: any) {
    this.currentGameData.sendMessage(action, payload, true);
  }

  /**
   * Sends an error message to the player.
   * @param errorMessage - The error message.
   */
  sendError(errorMessage: string) {
    this.currentGameData.sendError(errorMessage, true);
  }

  /**
   * Sends an alert message to the player.
   * @param alertMessage - The alert message.
   */
  sendAlert(alertMessage: string) {
    this.currentGameData.sendAlert(alertMessage, true);
  }

  /**
   * Updates the player's balance.
   * @param amount - The amount to update.
   */
  updatePlayerBalance(amount: number) {
    this.currentGameData.updatePlayerBalance(amount);
  }

  /**
   * Deducts an amount from the player's balance.
   * @param amount - The amount to deduct.
   */
  deductPlayerBalance(amount: number) {
    this.currentGameData.deductPlayerBalance(amount);
  }

  /**
   * Retrieves the player's data.
   * @returns The player's data.
   */
  getPlayerData() {
    return this.currentGameData.getPlayerData();
  }

  /**
   * Prepares the spin with the given data.
   * @param spinData - The data for the spin.
   */
  private prepareDraw(drawData: any) {
    this.settings.currentBet = this.settings.bets[drawData.currentBet];
    this.settings.picks = drawData.picks;
  }

  /**
   * Handles incoming messages.
   * @param message - The incoming message.
   */
  messageHandler(message: any) {
    switch (message.id) {
      case "SPIN":
        this.prepareDraw(message.data);
        this.settings.forRTP = false;
        this.spinResult();
        break;
      case "GENRTP":
        this.settings.forRTP = true;
        this.prepareDraw(message.data);
        this.getRTP(message.data.spins || 1);
        break;
      default:
        console.warn(`Unhandled message ID: ${message.id}`);
        this.sendError(`Unhandled message ID: ${message.id}`);
        break;
    }
  }

  /**
   * Generates the RTP (Return to Player) for a given number of spins.
   * @param spins - The number of spins.
   */
  public async getRTP(draws: number): Promise<void> {
    try {

      let response: string[] = [];
      let hitsLength: number[][] = [];
      for (let i = 1; i <= this.settings.maximumPicks; i++) {
        let totalWin = 0;
        let totalBet = 0;
        let hitCounts: number[] = [];
        for (let j = 0; j < draws; j++) {
          this.settings.picks = getNNumbers(this.settings.total, i);
          await this.spinResult();
          hitCounts.push(this.settings.hits.length);
          totalWin = precisionRound(totalWin + this.playerData.currentWinning, 5);
          totalBet = precisionRound(totalBet + this.settings.currentBet, 5);
        }
        response.push(`RTP for ${i} picks is ${precisionRound((totalWin / totalBet) * 100, 5)}%`);
        hitsLength.push(hitCounts);
      }
      console.log(response.join('\n'));
      // writeMultipleArraysToCSV("hitFreqKeno.csv", hitsLength);
      
      // // testing gen paytable
      // generatePaytableJSON(80, 20, 10, 85, examplePayoutMultiplier, "paytable.json");
    } catch (error) {
      console.error("Failed to generate RTP:", error);
    }
  }

  /**
   * Executes the spin result logic.
   */
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
      this.playerData.totalBet = precisionRound(this.playerData.totalBet + currentBet, 5);

      const spinId = platformSession.currentGameSession.createSpin();
      platformSession.currentGameSession.updateSpinField(spinId, 'betAmount', this.settings.currentBet);

      checkForWin(this);
      const winAmount = this.playerData.currentWinning;
      platformSession.currentGameSession.updateSpinField(spinId, 'winAmount', winAmount);
    } catch (error) {
      this.sendError("Spin error");
      console.error("Failed to generate spin results:", error);
    }
  }
}
