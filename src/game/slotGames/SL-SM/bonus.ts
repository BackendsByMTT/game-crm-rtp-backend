import { SLSM } from "./sizzlingMoonBase";
import { getRandomValue } from "./helper";

/**
 * Class to generate a random bonus reel matrix based on the game's bonus settings and frozen indices.
 * The generated matrix is stored in the game settings and represents the outcome of the bonus reels.
 * It also considers any frozen indices that may have been locked during gameplay.
 * 
 * @class RandomBonusGenerator
 * @param current - The current instance of the SLSM class that manages the game logic.
 */

export class RandomBonusGenerator {
    constructor(current: SLSM) {
        let matrix: string[][] = [];

        // map of frozen indices and it symbols as key value pair
        let frozenIndicesMap = new Map(
            current.settings.frozenIndices.map((frozenIndex) => [
                `${frozenIndex.position[1]},${frozenIndex.position[0]}`,
                frozenIndex.symbol,
            ])
        );
        // Generate the bonus reel matrix with random positions, considering frozen indices
        for (let x = 0; x < current.settings.currentGamedata.matrix.x; x++) {
            const startPosition = this.getRandomIndex(current.settings.bonusReels[x].length - 1);
            for (let y = 0; y < current.settings.currentGamedata.matrix.y; y++) {
                if (!matrix[y]) matrix[y] = [];
                matrix[y][x] = current.settings.bonusReels[x][(startPosition + y) % current.settings.bonusReels[x].length];
                const frozenKey = `${y},${x}`;
                if (frozenIndicesMap.has(frozenKey)) {
                    // freeze with frozen symbol if the current position is frozen
                    matrix[y][x] = frozenIndicesMap.get(frozenKey)!.toString();
                }
            }
        }

        matrix.forEach((row) => console.log(row.join(" ")));
        current.settings.bonusResultMatrix = matrix;
    }

    getRandomIndex(maxValue: number): number {
        return Math.floor(Math.random() * (maxValue + 1));
    }
}

/**
 * Handles the spin of the bonus game by generating a random bonus reel matrix, checking symbol occurrences, 
 * and processing the grand prize if applicable. Updates the game settings with the outcome of the bonus game spin.
 * 
 * @param gameInstance - The instance of the SLSM class that manages the game logic.
 */

export function handleBonusGameSpin(gameInstance: SLSM) {
    // generate a random bonus reel matrix based on the current game settings
    new RandomBonusGenerator(gameInstance);
    if (gameInstance.settings.freeSpin.freeSpinCount <=0) {
                  
        const payoutOfBonusGame = calculatePayoutOfBonusGame(gameInstance); 
        // console.log(payoutOfBonusGame, "Payout");
        gameInstance.settings.freeSpin.freeSpinPayout = payoutOfBonusGame;
       gameInstance.settings.freeSpin.useFreeSpin = false;
        gameInstance.settings.frozenIndices = [];
        gameInstance.settings.moonMysteryData = [];
        gameInstance.settings.bonusResultMatrix = [];
    }
    const { settings } = gameInstance;
    // handle bonus symbol occurrences in the bonus game
    checkOcurrenceOfSymbols(gameInstance);
    // add the grand prize if applicable
    if (settings.isGrandPrize) {
        const payoutOfBonusGame = calculatePayoutOfBonusGame(gameInstance);
        settings.freeSpin.freeSpinPayout = payoutOfBonusGame;
        settings.resultSymbolMatrix = settings.bonusResultMatrix
        settings.bonusResultMatrix =[];
        settings.moonMysteryData =[];
        settings.freeSpin.freeSpinCount = 0;
        settings.freeSpin.useFreeSpin = false;
        settings.freeSpin.freeSpinsAdded = false;
    }

}

/**
 * Checks the occurrence of specific bonus symbols in the result matrix and processes them accordingly.
 * Symbols that match the defined bonus symbols are "frozen" and assigned prize values based on their type.
 * Updates frozen indices, prize values, and handles special cases like grand prizes or free spins.
 *
 * @param gameInstance - The instance of the SLSM class that manages the game logic.
 */

