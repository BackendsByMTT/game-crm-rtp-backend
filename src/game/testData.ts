export const gameData = [
  {
    id: "SL-GOW",
    matrix: {
      x: 5,
      y: 3,
    },
    linesApiData: [
      [0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1],
      [2, 2, 2, 2, 2],
      [0, 1, 2, 1, 0],
      [2, 1, 0, 1, 2],
      [0, 0, 1, 0, 0],
      [2, 2, 1, 2, 2],
      [1, 0, 0, 0, 1],
      [1, 2, 2, 2, 1],
    ],
    linesCount: [1, 3, 5, 9],
    bets: [0.01, 0.02, 0.04, 0.05, 0.07, 0.1, 0.2, 0.4, 0.5, 0.7, 1, 1.5, 2, 3],
    gamble: {
      isEnabled: false,
    },
    freeSpin: {
      isEnabled: true,
      goldRowCountProb: [1, 1, 1], // 0 row, 1 row , 2 rows
      goldRowsProb: [1, 1, 1, 1, 1], // 0th row gold, 1st row gold, 2nd row gold, 3rd row gold, 4th row gold
    },
    Symbols: [
      {
        Name: "Coin",
        Id: 0,
        reelInstance: {
          "0": 10,
          "1": 10,
          "2": 10,
          "3": 10,
          "4": 10,
        },
        useWildSub: true,
        multiplier: [
          [20, 0],
          [5, 0],
          [2, 0],
        ],
      },
      {
        Name: "Firework",
        Id: 1,
        reelInstance: {
          "0": 10,
          "1": 10,
          "2": 10,
          "3": 10,
          "4": 10,
        },
        useWildSub: true,
        multiplier: [
          [40, 0],
          [10, 0],
          [3, 0],
        ],
      },
      {
        Name: "Jade",
        Id: 2,
        reelInstance: {
          "0": 10,
          "1": 10,
          "2": 10,
          "3": 10,
          "4": 10,
        },
        useWildSub: true,
        multiplier: [
          [60, 0],
          [15, 0],
          [5, 0],
        ],
      },
      {
        Name: "Drum",
        Id: 3,
        reelInstance: {
          "0": 10,
          "1": 10,
          "2": 10,
          "3": 10,
          "4": 10,
        },
        useWildSub: true,
        multiplier: [
          [100, 0],
          [20, 0],
          [7, 0],
        ],
      },
      {
        Name: "Girl",
        Id: 4,
        reelInstance: {
          "0": 4,
          "1": 4,
          "2": 4,
          "3": 4,
          "4": 4,
        },
        useWildSub: true,
        multiplier: [
          [160, 0],
          [30, 0],
          [10, 0],
        ],
      },
      {
        Name: "Boy",
        Id: 5,
        reelInstance: {
          "0": 4,
          "1": 4,
          "2": 4,
          "3": 4,
          "4": 4,
        },
        useWildSub: true,
        multiplier: [
          [200, 0],
          [40, 0],
          [15, 0],
        ],
      },
      {
        Name: "King",
        Id: 6,
        reelInstance: {
          "0": 4,
          "1": 4,
          "2": 4,
          "3": 4,
          "4": 4,
        },
        useWildSub: true,
        multiplier: [
          [400, 0],
          [80, 0],
          [20, 0],
        ],
      },
      {
        Name: "Emperor",
        Id: 7,
        reelInstance: {
          "0": 4,
          "1": 4,
          "2": 4,
          "3": 4,
          "4": 4,
        },
        useWildSub: true,
        multiplier: [
          [1000, 0],
          [200, 0],
          [50, 0],
        ],
      },
      {
        Name: "BlueWild",
        Id: 8,
        reelInstance: {
          "0": 3,
          "1": 3,
          "2": 3,
          "3": 3,
          "4": 3,
        },
        description: "Replace all except Scatter & GoldWild",
        useWildSub: false,
        multiplier: [],
      },
      {
        Name: "GoldWild",
        Id: 9,
        reelInstance: {
          "0": 2,
          "1": 2,
          "2": 2,
          "3": 2,
          "4": 2,
        },
        description:
          "Replace all symbol except Scatter.\n If there are 2 or more GoldWild symbols in a game, each GoldWild symbol will unfold and become a roll of 3 GoldWild.",
        useWildSub: false,
        multiplier: [],
      },
      {
        Name: "Scatter",
        Id: 10,
        reelInstance: {
          "0": 9,
          "1": 9,
          "2": 9,
          "3": 9,
          "4": 9,
        },
        description:
          "Activates 3, 5, or 10 free spins when 3, 4, or 5 symbols appear anywhere on the result matrix.",
        useWildSub: false,
        multiplier: [
          [0, 10],
          [0, 5],
          [0, 3],
        ],
      },
    ],
  },
];
