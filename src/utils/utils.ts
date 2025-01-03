import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";

import { IPlayer, IUser } from "../dashboard/users/userType";
import createHttpError from "http-errors";
import mongoose from "mongoose";
import { TransactionController } from "../dashboard/transactions/transactionController";
import { v2 as cloudinary } from "cloudinary";
import { config } from "../config/config";
import bcrypt from "bcrypt";
import { sessionManager } from "../dashboard/session/sessionManager";
import { Player, User } from "../dashboard/users/userModel";
import { Socket } from "socket.io";


const transactionController = new TransactionController()

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true
  });

  return `${formattedDate} at ${formattedTime}`;
}

export interface socketConnectionData {
  socket: Socket | null;
  heartbeatInterval: NodeJS.Timeout;
  reconnectionAttempts: number;
  maxReconnectionAttempts: number;
  reconnectionTimeout: number;
  cleanedUp: boolean;
  platformId?: string | null;

}

export const rolesHierarchy = {
  supermaster: ["master", "distributor", "subdistributor", "store", "player"],
  master: ["distributor"],
  distributor: ["subdistributor"],
  subdistributor: ["store"],
  store: ["player"],
};

cloudinary.config({
  cloud_name: config.cloud_name,
  api_key: config.api_key,
  api_secret: config.api_secret,
});

export enum MESSAGEID {
  AUTH = "AUTH",
  SPIN = "SPIN",
  GAMBLE = "GAMBLE",
  GENRTP = "GENRTP",
}

export const enum MESSAGETYPE {
  ALERT = "alert",
  MESSAGE = "message",
  ERROR = "internalError",
}

export enum eventType {
  ENTERED_PLATFORM = "ENTERED_PLATFORM",
  EXITED_PLATFORM = "EXITED_PLATFORM",
  ENTERED_GAME = "ENTERED_GAME",
  EXITED_GAME = "EXITED_GAME",
  GAME_SPIN = "HIT_SPIN",
  UPDATED_SPIN = "UPDATED_SPIN",
}

export interface DecodedToken {
  username: string;
  role: string;
}

export interface AuthRequest extends Request {
  user: {
    username: string;
    role: string;
  };
}

export interface AuthRequest extends Request {
  userId: string;
  userRole: string;
  userName: string;
}

export interface CustomJwtPayload extends JwtPayload {
  role: string;
}

export const updateStatus = (client: IUser | IPlayer, status: string) => {
  // Destroy SlotGame instance if we update user to inactive && the client is currently in a game
  const validStatuses = ["active", "inactive"];
  if (!validStatuses.includes(status)) {
    throw createHttpError(400, "Invalid status value");
  }
  client.status = status;
  for (const [username, playerSocket] of sessionManager.getPlatformSessions()) {
    if (playerSocket) {
      const socketUser = sessionManager.getPlayerPlatform(client.username)
      if (socketUser) {
        if (status === 'inactive') {
          socketUser.forceExit();
        }
      } else {
        console.warn(`User ${client.username} does not have a current game or settings.`);
      }
    }
  }
};

export const updatePassword = async (
  client: IUser | IPlayer,
  password: string,
) => {
  try {
    // Update password
    client.password = await bcrypt.hash(password, 10);
  } catch (error) {
    console.log(error);
    throw error
  }
};


export const updateCredits = async (
  client: IUser | IPlayer,
  creator: IUser | IPlayer,
  credits: { type: string; amount: number }
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const clientSocket = sessionManager.getPlatformSessions().get(client.username);
    if (clientSocket) {
      if (clientSocket.gameData.socket || clientSocket.currentGameData.gameId) {
        throw createHttpError(409, "Cannot recharge while in a game")
      }
    }

    const agentSocket = sessionManager.getActiveManagerByUsername(client.username);
    const managerSocket = sessionManager.getActiveManagerByUsername(creator.username)


    const { type, amount } = credits;

    if (
      !type ||
      typeof amount !== "number" ||
      !["recharge", "redeem"].includes(type)
    ) {
      throw createHttpError(
        400,
        "Credits must include a valid type ('recharge' or 'redeem') and a numeric amount"
      );
    }

    const transaction = await transactionController.createTransaction(
      type,
      creator,
      client,
      amount,
      session
    );

    // Add the transaction to both users' transactions arrays
    client.transactions.push(transaction._id as mongoose.Types.ObjectId);
    creator.transactions.push(transaction._id as mongoose.Types.ObjectId);

    await client.save({ session });
    await creator.save({ session });


    if (
      managerSocket &&
      managerSocket.socketData.socket
    ) {
      managerSocket.sendData({
        type: "CREDITS",
        payload: { credits: creator.credits, role: creator.role }
      });
      managerSocket.credits = creator.credits;
    }

    if (agentSocket && agentSocket.socketData.socket) {
      agentSocket.sendData({
        type: "CREDITS",
        payload: { credits: client.credits, role: client.role }
      });
      agentSocket.credits = client.credits
    }

    if (clientSocket && clientSocket.platformData.socket && clientSocket.platformData.socket.connected) {
      clientSocket.playerData.credits = client.credits;
      clientSocket.sendData({ type: "CREDIT", data: { credits: client.credits } }, "platform");
      clientSocket.playerData.credits = client.credits;
    }

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const uploadImage = (image) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      image,
      { folder: "casinoGames" },
      (error, result) => {
        if (result && result.secure_url) {
          // console.log(result.secure_url);
          return resolve(result.secure_url);
        }
        console.log(error.message);
        return reject({ message: error.message });
      }
    );
  });
};

