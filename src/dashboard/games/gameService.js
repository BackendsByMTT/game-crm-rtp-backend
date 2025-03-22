// import { NextFunction, Request, Response } from "express";
// import { config } from "../../config/config";
// import { Platform } from "./gameModel";
// export async function GamesUrl() {
//     try {
//         const platform = config.platformName;
//         const platformData = await Platform.findOne({ name: platform });
//         if (platformData && platformData.games) {
//             const gameUrls = platformData.games.map(game => game.url);
//             return gameUrls
//         } else {
//             console.log('No games found for the specified platform.');
//             return []
//         }
//     } catch (error) {
//         console.error('Error fetching platform data:', error);
//         return []
//     }
// }
