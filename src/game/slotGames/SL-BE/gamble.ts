export interface gambleResponse {
  playerWon: boolean,
  currentWinning: number,
  coin: "HEAD" | "TAIL"
}

/*
 * function for gamble feature for SL-LOL
 * on a win player can choose to gamble ie double or nothing 
 * on loss player will lose current win 
 *
 *
 * */
export function sendInitGambleData() {
  // console.log("gamble init");
}

export function getGambleResult(response: {
  selected: "HEAD" | "TAIL",
})
  : gambleResponse {
  // console.log("gamble result", response);
  const result = getRandomFlip()


  switch (response.selected === result) {
    case true:
      return {
        playerWon: true,
        currentWinning: 0,
        coin: result
      }
    case false:
      return {
        playerWon: false,
        currentWinning: 0,
        coin: result
      }
  }
}
// function to get random card
export function getRandomFlip(): "HEAD" | "TAIL" {
  //FIX: later
  return Math.random() >= 0.5 ? "HEAD" : "TAIL";
}
