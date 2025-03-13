"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gambleCardGame = exports.GAMBLETYPE = void 0;
var GAMBLETYPE;
(function (GAMBLETYPE) {
    GAMBLETYPE["BlACKRED"] = "BlACKRED";
    GAMBLETYPE["HIGHCARD"] = "HIGHCARD";
})(GAMBLETYPE || (exports.GAMBLETYPE = GAMBLETYPE = {}));
class gambleCardGame {
    constructor(sltGame) {
        this.sltGame = sltGame;
        this.suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
        this.values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        this.suitRanks = { 'Hearts': 1, 'Diamonds': 2, 'Clubs': 3, 'Spades': 4 };
        this.initialUpdate = false;
        this.shouldWin = false;
        this.winningCredit = 0;
        this.resetGamble();
    }
    createDeck() {
        const deck = [];
        for (const suit of this.suits) {
            for (const value of this.values) {
                deck.push({ suit, value });
            }
        }
        return deck;
    }
    getRandomCard() {
        let randomIndex;
        let randomCard;
        do {
            randomIndex = Math.floor(Math.random() * this.deck.length);
            randomCard = this.deck[randomIndex];
        } while (this.chosenCards.has(`${randomCard.value}-${randomCard.suit}`));
        this.chosenCards.add(`${randomCard.value}-${randomCard.suit}`);
        return randomCard;
    }
    isCardRed(card) {
        return card.suit === 'Hearts' || card.suit === 'Diamonds';
    }
    isCardBlack(card) {
        return card.suit === 'Clubs' || card.suit === 'Spades';
    }
    getCardValue(card) {
        return this.values.indexOf(card.value);
    }
    getCardSuitRank(card) {
        return this.suitRanks[card.suit];
    }
    getRandomRedCard() {
        let card;
        do {
            card = this.getRandomCard();
        } while (!this.isCardRed(card));
        return card;
    }
    getRandomBlackCard() {
        let card;
        do {
            card = this.getRandomCard();
        } while (!this.isCardBlack(card));
        return card;
    }
    compareCards(card1, card2) {
        const valueComparison = this.getCardValue(card1) - this.getCardValue(card2);
        if (valueComparison !== 0) {
            return valueComparison;
        }
        else {
            return this.getCardSuitRank(card1) - this.getCardSuitRank(card2);
        }
    }
    sendInitGambleData(gameType) {
        this.shouldWin = getRandomBoolean();
        let gambleData;
        if (gameType == GAMBLETYPE.BlACKRED)
            return gambleData = { blCard: this.getRandomBlackCard(), rdCard: this.getRandomRedCard() };
        if (gameType == GAMBLETYPE.HIGHCARD) {
            const highCard = this.getHighCard();
            return gambleData = { highCard: highCard, lowCard: this.getLowerCard(highCard), exCards: [this.getRandomCard(), this.getRandomCard()] };
        }
    }
    getResult(data) {
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
        }
        else {
            this.winningCredit = 0;
            resultData.playerWon = false;
            console.log("gamble result", resultData);
            this.updateCredits();
        }
    }
    updateCredits() {
        this.initialUpdate = false;
        this.sltGame.deductPlayerBalance(this.sltGame.settings._winData.totalWinningAmount);
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
    checkForRedBlack(plCard, isCardBlack) {
        if (isCardBlack) {
            return this.isCardBlack(plCard);
        }
        else
            return this.isCardRed(plCard);
    }
    getHighCard() {
        let card;
        const filteredValues = this.values.filter(value => value !== '2');
        do {
            const randomIndex = Math.floor(Math.random() * filteredValues.length);
            const randomValue = filteredValues[randomIndex];
            card = this.getRandomCardFromValue(randomValue);
        } while (card === null || this.chosenCards.has(`${card.value}-${card.suit}`));
        return card;
    }
    getLowerCard(highCard) {
        const highCardValueIndex = this.values.indexOf(highCard.value);
        if (highCardValueIndex <= 0) {
            return null;
        }
        let lowerCard = null;
        do {
            const lowerValueIndex = Math.floor(Math.random() * highCardValueIndex);
            const lowerValue = this.values[lowerValueIndex];
            lowerCard = this.getRandomCardFromValue(lowerValue);
        } while (lowerCard === null || this.chosenCards.has(`${lowerCard.value}-${lowerCard.suit}`));
        return lowerCard;
    }
    getRandomCardFromValue(value) {
        let card = null;
        for (const suit of this.suits) {
            card = this.deck.find(c => c.value === value && c.suit === suit);
            if (card !== undefined)
                break;
        }
        return card;
    }
    playHighCard(plCard, dlCard) {
        const comparisonResult = this.compareCards(plCard, dlCard);
        if (comparisonResult > 0) {
            return true;
        }
        else {
            return false;
        }
    }
    resetGamble() {
        this.deck = this.createDeck();
        this.chosenCards = new Set();
    }
}
exports.gambleCardGame = gambleCardGame;
// cardGame.playHighCard();
// cardGame.playRedOrBlack();
function getRandomBoolean() {
    return Math.random() >= 0.5;
}