export const getSubordinateModel = (role: string) => {
  const rolesHierarchy: Record<string, string> = {
    supermaster: "User",
    master: "User",
    distributor: "User",
    subdistributor: "User",
    store: "Player",
  };
  return rolesHierarchy[role];
};

export const getManagerName = async (username: string): Promise<string | null> => {
  try {
    // Fetch the player and populate the 'createdBy' field
    const player = await Player.findOne({ username }).populate("createdBy").exec();

    if (!player) {
      console.error(`Player ${username} not found in the database.`);
      return null;
    }

    // Check if 'createdBy' is populated and return the manager's name
    const manager = player.createdBy as IUser;
    if (manager && manager.name) {
      return manager.name;
    } else {
      console.log(`No manager found for player ${username}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching manager for player ${username}:`, error);
    return null;
  }
};

export function precisionRound(number, precision) {
  var factor = Math.pow(10, precision);
  return Math.round(number * factor) / factor;
}

export async function getAllSubordinateIds(userId: mongoose.Types.ObjectId, role: string): Promise<mongoose.Types.ObjectId[]> {
  let allSubordinateIds: mongoose.Types.ObjectId[] = [];

  if (role === "store") {
    // Fetch subordinates from the Player collection
    const directSubordinates = await Player.find({ createdBy: userId }, { _id: 1 });
    const directSubordinateIds = directSubordinates.map(sub => sub._id as mongoose.Types.ObjectId);
    allSubordinateIds = [...directSubordinateIds];
  } else {
    // Fetch subordinates from the User collection
    const directSubordinates = await User.find({ createdBy: userId }, { _id: 1, role: 1 });
    const directSubordinateIds = directSubordinates.map(sub => sub._id as mongoose.Types.ObjectId);
    allSubordinateIds = [...directSubordinateIds];

    // If the role is company, also fetch subordinates from the Player collection
    if (role === "supermaster") {
      const directPlayerSubordinates = await Player.find({ createdBy: userId }, { _id: 1 });
      const directPlayerSubordinateIds = directPlayerSubordinates.map(sub => sub._id as mongoose.Types.ObjectId);
      allSubordinateIds = [...allSubordinateIds, ...directPlayerSubordinateIds];
    }

    for (const sub of directSubordinates) {
      const subSubordinateIds = await this.getAllSubordinateIds(sub._id as mongoose.Types.ObjectId, sub.role);
      allSubordinateIds = [...allSubordinateIds, ...subSubordinateIds];
    }
  }

  return allSubordinateIds;
}

export async function getAllPlayerSubordinateIds(userId: mongoose.Types.ObjectId, role: string): Promise<mongoose.Types.ObjectId[]> {
  let allPlayerSubordinateIds: mongoose.Types.ObjectId[] = [];

  if (role === "store") {
    // Fetch subordinates from the Player collection
    const directSubordinates = await Player.find({ createdBy: userId }, { _id: 1 });
    const directSubordinateIds = directSubordinates.map(sub => sub._id as mongoose.Types.ObjectId);
    allPlayerSubordinateIds = [...directSubordinateIds];
  } else {
    // Fetch subordinates from the User collection
    const directSubordinates = await User.find({ createdBy: userId }, { _id: 1, role: 1 });
    const directSubordinateIds = directSubordinates.map(sub => sub._id as mongoose.Types.ObjectId);

    // If the role is company, also fetch subordinates from the Player collection
    if (role === "supermaster") {
      const directPlayerSubordinates = await Player.find({ createdBy: userId }, { _id: 1 });
      const directPlayerSubordinateIds = directPlayerSubordinates.map(sub => sub._id as mongoose.Types.ObjectId);
      allPlayerSubordinateIds = [...allPlayerSubordinateIds, ...directPlayerSubordinateIds];
    }

    for (const sub of directSubordinates) {
      const subSubordinateIds = await this.getAllPlayerSubordinateIds(sub._id as mongoose.Types.ObjectId, sub.role);
      allPlayerSubordinateIds = [...allPlayerSubordinateIds, ...subSubordinateIds];
    }
  }

  return allPlayerSubordinateIds;
}