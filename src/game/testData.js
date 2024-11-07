"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameData = void 0;
exports.gameData = [
    {
        "id": "SL-BE",
        "matrix": {
            "x": 6,
            "y": 3
        },
        "linesApiData": [
            [0, 0, 0, 0, 0, 0],
            [1, 1, 1, 1, 1, 1],
            [2, 2, 2, 2, 2, 2],
            [0, 0, 1, 1, 0, 0],
            [0, 0, 2, 2, 0, 0],
            [1, 1, 0, 0, 1, 1],
            [1, 1, 2, 2, 1, 1],
            [2, 2, 0, 0, 2, 2],
            [2, 2, 1, 1, 2, 2],
            [0, 0, 1, 1, 2, 2],
            [2, 2, 1, 1, 0, 0],
            [0, 1, 1, 1, 1, 0],
            [0, 2, 2, 2, 2, 0],
            [1, 2, 2, 2, 2, 1],
            [1, 0, 0, 0, 0, 1],
            [2, 0, 0, 0, 0, 2],
            [2, 1, 1, 1, 1, 2],
            [0, 1, 0, 0, 1, 0],
            [0, 2, 0, 0, 2, 0],
            [1, 0, 1, 1, 0, 1],
            [1, 2, 1, 1, 2, 1],
            [2, 0, 2, 2, 0, 2],
            [2, 1, 2, 2, 1, 2],
            [0, 1, 2, 2, 1, 0],
            [0, 2, 1, 1, 2, 0],
            [1, 0, 2, 2, 0, 1],
            [1, 2, 0, 0, 2, 1],
            [2, 0, 1, 1, 0, 2],
            [2, 1, 0, 0, 1, 2],
            [0, 1, 2, 1, 0, 1],
        ],
        "linesCount": [
            1,
            5,
            15,
            20,
            25,
            30
        ],
        "bets": [
            0.0005,
            0.0025,
            0.005,
            0.0125,
            0.025,
            0.0375,
            0.05,
            0.0625,
            0.1,
            0.15,
            0.25,
            0.5,
            0.75,
            1,
            1.5,
            2
        ],
        "bats": {
            "isEnabled": true,
            "multiplier": [300, 150, 90, 45, 24, 15, 6, 3, 1.2, 0.6, 0, 0, 0]
        },
        "freeSpin": {
            "isEnabled": true,
            "countIncrement": 8,
            "bloodSplash": {
                "countProb": [20, 10, 10, 10, 20, 25] // prob of 1 ,2,3,4,5,6,7 or 8 bloodsplashes
            }
        },
        "bonus": {
            "type": "spin",
            "isEnabled": false,
            "noOfItem": 8,
            "payOut": [200, 100, 70, 50, 30, 20, 10, 5],
            "payOutProb": [0.05, 0.5, 1, 3, 10, 20, 25, 39.4]
        },
        "wild": {
            "isEnabled": true,
            "multiplier": [10, 20, 30, 40]
        },
        "gamble": {
            "isEnabled": true
        },
        "Symbols": [
            {
                "Name": "0",
                "Id": 0,
                "reelInstance": {
                    "0": 10,
                    "1": 10,
                    "2": 10,
                    "3": 10,
                    "4": 10,
                    "5": 10
                },
                "useWildSub": true,
                "multiplier": [
                    [
                        100,
                        0
                    ],
                    [
                        75,
                        0
                    ],
                    [
                        45,
                        0
                    ],
                    [
                        15,
                        0
                    ]
                ]
            },
            {
                "Name": "1",
                "Id": 1,
                "reelInstance": {
                    "0": 10,
                    "1": 10,
                    "2": 10,
                    "3": 10,
                    "4": 10,
                    "5": 10
                },
                "useWildSub": true,
                "multiplier": [
                    [
                        100,
                        0
                    ],
                    [
                        75,
                        0
                    ],
                    [
                        45,
                        0
                    ],
                    [
                        15,
                        0
                    ]
                ]
            },
            {
                "Name": "2",
                "Id": 2,
                "reelInstance": {
                    "0": 10,
                    "1": 10,
                    "2": 10,
                    "3": 10,
                    "4": 10,
                    "5": 10
                },
                "useWildSub": true,
                "multiplier": [
                    [
                        100,
                        0
                    ],
                    [
                        75,
                        0
                    ],
                    [
                        45,
                        0
                    ],
                    [
                        15,
                        0
                    ]
                ]
            },
            {
                "Name": "3",
                "Id": 3,
                "reelInstance": {
                    "0": 10,
                    "1": 10,
                    "2": 10,
                    "3": 10,
                    "4": 10,
                    "5": 10
                },
                "useWildSub": true,
                "multiplier": [
                    [
                        100,
                        0
                    ],
                    [
                        75,
                        0
                    ],
                    [
                        45,
                        0
                    ],
                    [
                        15,
                        0
                    ]
                ]
            },
            {
                "Name": "4",
                "Id": 4,
                "reelInstance": {
                    "0": 5,
                    "1": 5,
                    "2": 5,
                    "3": 5,
                    "4": 5,
                    "5": 5
                },
                "useWildSub": true,
                "multiplier": [
                    [
                        100,
                        0
                    ],
                    [
                        75,
                        0
                    ],
                    [
                        45,
                        0
                    ],
                    [
                        15,
                        0
                    ]
                ]
            },
            {
                "Name": "5",
                "Id": 5,
                "reelInstance": {
                    "0": 5,
                    "1": 5,
                    "2": 5,
                    "3": 5,
                    "4": 5,
                    "5": 5
                },
                "useWildSub": true,
                "multiplier": [
                    [
                        100,
                        0
                    ],
                    [
                        75,
                        0
                    ],
                    [
                        45,
                        0
                    ],
                    [
                        15,
                        0
                    ]
                ]
            },
            {
                "Name": "6",
                "Id": 6,
                "reelInstance": {
                    "0": 5,
                    "1": 5,
                    "2": 5,
                    "3": 5,
                    "4": 5,
                    "5": 5
                },
                "useWildSub": true,
                "multiplier": [
                    [
                        100,
                        0
                    ],
                    [
                        75,
                        0
                    ],
                    [
                        45,
                        0
                    ],
                    [
                        15,
                        0
                    ]
                ]
            },
            {
                "Name": "7",
                "Id": 7,
                "reelInstance": {
                    "0": 5,
                    "1": 5,
                    "2": 5,
                    "3": 5,
                    "4": 5,
                    "5": 5
                },
                "useWildSub": true,
                "multiplier": [
                    [
                        100,
                        0
                    ],
                    [
                        75,
                        0
                    ],
                    [
                        45,
                        0
                    ],
                    [
                        15,
                        0
                    ]
                ]
            },
            {
                "Name": "8",
                "Id": 8,
                "reelInstance": {
                    "0": 5,
                    "1": 5,
                    "2": 5,
                    "3": 5,
                    "4": 5,
                    "5": 5
                },
                "useWildSub": true,
                "multiplier": [
                    [
                        100,
                        0
                    ],
                    [
                        75,
                        0
                    ],
                    [
                        45,
                        0
                    ],
                    [
                        15,
                        0
                    ]
                ]
            },
            {
                "Name": "Bat",
                "Id": 9,
                "reelInstance": {
                    "0": 0,
                    "1": 0,
                    "2": 0,
                    "3": 0,
                    "4": 0,
                    "5": 0
                },
                "useWildSub": false,
                "multiplier": []
            },
            {
                "Name": "BatX2",
                "Id": 10,
                "reelInstance": {
                    "0": 0,
                    "1": 0,
                    "2": 0,
                    "3": 0,
                    "4": 0,
                    "5": 0
                },
                "useWildSub": false,
                "multiplier": []
            },
            {
                "Name": "VampireMan",
                "Id": 11,
                "reelInstance": {
                    "0": 0,
                    "1": 10,
                    "2": 0,
                    "3": 0,
                    "4": 0,
                    "5": 0
                },
                "useWildSub": false,
                "multiplier": []
            },
            {
                "Name": "VampireWoman",
                "Id": 12,
                "reelInstance": {
                    "0": 0,
                    "1": 0,
                    "2": 0,
                    "3": 0,
                    "4": 10,
                    "5": 0
                },
                "useWildSub": false,
                "multiplier": []
            },
            {
                "Name": "HumanMan",
                "Id": 13,
                "reelInstance": {
                    "0": 0,
                    "1": 0,
                    "2": 0,
                    "3": 10,
                    "4": 0,
                    "5": 0
                },
                "useWildSub": false,
                "multiplier": []
            },
            {
                "Name": "HumanWoman",
                "Id": 14,
                "reelInstance": {
                    "0": 0,
                    "1": 0,
                    "2": 10,
                    "3": 0,
                    "4": 0,
                    "5": 0
                },
                "useWildSub": false,
                "multiplier": []
            },
        ]
    }
];
