import mongoose, { Schema } from "mongoose";
import { IPlatform } from "./gameType";

const PayoutsSchema = new Schema(
  {
    gameName: {
      type: String,
      required: true,
      unique: true,
    },
    data: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
);

const newGameSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true
  },
  tagName: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true
  },
  payout: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Payout'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const PlatformSchema = new Schema<IPlatform>({
  name: {
    type: String,
    required: true
  },
  games: {
    type: [newGameSchema],
  }
});

// Create an index on the games.slug field
PlatformSchema.index({ 'games.slug': 1 })
PlatformSchema.index({ 'games.category': 1 });


const Payouts = mongoose.model("Payouts", PayoutsSchema);
const Platform = mongoose.model("Platform", PlatformSchema)

export { Payouts, Platform };