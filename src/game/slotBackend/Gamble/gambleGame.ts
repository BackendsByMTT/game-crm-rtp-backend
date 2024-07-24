
type Suit = 'Hearts' | 'Diamonds' | 'Clubs' | 'Spades';
type Value = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
type Card = { suit: Suit; value: Value };

class CardGame {
  suits: Suit[] = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
  values: Value[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  suitRanks: { [key in Suit]: number } = { 'Hearts': 1, 'Diamonds': 2, 'Clubs': 3, 'Spades': 4 };
  deck: Card[];

  constructor() {
    this.deck = this.createDeck();
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
    const randomIndex = Math.floor(Math.random() * this.deck.length);
    return this.deck[randomIndex];
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

  compareCards(card1: Card, card2: Card): number {
    const valueComparison = this.getCardValue(card1) - this.getCardValue(card2);
    if (valueComparison !== 0) {
      return valueComparison;
    } else {
      return this.getCardSuitRank(card1) - this.getCardSuitRank(card2);
    }
  }

  playRedOrBlack(): void {
    const playerCard = this.getRandomCard();
    const isBlack = this.isCardBlack(playerCard);
    console.log(`Player's card is ${isBlack ? 'black' : 'red'}.`);
  }

  playHighCard(): void {
    const playerCard = this.getRandomCard();
    const dealerCard = this.getRandomCard();

    console.log(`Player's card: ${playerCard.value} of ${playerCard.suit}`);
    console.log(`Dealer's card: ${dealerCard.value} of ${dealerCard.suit}`);

    const comparisonResult = this.compareCards(playerCard, dealerCard);

    if (comparisonResult > 0) {
      console.log('Player has the bigger card.');
    } else if (comparisonResult < 0) {
      console.log('Dealer has the bigger card.');
    } else {
      console.log("It's a tie.");
    }
  }
}

const cardGame = new CardGame();
// cardGame.playHighCard();
// cardGame.playRedOrBlack();
