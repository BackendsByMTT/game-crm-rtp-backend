import { CardSuits } from "./types";
export interface gambleResponse {
  playerWon: boolean,
  currentWinning: number,
  card: CardSuits,
  balance: number,
}

/*
 * function for gamble feature for SL-BOD
 * on a win player can choose to gamble ie double(or even 4 times) or nothing 
 * on loss player will lose current win 
 * player can choose to gamble on suits (4times) or colors (2times)
 * */
// export function sendInitGambleData() {
//   // console.log("gamble init");
//   let gambleData: {
//     blCard: Card,
//     rdCard: Card
//   } = {
//     blCard: {
//       suit: 'Spades',
//       value: 'A'
//     },
//     rdCard: {
//       suit: 'Hearts',
//       value: 'A'
//     }
//   }
//   return gambleData
// }

export function getGambleResult(response: {
  selected: "BLACK" | "RED" | CardSuits
}): gambleResponse {
  if (["BLACK", "RED", "Hearts", "Spades", "Clubs", "Diamonds"].includes(response.selected)) {
    const randomSuit = getRandomSuit();
    const playerWon =
      response.selected === "BLACK" || response.selected === "RED"
        ? colorMap[randomSuit] === response.selected
        : randomSuit === response.selected;

    return {
      playerWon,
      currentWinning: 0,
      card: randomSuit,
      balance: 0,
    };
  } else {
    throw new Error("Invalid card type");
  }
}

function getRandomSuit(): CardSuits {
  const suits: CardSuits[] = ["Hearts", "Spades", "Clubs", "Diamonds"];
  return suits[Math.floor(Math.random() * suits.length)];
}

const colorMap: Record<CardSuits, "BLACK" | "RED"> = {
  Hearts: "RED",
  Diamonds: "RED",
  Spades: "BLACK",
  Clubs: "BLACK",
};
