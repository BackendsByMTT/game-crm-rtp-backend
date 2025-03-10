"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameData = void 0;
exports.gameData = [
    {
        "id": "SL-LS",
        "matrix": {
            "x": 3,
            "y": 3
        },
        "linesApiData": [
            [
                0,
                0,
                0
            ],
            [
                1,
                1,
                1
            ],
            [
                2,
                2,
                2
            ],
            [
                0,
                1,
                2
            ],
            [
                2,
                1,
                0
            ],
            [
                0,
                1,
                0
            ],
            [
                2,
                1,
                2
            ],
            [
                1,
                0,
                1
            ],
            [
                1,
                2,
                1
            ]
        ],
        "linesCount": [
            9
        ],
        "jackpotMultiplier": 100,
        "jackpotCombination": [
            "0",
            "1",
            "2"
        ],
        "paytable": [
            {
                "combination": [
                    "6",
                    "6",
                    "6"
                ],
                "payout": 20
            },
            {
                "combination": [
                    "0",
                    "0",
                    "0"
                ],
                "payout": 16
            },
            {
                "combination": [
                    "1",
                    "1",
                    "1"
                ],
                "payout": 14
            },
            {
                "combination": [
                    "2",
                    "2",
                    "2"
                ],
                "payout": 12
            },
            {
                "combination": [
                    "3",
                    "3",
                    "3"
                ],
                "payout": 8
            },
            {
                "combination": [
                    "4",
                    "4",
                    "4"
                ],
                "payout": 6
            },
            {
                "combination": [
                    "5",
                    "5",
                    "5"
                ],
                "payout": 4
            },
            {
                "combination": [
                    "0",
                    "1",
                    "2"
                ],
                "payout": 5
            },
            {
                "combination": [
                    "0",
                    "2",
                    "1"
                ],
                "payout": 5
            },
            {
                "combination": [
                    "1",
                    "0",
                    "2"
                ],
                "payout": 5
            },
            {
                "combination": [
                    "1",
                    "2",
                    "0"
                ],
                "payout": 5
            },
            {
                "combination": [
                    "2",
                    "0",
                    "1"
                ],
                "payout": 5
            },
            {
                "combination": [
                    "2",
                    "1",
                    "0"
                ],
                "payout": 5
            },
            {
                "combination": [
                    "0",
                    "3"
                ],
                "payout": 3
            },
            {
                "combination": [
                    "3",
                    "0"
                ],
                "payout": 3
            },
            {
                "combination": [
                    "1",
                    "4"
                ],
                "payout": 3
            },
            {
                "combination": [
                    "4",
                    "1"
                ],
                "payout": 3
            },
            {
                "combination": [
                    "2",
                    "5"
                ],
                "payout": 3
            },
            {
                "combination": [
                    "5",
                    "2"
                ],
                "payout": 3
            },
            {
                "combination": [
                    "3",
                    "4",
                    "5"
                ],
                "payout": 1.5
            },
            {
                "combination": [
                    "3",
                    "5",
                    "4"
                ],
                "payout": 1.5
            },
            {
                "combination": [
                    "4",
                    "3",
                    "5"
                ],
                "payout": 1.5
            },
            {
                "combination": [
                    "4",
                    "5",
                    "3"
                ],
                "payout": 1.5
            },
            {
                "combination": [
                    "5",
                    "3",
                    "4"
                ],
                "payout": 1.5
            },
            {
                "combination": [
                    "5",
                    "4",
                    "3"
                ],
                "payout": 1.5
            }
        ],
        "bets": [
            0.01,
            0.02,
            0.04,
            0.05,
            0.07,
            0.1,
            0.2,
            0.4,
            0.5,
            0.7,
            1,
            1.5,
            2,
            3
        ],
        "Symbols": [
            {
                "Name": "0",
                "Id": 0,
                "canmatch": [
                    "0",
                    "1",
                    "2",
                    "3"
                ],
                "reelInstance": {
                    "0": 8,
                    "1": 8,
                    "2": 8
                }
            },
            {
                "Name": "1",
                "Id": 1,
                "canmatch": [
                    "0",
                    "1",
                    "2",
                    "4"
                ],
                "description": "",
                "reelInstance": {
                    "0": 8,
                    "1": 8,
                    "2": 8
                }
            },
            {
                "Name": "2",
                "Id": 2,
                "canmatch": [
                    "0",
                    "1",
                    "2",
                    "5"
                ],
                "reelInstance": {
                    "0": 8,
                    "1": 8,
                    "2": 8
                }
            },
            {
                "Name": "3",
                "Id": 3,
                "canmatch": [
                    "3",
                    "4",
                    "5",
                    "0"
                ],
                "description": "",
                "reelInstance": {
                    "0": 10,
                    "1": 10,
                    "2": 10
                }
            },
            {
                "Name": "4",
                "Id": 4,
                "canmatch": [
                    "3",
                    "4",
                    "5",
                    "1"
                ],
                "description": "",
                "reelInstance": {
                    "0": 10,
                    "1": 10,
                    "2": 10
                }
            },
            {
                "Name": "5",
                "Id": 5,
                "canmatch": [
                    "3",
                    "4",
                    "5",
                    "2"
                ],
                "description": "",
                "reelInstance": {
                    "0": 10,
                    "1": 10,
                    "2": 10
                }
            },
            {
                "Name": "6",
                "Id": 6,
                "canmatch": [],
                "description": "Substitutes for all symbols, For more winnings.",
                "reelInstance": {
                    "0": 8,
                    "1": 8,
                    "2": 8
                }
            },
            {
                "Name": "7",
                "Id": 7,
                "canmatch": [],
                "reelInstance": {
                    "0": 13,
                    "1": 13,
                    "2": 13
                }
            }
        ]
    }
];
