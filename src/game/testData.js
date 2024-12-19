"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameData = void 0;
exports.gameData = [
    {
        "id": "SL-AOG",
        "matrix": {
            "x": 5,
            "y": 3
        },
        "linesApiData": [
            [1, 1, 1, 1, 1],
            [0, 0, 0, 0, 0],
            [2, 2, 2, 2, 2],
            [0, 1, 2, 1, 0],
            [2, 1, 0, 1, 2],
            [0, 0, 1, 0, 0],
            [2, 2, 1, 2, 2],
            [1, 2, 2, 2, 1],
            [1, 0, 0, 0, 1],
            [2, 0, 0, 0, 2],
            [0, 2, 2, 2, 0],
            [2, 1, 2, 1, 2],
            [0, 1, 0, 1, 0],
            [1, 1, 2, 1, 1],
            [1, 1, 0, 1, 1],
            [1, 0, 1, 0, 1],
            [1, 2, 1, 2, 1],
            [2, 1, 1, 1, 2],
            [0, 1, 1, 1, 0],
            [1, 0, 2, 0, 1],
            [2, 2, 0, 2, 2],
            [0, 0, 2, 0, 0],
            [0, 2, 0, 2, 0],
            [2, 0, 2, 0, 2],
            [1, 2, 0, 2, 1],
            [0, 1, 2, 2, 2],
            [2, 1, 0, 0, 0],
            [0, 0, 0, 1, 2],
            [2, 2, 2, 1, 0],
            [0, 0, 1, 2, 2]
        ],
        "linesCount": [1, 5, 15, 20, 25, 30],
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
        "wheelProb": [10, 3, 3, 3], // probability of NO wheel of fortune on idx #1 , small wheel of fortune on idx #2, medium wheel of fortune on idx #3, big wheel of fortune on idx  #4
        "goldSymbolProb": [1, 5, 5, 5, 5, 5], // just for visuals extra gold symbols. WHEELPROB will determine if feature will be triggered .idx#1 prob for NO extra gold symbols , idx#2 prob for 1 extra gold symbol and so on
        "smallWheelFeature": {
            "featureValues": [
                1, 1, //levelup
                5, 4, //wilds
                5, 8, //freespin
                20, 40, //multiplier
            ],
            "featureProbs": [
                2, 2, //levelup
                2, 2, //wild
                2, 2, //freespin
                2, 2, //multiplier
            ]
        },
        "mediumWheelFeature": {
            "featureValues": [
                1, 1, //levelup
                6, 3, //wilds
                9, 11, //freespin
                25, 45, //multiplier
            ],
            "featureProbs": [
                2, 2, //levelup
                2, 2, //wild
                2, 2, //freespin
                2, 2, //multiplier
            ]
        },
        "largeWheelFeature": {
            "featureValues": [
                0, 0, //levelup KEEP this 0
                8, 12, //wilds
                15, 21, //freespin
                35, 55, //multiplier
            ],
            "featureProbs": [
                0, 0, //levelup KEEP this 0
                2, 2, //wild
                2, 2, //freespin
                2, 2, //multiplier
            ]
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
                    "4": 10
                },
                "useWildSub": true,
                "multiplier": [
                    [
                        60,
                        0
                    ],
                    [
                        30,
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
                    "4": 10
                },
                "useWildSub": true,
                "multiplier": [
                    [
                        60,
                        0
                    ],
                    [
                        30,
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
                    "4": 10
                },
                "useWildSub": true,
                "multiplier": [
                    [
                        60,
                        0
                    ],
                    [
                        30,
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
                    "4": 10
                },
                "useWildSub": true,
                "multiplier": [
                    [
                        60,
                        0
                    ],
                    [
                        30,
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
                    "0": 10,
                    "1": 10,
                    "2": 10,
                    "3": 10,
                    "4": 10
                },
                "useWildSub": true,
                "multiplier": [
                    [
                        60,
                        0
                    ],
                    [
                        30,
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
                    "0": 10,
                    "1": 10,
                    "2": 10,
                    "3": 10,
                    "4": 10
                },
                "useWildSub": true,
                "multiplier": [
                    [
                        125,
                        0
                    ],
                    [
                        75,
                        0
                    ],
                    [
                        25,
                        0
                    ]
                ]
            },
            {
                "Name": "6",
                "Id": 6,
                "reelInstance": {
                    "0": 10,
                    "1": 10,
                    "2": 10,
                    "3": 10,
                    "4": 10
                },
                "useWildSub": true,
                "multiplier": [
                    [
                        125,
                        0
                    ],
                    [
                        75,
                        0
                    ],
                    [
                        25,
                        0
                    ]
                ]
            },
            {
                "Name": "7",
                "Id": 7,
                "reelInstance": {
                    "0": 10,
                    "1": 10,
                    "2": 10,
                    "3": 10,
                    "4": 10
                },
                "useWildSub": true,
                "multiplier": [
                    [
                        125,
                        0
                    ],
                    [
                        75,
                        0
                    ],
                    [
                        25,
                        0
                    ]
                ]
            },
            {
                "Name": "8",
                "Id": 8,
                "reelInstance": {
                    "0": 10,
                    "1": 10,
                    "2": 10,
                    "3": 10,
                    "4": 10
                },
                "useWildSub": true,
                "multiplier": [
                    [
                        125,
                        0
                    ],
                    [
                        75,
                        0
                    ],
                    [
                        25,
                        0
                    ]
                ]
            },
            {
                "Name": "9",
                "Id": 9,
                "reelInstance": {
                    "0": 10,
                    "1": 10,
                    "2": 10,
                    "3": 10,
                    "4": 10
                },
                "useWildSub": true,
                "multiplier": [
                    [
                        125,
                        0
                    ],
                    [
                        75,
                        0
                    ],
                    [
                        25,
                        0
                    ]
                ]
            },
            {
                "Name": "10",
                "Id": 10,
                "reelInstance": {
                    "0": 10,
                    "1": 10,
                    "2": 10,
                    "3": 10,
                    "4": 10
                },
                "useWildSub": true,
                "multiplier": [
                    [
                        200,
                        0
                    ],
                    [
                        150,
                        0
                    ],
                    [
                        50,
                        0
                    ]
                ]
            },
            {
                "Name": "Wild",
                "Id": 11,
                "reelInstance": {
                    "0": 10,
                    "1": 5,
                    "2": 10,
                    "3": 10,
                    "4": 10
                },
                "description": "Substitutes for all symbols .",
                "useWildSub": false,
                "multiplier": [
                    [
                        200,
                        0
                    ],
                    [
                        150,
                        0
                    ],
                    [
                        50,
                        0
                    ]
                ]
            }
        ]
    }
];
