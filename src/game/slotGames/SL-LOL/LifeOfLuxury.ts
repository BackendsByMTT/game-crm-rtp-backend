import { currentGamedata } from "../../../Player";
import { generateInitialReel,  initializeGameSettings, printMatrix, sendInitData, makeResultJson,  printWinningCombinations } from "./helper";
import { GameResult, SLLOLSETTINGS, SymbolType, WinningCombination } from "./types";
import { RandomResultGenerator } from "../RandomResultGenerator";

export class SLLOL {
  public settings: SLLOLSETTINGS;
  playerData = {
    haveWon: 0,
    currentWining: 0,
    totalbet: 0,
    rtpSpinCount: 0,
    totalSpin: 0,
    currentPayout: 0
  }

  constructor(public currentGameData: currentGamedata) {
    console.log("Initializing SLLOL game");
    // console.log("currentGameData:", JSON.stringify(currentGameData, null, 2));

    try {
      this.settings = initializeGameSettings(currentGameData, this);
      console.log("Game settings initialized")

      this.settings.reels = generateInitialReel(this.settings);
      // console.log("Initial reels generated:", this.settings.reels);

      sendInitData(this);
    } catch (error) {
      console.error("Error initializing SLLOL game:", error);
    }
  }

  private logSafeSettings() {
    const { _winData, ...safeSettings } = this.settings;
    return JSON.stringify(safeSettings, null, 2);
  }

  get initSymbols() {
    console.log("Getting initial symbols");
    const Symbols = this.currentGameData.gameSettings.Symbols || [];
    // console.log("Initial symbols:", Symbols);
    return Symbols;
  }

  private getSymbol(id: number): SymbolType | undefined {
    return this.settings.Symbols.find(s => s.Id === id);
  }

  private isWild(symbolId: number): boolean {
    // const symbol = this.getSymbol(symbolId);
    // return symbol ? symbol.Name === "Wild" : false;
    return symbolId===11
  }

  sendMessage(action: string, message: any) {
    this.currentGameData.sendMessage(action, message);
  }

  sendError(message: string) {
    this.currentGameData.sendError(message);
  }

  sendAlert(message: string) {
    this.currentGameData.sendAlert(message);
  }

  updatePlayerBalance(amount: number) {
    this.currentGameData.updatePlayerBalance(amount);
  }

  deductPlayerBalance(amount: number) {
    this.currentGameData.deductPlayerBalance(amount);
  }

  getPlayerData() {
    return this.currentGameData.getPlayerData();
  }

  messageHandler(response: any) {
    switch (response.id) {
      case "SPIN":
        this.prepareSpin(response.data);
        // this.spinResult();
        this.getRTP(response.data.spins || 1);
        break;
    }
  }

  private prepareSpin(data: any) {
    this.settings.currentLines = data.currentLines;
    this.settings.BetPerLines = this.settings.currentGamedata.bets[data.currentBet];
    this.settings.currentBet = this.settings.BetPerLines * this.settings.currentLines;
  }

  private async spinResult(): Promise<void> {
    try {
      const playerData = this.getPlayerData();
      if (this.settings.currentBet > playerData.credits) {
        this.sendError("Low Balance");
        return;
      }

      await this.deductPlayerBalance(this.settings.currentBet);
      this.playerData.totalbet += this.settings.currentBet;

      new RandomResultGenerator(this);
      this.checkResult();
    } catch (error) {
      this.sendError("Spin error");
      console.error("Failed to generate spin results:", error);
    }
  }

  private async getRTP(spins: number): Promise<void> {
    try {
      let spend: number = 0;
      let won: number = 0;
      this.playerData.rtpSpinCount = spins;
      for (let i = 0; i < this.playerData.rtpSpinCount; i++) {
        await this.spinResult();
        spend = this.playerData.totalbet;
        won = this.playerData.haveWon;
        console.log("Balance:", this.getPlayerData().credits);
        
        console.log(`Spin ${i + 1} completed. ${this.playerData.totalbet} , ${won}`);
      }
      let rtp = 0;
      if (spend > 0) {
        rtp = won / spend;
      }
      console.log('RTP calculated:', rtp * 100);
      return;
    } catch (error) {
      console.error("Failed to calculate RTP:", error);
      this.sendError("RTP calculation error");
    }
  }

