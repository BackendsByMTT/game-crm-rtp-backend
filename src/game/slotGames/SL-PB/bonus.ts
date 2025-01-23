import { SLPB } from "./peakyBlindersBase";
import { getRandomValue } from "./helper";

/**
 * Class to generate a random bonus reel matrix based on the game's bonus settings and frozen indices.
 * The generated matrix is stored in the game settings and represents the outcome of the bonus reels.
 * It also considers any frozen indices that may have been locked during gameplay.
 * 
 * @class RandomBonusGenerator
 * @param current - The current instance of the SLPB class that manages the game logic.
 */

export class RandomBonusGenerator {
    constructor(current: SLPB) {
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
 * @param gameInstance - The instance of the SLPB class that manages the game logic.
 */

export function handleBonusGameSpin(gameInstance: SLPB) {
    // generate a random bonus reel matrix based on the current game settings
    new RandomBonusGenerator(gameInstance);
    const { settings } = gameInstance;
    // handle bonus symbol occurrences in the bonus game
    checkOcurrenceOfSymbols(gameInstance);
    // add the grand prize if applicable
    if (settings.isGrandPrize) {
        const payoutOfBonusGame = calculatePayoutOfBonusGame(gameInstance);
        settings.thunderBonus.thunderSpinPayout = payoutOfBonusGame;
        settings.thunderBonus.thunderSpinCount = 0;
        settings.thunderBonus.isThunderBonus = false;
        settings.thunderBonus.thunderSpinsAdded = false;
    }

}

/**
 * Checks the occurrence of specific bonus symbols in the result matrix and processes them accordingly.
 * Symbols that match the defined bonus symbols are "frozen" and assigned prize values based on their type.
 * Updates frozen indices, prize values, and handles special cases like grand prizes or free spins.
 *
 * @param gameInstance - The instance of the SLPB class that manages the game logic.
 */

function checkOcurrenceOfSymbols(gameInstance: SLPB) {
    const { settings } = gameInstance;

    //Ids of symbols to freeze, excluding placeholders
    const symbolsToFridge = gameInstance.settings.BonusSymbols.filter((value) => value.Name !== "Placeholder").map((symbol) => symbol.Id)
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
                        console.log(symbol, settings.coins.SymbolID);

                        let coinsvalue = 0;
                        switch (true) {
                            case symbol == settings.coins.SymbolID:
                                if (settings.freeSpin.useFreeSpin) {
                                    coinsvalue = getRandomValue(gameInstance, 'coinsValueDuringFreeSpin');
                                } else {
                                    coinsvalue = getRandomValue(gameInstance, 'coinsValue');
                                }
                                break;
                            case symbol == settings.mini.SymbolID:
                                coinsvalue = settings.miniMultiplier;
                                break;

                            case symbol == settings.major.SymbolID:
                                coinsvalue = settings.majorMultiplier;
                                break;

                            case symbol == settings.mega.SymbolID:
                                coinsvalue = settings.megaMultiplier;
                                break;

                            default:
                                // console.log("UNKNOWN SYMBOL", symbol);
                                break;
                        }

                        // Add to frozenIndices
                        settings.frozenIndices.push({
                            position: [colIndex, rowIndex],
                            coinsvalue: coinsvalue,
                            symbol: symbol
                        });

                        frozenPositions.push(positionKey);
                    }
                }
            })
        })
    })

    if (settings.frozenIndices.length === 15) {
        // console.log("JACKPOT");
        settings.isGrandPrize = true;
    }
    if (settings.isGrandPrize) {

    }
    // console.log(settings.frozenIndices.length);

    if (settings.frozenIndices.length > tempFrozenIndicesLength) {
        if (settings.thunderBonus.isThunderBonus === true) {
            settings.thunderBonus.thunderSpinsAdded = true;
            settings.thunderBonus.thunderSpinCount = settings.thunderBonus.thunderSpinAwardedCount;
        }
    }
}

/**
 * Calculates the total payout for the bonus game based on various conditions.
 * The payout is calculated depending on whether a Moon Jackpot, Grand Prize, or regular frozen indices payout applies.
 * - If the Grand Prize is triggered, the payout is calculated using the grand multiplier and current bet.
 * - Additional payout is calculated based on frozen indices, each having a prize value multiplied by the current bet.
 *
 * @param gameInstance - The instance of the SLPB class that manages the game logic.
 * @returns The total payout of the bonus game.
 */

export function calculatePayoutOfBonusGame(gameInstance: SLPB) {
    const { settings } = gameInstance;
    let totalPayout = 0;

    //handle grand prize
    if ((settings.isGrandPrize)) {
        const payout = settings.grandMultiplier * settings.currentBet;
        totalPayout += payout;
    }

    //payout from frozen indices
    const frozenIndicesPayout = settings.frozenIndices.reduce((accumulator, frozenIndex) => {
        const coinsvalue = frozenIndex.coinsvalue || 0;
        return accumulator + coinsvalue * settings.currentBet;
    }, 0);

    totalPayout += frozenIndicesPayout;
    return totalPayout;

}





