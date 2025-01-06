import BaseSlotGame from "./BaseSlotGame";

type Suit = 'Hearts' | 'Diamonds' | 'Clubs' | 'Spades';
type Value = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type Card = { suit: Suit; value: Value };
export enum GAMBLETYPE {
  BlACKRED = "BlACKRED",
  HIGHCARD = "HIGHCARD"
}

export interface gambleDataSet {
  chosenCard: { pl: Card, dl: Card },
  isPlayerBlack: Boolean;
}

export class gambleCardGame {
  suits: Suit[] = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
  values: Value[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  suitRanks: { [key in Suit]: number } = { 'Hearts': 1, 'Diamonds': 2, 'Clubs': 3, 'Spades': 4 };
  deck: Card[];
  chosenCards: Set<string>;
  initialUpdate: boolean = false;
  shouldWin: boolean = false;
  winningCredit: number = 0;

  constructor(public sltGame: BaseSlotGame ) {
    this.resetGamble();
  }

  createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of this.suits) {
      for (const value of this.values) {
        deck.push({ suit, value });
      }
    }
    return deck;
  }

  getRandomCard(): Card {
    let randomIndex: number;
    let randomCard: Card;

    do {
      randomIndex = Math.floor(Math.random() * this.deck.length);
      randomCard = this.deck[randomIndex];
    } while (this.chosenCards.has(`${randomCard.value}-${randomCard.suit}`));

    this.chosenCards.add(`${randomCard.value}-${randomCard.suit}`);
    return randomCard;
  }

  isCardRed(card: Card): boolean {
    return card.suit === 'Hearts' || card.suit === 'Diamonds';
  }

  isCardBlack(card: Card): boolean {
    return card.suit === 'Clubs' || card.suit === 'Spades';
  }

  getCardValue(card: Card): number {
    return this.values.indexOf(card.value);
  }

  getCardSuitRank(card: Card): number {
    return this.suitRanks[card.suit];
  }
  getRandomRedCard(): Card {
    let card: Card;
    do {
      card = this.getRandomCard();
    } while (!this.isCardRed(card));
    return card;
  }

  getRandomBlackCard(): Card {
    let card: Card;
    do {
      card = this.getRandomCard();
    } while (!this.isCardBlack(card));
    return card;
  }

  compareCards(card1: Card, card2: Card): number {
    const valueComparison = this.getCardValue(card1) - this.getCardValue(card2);
    if (valueComparison !== 0) {
      return valueComparison;
    } else {
      return this.getCardSuitRank(card1) - this.getCardSuitRank(card2);
    }
  }
  public sendInitGambleData(gameType: GAMBLETYPE) {

    this.shouldWin = getRandomBoolean();
    let gambleData;
    if (gameType == GAMBLETYPE.BlACKRED)

      return gambleData = { blCard: this.getRandomBlackCard(), rdCard: this.getRandomRedCard() }
    if (gameType == GAMBLETYPE.HIGHCARD) {
      const highCard = this.getHighCard();
      return gambleData = { highCard: highCard, lowCard: this.getLowerCard(highCard), exCards: [this.getRandomCard(), this.getRandomCard()] };
    }
  }

  getResult(data: any): void {
    const gambleData = data;
    let resultData = {
      playerWon: this.shouldWin,
      currentWining: 0,
      Balance: this.sltGame.getPlayerData().credits
    };

    if (this.shouldWin) {
      resultData.playerWon = true;
      if (!this.initialUpdate) {
        this.initialUpdate = true;
        this.winningCredit = this.sltGame.settings._winData.totalWinningAmount * 2;
        resultData.currentWining = this.winningCredit;
        console.log("gamble result", resultData);

        this.sltGame.sendMessage("GambleResult", resultData); // Ensure message is sent on initial update
      }
      else {
        this.winningCredit = this.winningCredit * 2;
        resultData.currentWining = this.winningCredit;

        console.log("gamble result", resultData);
        this.sltGame.sendMessage("GambleResult", resultData);
      }
    } else {
      this.winningCredit = 0;
      resultData.playerWon = false;

      console.log("gamble result", resultData);
      this.updateCredits();
    }
  }

  updateCredits() {
    this.initialUpdate = false;
    this.sltGame.deductPlayerBalance(this.sltGame.settings._winData.totalWinningAmount)
    this.sltGame.updatePlayerBalance(this.winningCredit);
    this.sltGame.playerData.haveWon += this.winningCredit;
    this.sltGame.playerData.currentWining = this.winningCredit;
    let resultData = {
      playerWon: this.shouldWin,
      currentWining: this.winningCredit,
      Balance: this.sltGame.getPlayerData().credits
    };
    this.sltGame.sendMessage("GambleResult", resultData);

  }

  checkForRedBlack(plCard: Card, isCardBlack: boolean) {
    if (isCardBlack) {
      return this.isCardBlack(plCard);
    }
    else
      return this.isCardRed(plCard);
  }
  getHighCard(): Card {
    let card: Card;
    const filteredValues = this.values.filter(value => value !== '2');
    do {
      const randomIndex = Math.floor(Math.random() * filteredValues.length);
      const randomValue = filteredValues[randomIndex];
      card = this.getRandomCardFromValue(randomValue);
    } while (card === null || this.chosenCards.has(`${card.value}-${card.suit}`));

    return card;
  }

  getLowerCard(highCard: Card): Card | null {
    const highCardValueIndex = this.values.indexOf(highCard.value);
    if (highCardValueIndex <= 0) {
      return null;
    }
    let lowerCard: Card | null = null;
    do {
      const lowerValueIndex = Math.floor(Math.random() * highCardValueIndex);
      const lowerValue = this.values[lowerValueIndex];
      lowerCard = this.getRandomCardFromValue(lowerValue);
    } while (lowerCard === null || this.chosenCards.has(`${lowerCard.value}-${lowerCard.suit}`));
    return lowerCard;
  }

  getRandomCardFromValue(value: Value): Card | null {
    let card: Card | null = null;
    for (const suit of this.suits) {
      card = this.deck.find(c => c.value === value && c.suit === suit);
      if (card !== undefined) break;
    }
    return card;
  }

  playHighCard(plCard: Card, dlCard: Card): boolean {




    const comparisonResult = this.compareCards(plCard, dlCard);

    if (comparisonResult > 0) {
      return true;
    } else {
      return false;
    }
  }

  resetGamble() {
    this.deck = this.createDeck();
    this.chosenCards = new Set();

  }
}



// cardGame.playHighCard();
// cardGame.playRedOrBlack();
function getRandomBoolean(): boolean {
  return Math.random() >= 0.5;
}
