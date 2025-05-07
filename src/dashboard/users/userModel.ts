import mongoose, { Model, Schema, Types } from "mongoose";
import { IPlayer, IPlayerModel, IUser } from "./userType";

export const UserSchema: Schema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    status: { type: String, default: "active" },
    password: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ["admin", "supermaster", "master", "distributor", "subdistributor", "store"]
    },
    subordinates: [
      { type: mongoose.Types.ObjectId, refPath: "subordinateModel" },
    ],
    transactions: [{ type: mongoose.Types.ObjectId, ref: "Transaction" }],
    lastLogin: { type: Date, default: null },
    loginTimes: { type: Number, default: 0 },
    totalRecharged: { type: Number, default: 0 },
    totalRedeemed: { type: Number, default: 0 },
    credits: { type: Number, required: true },
    createdBy: { type: Types.ObjectId as any, ref: "User", default: null },
  },
  { timestamps: true }
);

UserSchema.virtual("subordinateModel").get(function (this: IUser) {
  const rolesHierarchy: Record<string, string> = {
    admin: "User",
    supermaster: "User",
    master: "User",
    distributor: "User",
    subdistributor: "User",
    store: "Player",
  };
  return rolesHierarchy[this.role];
});


export const PlayerSchema = new Schema<IPlayer>(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: "player", immutable: true },
    status: { type: String, default: "active" },
    lastLogin: { type: Date, default: null },
    loginTimes: { type: Number, default: 0 },
    totalRecharged: { type: Number, default: 0 },
    totalRedeemed: { type: Number, default: 0 },
    credits: { type: Number, default: 0 },
    favouriteGames: { type: [String], default: [] },
    transactions: [{ type: mongoose.Types.ObjectId, ref: "Transaction" }],
    createdBy: { type: Types.ObjectId as any, ref: "User", default: null },
  },
  { timestamps: true }
);

PlayerSchema.statics.getHierarchyUsers = async function (username: string): Promise<IUser[]> {
  const hierarchy: IUser[] = [];

  const player = await this.findOne({ username: username }).populate("createdBy");
  if (!player || !player.createdBy) {
    console.error("Player not found or has no creator");
    return hierarchy;
  }

  let currentManager = await User.findById(player.createdBy);

  while (currentManager && currentManager.createdBy) {
    hierarchy.push(currentManager);
    currentManager = await User.findById(currentManager.createdBy);
  }

  return hierarchy;
}

const User: Model<IUser> = mongoose.model<IUser>("User", UserSchema);
const Player = mongoose.model<IPlayer, IPlayerModel>("Player", PlayerSchema);

export { User, Player };
