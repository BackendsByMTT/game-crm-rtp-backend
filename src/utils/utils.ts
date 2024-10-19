import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";

import { IPlayer, IUser } from "../dashboard/users/userType";
import createHttpError from "http-errors";
import mongoose from "mongoose";
import { TransactionController } from "../dashboard/transactions/transactionController";
import { v2 as cloudinary } from "cloudinary";
import { config } from "../config/config";
import bcrypt from "bcrypt";
import { users } from "../socket";


const transactionController = new TransactionController()

export const clients: Map<string, WebSocket> = new Map();

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

export const rolesHierarchy = {
  company: ["master", "distributor", "subdistributor", "store", "player"],
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
  for (const [username, playerSocket] of users) {
    if (playerSocket) {
      const socketUser = users.get(client.username);
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
  existingPassword: string
) => {
  try {
    if (!existingPassword) {
      throw createHttpError(
        400,
        "Existing password is required to update the password"
      );
    }

    // Check if existingPassword matches client's current password
    const isPasswordValid = await bcrypt.compare(
      existingPassword,
      client.password
    );
    if (!isPasswordValid) {
      throw createHttpError(400, "Existing password is incorrect");
    }

    // Update password
    client.password = await bcrypt.hash(password, 10);
  } catch (error) {
    console.log(error);
    throw error
  }
};

export const updateCredits = async (
  client: IUser | IPlayer,
  creator: IUser,
  credits: { type: string; amount: number }
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { type, amount } = credits;

    // Validate credits
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
    company: "User",
    master: "User",
    distributor: "User",
    subdistributor: "User",
    store: "Player",
  };
  return rolesHierarchy[role];
};