  private async checkResult() {
    try {
      const resultMatrix = this.settings.resultSymbolMatrix;
      // console.log("Result Matrix:", resultMatrix);

      const { payout, winningCombinations } = this.checkWin(resultMatrix);
      // console.log("winning comb:", winningCombinations);
      printWinningCombinations(winningCombinations)


      this.playerData.currentWining = payout;
      this.playerData.haveWon += payout;

      if (payout > 0) {
        this.updatePlayerBalance(this.playerData.currentWining);
      }

      makeResultJson(this);

      console.log("Total Payout:", payout);
      // console.log("Winning Combinations:", winningCombinations);
    } catch (error) {
      console.error("Error in checkResult:", error);
    }
  }

  private checkWin(result: GameResult): { payout: number; winningCombinations: WinningCombination[] } {
    let totalPayout = 0;
    let winningCombinations: WinningCombination[] = [];
    

    const findCombinations = (symbolId: number, col: number, path: [number, number][]): void => {
      // Stop if we've checked all columns or path is complete
      if (col === this.settings.matrix.x) {
        if (path.length >= this.settings.minMatchCount) {
          const symbol = this.getSymbol(symbolId)!;
          // Fix the payout index based on path length (5 -> 0, 4 -> 1, 3 -> 2)
          const multiplierIndex = path.length - this.settings.minMatchCount;
          const multiplier = symbol.multiplier[multiplierIndex][0];
          winningCombinations.push({ symbolId, positions: path, payout: multiplier * this.settings.BetPerLines });
          // console.log("payouttttt", symbol.payout[payoutIndex] );
          // console.log("asdasd");
        }
        return;
      }

      for (let row = 0; row < this.settings.matrix.y; row++) {
        const currentSymbolId = result[row][col];
        if (currentSymbolId === symbolId || this.isWild(currentSymbolId)) {
          findCombinations(symbolId, col + 1, [...path, [row, col]]);
        }
      }

      // End the combination if it's long enough
      if (path.length >= this.settings.minMatchCount) {
        const symbol = this.getSymbol(symbolId)!;
        // Fix the payout index based on path length (5 -> 0, 4 -> 1, 3 -> 2)
          const multiplierIndex = path.length - this.settings.minMatchCount;
          const multiplier = symbol.multiplier[multiplierIndex][0];
          winningCombinations.push({ symbolId, positions: path, payout: multiplier * this.settings.BetPerLines });
      }
    };

    // Iterate over each symbol in the first column
    this.settings.Symbols.forEach(symbol => {
      if (symbol.Name !== "Wild") {
        for (let row = 0; row < this.settings.matrix.y; row++) {
          const startSymbolId = result[row][0]; // Start in the leftmost column (0)
          if (startSymbolId === symbol.Id || this.isWild(startSymbolId)) {
            findCombinations(symbol.Id, 1, [[row, 0]]);
          }
        }
      }
    });

    // Filter out shorter combinations that are subsets of longer ones
    winningCombinations = winningCombinations.filter((combo, index, self) =>
      !self.some((otherCombo, otherIndex) =>
        index !== otherIndex &&
        combo.symbolId === otherCombo.symbolId &&
        combo.positions.length < otherCombo.positions.length &&
        combo.positions.every((pos, i) => pos[0] === otherCombo.positions[i][0] && pos[1] === otherCombo.positions[i][1])
      )
    );

    winningCombinations.forEach(combo => {
      // alter payout . multiply betsperline with payout
      combo.payout = combo.payout * this.settings.BetPerLines
    })
    // Calculate total payout
    totalPayout = winningCombinations.reduce((sum, combo) => sum + combo.payout , 0);

    return { payout: totalPayout, winningCombinations };
  }

}
