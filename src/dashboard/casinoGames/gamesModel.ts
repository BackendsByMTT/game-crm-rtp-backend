import mongoose from "mongoose";
import { Games } from "./gamestype";
import { timeStamp } from "console";
const GameSchema = new mongoose.Schema<Games>(
  {
    gameName: { type: String, required: true, unique: true },
    gameThumbnailUrl: { type: String, required: true },
    gameHostLink: { type: String, required: true },
    type: { type: String, required: true },
    category: { type: String, required: true },
    status: {
      type: Boolean,
      require: true,
      default: true,
    },
    tagName: {
      type: String,
      require: true,
    },
  },
  {
    timestamps: true,
  }
);

const Game = mongoose.model<Games>("casinoGames", GameSchema);

export default Game;
