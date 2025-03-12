// import SlotGame from "../../game/slotGames/slotGame";
// type Suit = 'Hearts' | 'Diamonds' | 'Clubs' | 'Spades';
// type Value = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
// export type Card = { suit: Suit; value: Value };
// export enum GAMBLETYPE {
//   BlACKRED = "BlACKRED",
//   HIGHCARD = "HIGHCARD"
// }
// export interface gambleDataSet {
//   chosenCard: { pl: Card, dl: Card },
//   isPlayerBlack: Boolean
// }
// export class gambleCardGame {
//   suits: Suit[] = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
//   values: Value[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
//   suitRanks: { [key in Suit]: number } = { 'Hearts': 1, 'Diamonds': 2, 'Clubs': 3, 'Spades': 4 };
//   deck: Card[];
//   chosenCards: Set<string>;
//   initialUpdate: boolean = false;
//   constructor(public sltGame: SlotGame) {
//     this.resetGamble();
//   }
//   createDeck(): Card[] {
//     const deck: Card[] = [];
//     for (const suit of this.suits) {
//       for (const value of this.values) {
//         deck.push({ suit, value });
//       }
//     }
//     return deck;
//   }
//   getRandomCard(): Card {
//     let randomIndex: number;
//     let randomCard: Card;
//     do {
//       randomIndex = Math.floor(Math.random() * this.deck.length);
//       randomCard = this.deck[randomIndex];
//     } while (this.chosenCards.has(`${randomCard.value}-${randomCard.suit}`));
//     this.chosenCards.add(`${randomCard.value}-${randomCard.suit}`);
//     return randomCard;
//   }
//   isCardRed(card: Card): boolean {
//     return card.suit === 'Hearts' || card.suit === 'Diamonds';
//   }
//   isCardBlack(card: Card): boolean {
//     return card.suit === 'Clubs' || card.suit === 'Spades';
//   }
//   getCardValue(card: Card): number {
//     return this.values.indexOf(card.value);
//   }
//   getCardSuitRank(card: Card): number {
//     return this.suitRanks[card.suit];
//   }
//   compareCards(card1: Card, card2: Card): number {
//     const valueComparison = this.getCardValue(card1) - this.getCardValue(card2);
//     if (valueComparison !== 0) {
//       return valueComparison;
//     } else {
//       return this.getCardSuitRank(card1) - this.getCardSuitRank(card2);
//     }
//   }
//   sendInitGambleData(gameType: GAMBLETYPE) {
//     let gambleData;
//     if (gameType == GAMBLETYPE.BlACKRED)
//       return gambleData = { card: this.getRandomCard() }
//     if (gameType == GAMBLETYPE.HIGHCARD)
//       return gambleData = { playerCard: this.getRandomCard(), dealerCard: this.getRandomCard() }
//   }
//   getResult(data: any): void {
//     const gambleData = data.GambleData;
//     let resultData = {
//       playerWon: false,
//       winningAmount: 0
//     };
//     let result;
//     if (gambleData.gameType == GAMBLETYPE.BlACKRED) {
//       result = this.checkForRedBlack(gambleData.chosenCard.pl, gambleData.isCardBlack);
//       if (result) {
//         resultData.winningAmount = this.sltGame.settings._winData.totalWinningAmount * 2;
//         resultData.playerWon = true;
//         this.sltGame.sendMessage("GambleResult", resultData);
//         if (!this.initialUpdate) {
//           this.initialUpdate = true;
//           this.sltGame.updatePlayerBalance(this.sltGame.settings._winData.totalWinningAmount);
//           return;
//         }
//         this.sltGame.updatePlayerBalance(this.sltGame.settings._winData.totalWinningAmount * 2);
//         return;
//       }
//       else {
//         this.sltGame.deductPlayerBalance(this.sltGame.settings._winData.totalWinningAmount);
//         resultData.winningAmount = 0;
//         resultData.playerWon = false;
//         this.sltGame.sendMessage("GambleResult", resultData);
//         return;
//       }
//       //RESULT == TRUE MEANS PLAYER WON MAKE IT FOR IF PLAYER HAS NOT WON
//       //UPDATE AMOUNT IF WONNN ELSE MAKE IT ZERO
//     }
//     if (gambleData.gameType == GAMBLETYPE.HIGHCARD) {
//       result = this.playHighCard(gambleData.gameTypechosenCard.pl, gambleData.gameType.chosenCard.dl);
//     }
//     if (result) {
//       resultData.winningAmount = this.sltGame.settings._winData.totalWinningAmount * 2;
//       resultData.playerWon = true;
//       this.sltGame.sendMessage("GambleResult", resultData);
//       if (!this.initialUpdate) {
//         this.initialUpdate = true;
//         this.sltGame.updatePlayerBalance(this.sltGame.settings._winData.totalWinningAmount);
//         return;
//       }
//       this.sltGame.updatePlayerBalance(this.sltGame.settings._winData.totalWinningAmount * 2);
//       return;
//     }
//     else {
//       this.sltGame.deductPlayerBalance(this.sltGame.settings._winData.totalWinningAmount);
//       resultData.winningAmount = 0;
//       resultData.playerWon = false;
//       this.sltGame.sendMessage("GambleResult", resultData);
//       return;
//     }
//   }
//   checkForRedBlack(plCard: Card, isCardBlack) {
//     if (isCardBlack) {
//       return this.isCardBlack(plCard);
//     }
//     else
//       return this.isCardRed(plCard);
//   }
//   playHighCard(plCard: Card, dlCard: Card): boolean {
//     console.log(`Player's card: ${plCard.value} of ${plCard.suit}`);
//     console.log(`Dealer's card: ${dlCard.value} of ${dlCard.suit}`);
//     const comparisonResult = this.compareCards(plCard, dlCard);
//     if (comparisonResult > 0) {
//       return true;
//     } else {
//       return false;
//     }
//   }
//   resetGamble() {
//     this.deck = this.createDeck();
//     this.chosenCards = new Set();
//     this.initialUpdate = false;
//   }
// }
// // cardGame.playHighCard();
// // cardGame.playRedOrBlack();