function checkOcurrenceOfSymbols(gameInstance: SLSM) {
    const { settings } = gameInstance;

    //Ids of symbols to freeze, excluding placeholders
    const symbolsToFridge = gameInstance.settings.BonusSymbols.filter((value) => value.Name !== "PlaceHolder").map((symbol) => symbol.Id)
    // console.log(symbolsToFridge, "SYMBOL TO FRIDGE");
    //already frozen positions
    const frozenPositions = settings.frozenIndices.map(
        (frozenIndex) => `${frozenIndex.position[0]},${frozenIndex.position[1]}`
    );
    //to track the length and rewared freespin
    const tempFrozenIndicesLength = settings.frozenIndices.length;
    // console.log(tempFrozenIndicesLength, "frozenInidcesLength");


    settings.bonusResultMatrix.forEach((row, rowIndex) => {
        row.forEach((symbol, colIndex) => {
            symbolsToFridge.forEach((symbolID) => {
                if (symbol == symbolID) {
                    const positionKey = `${colIndex},${rowIndex}`;
                    if (!frozenPositions.includes(positionKey)) {
                        // console.log(positionKey, "position key to freeze");

                        let prizeValue = 0;
                        let transformedSymbol;
                        switch (true) {
                            case symbol == settings.bonus.SymbolID:
                                prizeValue = getRandomValue(gameInstance, 'prize')
                                break;

                            case symbol == settings.mystery.SymbolID:
                                transformedSymbol = getRandomValue(gameInstance, 'mystery')
                                switch (true) {
                                    case transformedSymbol == settings.bonus.SymbolID:
                                        prizeValue = getRandomValue(gameInstance, 'prize');
                                        break;
                                    case transformedSymbol == settings.mini.SymbolID:
                                        prizeValue = settings.miniMultiplier;
                                        break;
                                    case transformedSymbol == settings.minor.SymbolID:
                                        prizeValue = settings.minorMultiplier;
                                        break;
                                    case transformedSymbol == settings.major.SymbolID:
                                        prizeValue = settings.majorMultiplier;
                                        break;
                                    default:
                                        break;
                                }

                                settings.moonMysteryData.push({ id:0, position: [colIndex, rowIndex], prizeValue: prizeValue, symbol: transformedSymbol })
                                break;

                            case symbol == settings.moonMystery.SymbolID:
                                transformedSymbol = getRandomValue(gameInstance, 'moonMystery')
                                switch (true) {
                                    case transformedSymbol == settings.bonus.SymbolID:
                                        prizeValue = getRandomValue(gameInstance, 'prize');
                                        break;
                                    case transformedSymbol == settings.mini.SymbolID:
                                        prizeValue = settings.miniMultiplier;
                                        break;
                                    case transformedSymbol == settings.minor.SymbolID:
                                        prizeValue = settings.minorMultiplier;
                                        break;
                                    case transformedSymbol == settings.major.SymbolID:
                                        prizeValue = settings.majorMultiplier;
                                        break;
                                    case transformedSymbol == settings.moon.SymbolID:
                                        settings.isMoonJackpot = true;
                                        prizeValue = settings.moonMultiplier;
                                        break;
                                    default:
                                        break;
                                }
                                settings.moonMysteryData.push({id:1, position: [colIndex, rowIndex], prizeValue: prizeValue, symbol: transformedSymbol })
                                break;

                            case symbol == settings.mini.SymbolID:
                                prizeValue = settings.miniMultiplier;
                                break;

                            case symbol == settings.minor.SymbolID:
                                prizeValue = settings.minorMultiplier;
                                break;

                            case symbol == settings.major.SymbolID:
                                prizeValue = settings.majorMultiplier;
                                break;

                            default:
                                // console.log("UNKNOWN SYMBOL", symbol);
                                break;
                        }

                        // Add to frozenIndices
                        settings.frozenIndices.push({
                            position: [colIndex, rowIndex],
                            prizeValue: prizeValue,
                            symbol: symbol
                        });

                        frozenPositions.push(positionKey);
                    }
                }
            })
        })
    })

    if (settings.frozenIndices.length === 16) {
        // console.log("JACKPOT");
        settings.isGrandPrize = true;
    }
    if (settings.frozenIndices.length > tempFrozenIndicesLength) {
        if (settings.freeSpin.useFreeSpin === true) {
            settings.freeSpin.freeSpinsAdded = true;
            settings.freeSpin.freeSpinCount = settings.freeSpin.freeSpinAwarded;
        }
    }
}

/**
 * Calculates the total payout for the bonus game based on various conditions.
 * The payout is calculated depending on whether a Moon Jackpot, Grand Prize, or regular frozen indices payout applies.
 * - If the Moon Jackpot is triggered, the payout is calculated using the moon multiplier and current bet.
 * - If the Grand Prize is triggered, the payout is calculated using the grand multiplier and current bet.
 * - Additional payout is calculated based on frozen indices, each having a prize value multiplied by the current bet.
 *
 * @param gameInstance - The instance of the SLSM class that manages the game logic.
 * @returns The total payout of the bonus game.
 */

export function calculatePayoutOfBonusGame(gameInstance: SLSM) {
    const { settings } = gameInstance;
    let totalPayout = 0;
    //handle moon jackpot
    //return i fmoon jackpot(max winning is moon jackpot)
    if (settings.isMoonJackpot) {
        // console.log("MOON JACKPOT");
        gameInstance.playerData.currentWining = 0
        settings.freeSpin.useFreeSpin = false;
        settings.freeSpin.freeSpinCount = 0;
        settings.freeSpin.freeSpinsAdded = false;
        const payout = settings.moonMultiplier * settings.currentBet;
        totalPayout = payout;
        return totalPayout;
    }
    //handle grand prize
    if ((settings.isGrandPrize) && (!settings.isMoonJackpot)) {
        const payout = settings.grandMultiplier * settings.currentBet;
        totalPayout += payout;
    }

    //payout from frozen indices
    const frozenIndicesPayout = settings.frozenIndices.reduce((accumulator, frozenIndex) => {
        const prizeValue = frozenIndex.prizeValue || 0;
        return accumulator + prizeValue * settings.currentBet;
    }, 0);

    totalPayout += frozenIndicesPayout;
    return totalPayout;

}





