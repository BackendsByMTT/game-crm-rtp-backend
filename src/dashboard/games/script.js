"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addOrderToExistingGames = addOrderToExistingGames;
const gameModel_1 = require("./gameModel");
function addOrderToExistingGames() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const platforms = yield gameModel_1.Platform.find(); // Fetch all platforms
            for (const platform of platforms) {
                if (platform.games && platform.games.length > 0) {
                    platform.games = platform.games.map((game, index) => {
                        // Only add the order field if it doesn't exist
                        if (game.order === undefined || game.order === null) {
                            return Object.assign(Object.assign({}, game), { order: index + 1 });
                        }
                        return game; // Keep existing order
                    });
                    yield platform.save(); // Save only if there are updates
                }
            }
            console.log("✅ Order field added (if missing) to all games successfully!");
            // mongoose.disconnect();
        }
        catch (error) {
            console.error("❌ Error updating games:", error);
            // mongoose.disconnect();
        }
    });
}
// Run the function
