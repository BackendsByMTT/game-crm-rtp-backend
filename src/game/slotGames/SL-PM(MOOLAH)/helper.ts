import { WinData } from "../BaseSlotGame/WinData";
import { convertSymbols, PlayerData, UiInitData } from "../../Utils/gameUtils";
import { SLPM } from "./planetMoolahBase"
/**
* Initializes the game settings using the provided game data and game instance.
* @param gameData - The data used to configure the game settings.
* @param gameInstance - The instance of the SLCM class that manages the game logic.
* @returns An object containing initialized game settings.
*/
export function initializeGameSettings(gameData: any, gameInstance: SLPM) {
    return {
        id: gameData.gameSettings.id,
        matrix: gameData.gameSettings.matrix,
        bets: gameData.gameSettings.bets,
        Symbols: gameInstance.initSymbols,
        resultSymbolMatrix: [],
        currentGamedata: gameData.gameSettings,
        _winData: new WinData(gameInstance),
        currentBet: 0,
        currentLines: 0,
        BetPerLines: 0,
        reels: [],
        hasreSpin: false,
    };
}
/**
 * Generates the initial reel setup based on the game settings.
 * @param gameSettings - The settings used to generate the reel setup.
 * @returns A 2D array representing the reels, where each sub-array corresponds to a reel.
 */
export function generateInitialReel(gameSettings: any): string[][] {
    const reels = [[], [], [], [], []];
    gameSettings.Symbols.forEach(symbol => {
        for (let i = 0; i < 5; i++) {
            const count = symbol.reelInstance[i] || 0;
            for (let j = 0; j < count; j++) {
                reels[i].push(symbol.Id);
            }
        }
    });
    reels.forEach(reel => {
        shuffleArray(reel);
    });
    return reels;
}
/**
 * Shuffles the elements of an array in place using the Fisher-Yates algorithm.
 * @param array - The array to be shuffled.
 */
function shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
/**
 * Sends the initial game and player data to the client.
 * @param gameInstance - The instance of the SLCM class containing the game settings and player data.
 */
export function sendInitData(gameInstance: SLPM) {
    UiInitData.paylines = convertSymbols(gameInstance.settings.Symbols);
    const reels = generateInitialReel(gameInstance.settings);
    gameInstance.settings.reels = reels;
    const dataToSend = {
        GameData: {
            Reel: reels,
            Bets: gameInstance.settings.currentGamedata.bets,

        },
        UIData: UiInitData,
        PlayerData: {
            Balance: gameInstance.getPlayerData().credits,
            haveWon: gameInstance.playerData.haveWon,
            currentWining: gameInstance.playerData.currentWining,
            totalbet: gameInstance.playerData.totalbet,
        },
    };
    gameInstance.sendMessage("InitData", dataToSend);
}