import mongoose, { SortOrder } from "mongoose";
import { ITransaction } from "./transactionType";
import { rolesHierarchy } from "../../utils/utils";
import createHttpError from "http-errors";
import Transaction from "./transactionModel";
import { Player, User } from "../users/userModel";
import { QueryParams } from "../../utils/globalTypes";
import { messageType } from "../../game/Utils/gameUtils";
import { sessionManager } from "../session/sessionManager";

export class TransactionService {

  async createTransaction(
    type: string,
    manager: any,
    client: any,
    amount: number,
    session: mongoose.ClientSession
  ): Promise<ITransaction> {

    // Check if the client is currently in a game via socket connection
    const socketUser = sessionManager.getPlayerPlatform(client.username);
    if (socketUser?.gameData.socket) {
      throw createHttpError(403, "The client must exit their current game session before initiating a transaction.");
    }

    if (!rolesHierarchy[manager.role]?.includes(client.role)) {
      throw createHttpError(
        403,
        `A ${manager.role} is not authorized to perform transactions with a ${client.role}.`
      );
    }

    if (type === "recharge") {
      if (manager.credits < amount) {
        throw createHttpError(400, "Insufficient credits available for recharge.");
      }
      client.credits += amount;
      client.totalRecharged += amount;
      manager.credits -= amount;
    } else if (type === "redeem") {
      if (client.credits < amount) {
        throw createHttpError(400, "Client does not have enough credits to redeem.");
      }
      client.credits -= amount;
      client.totalRedeemed += amount;
      manager.credits += amount;
    } else {
      throw createHttpError(400, "Invalid transaction type specified.");
    }

    const transaction = new Transaction({
      debtor: type === "recharge" ? manager.username : client.username,
      creditor: type === "recharge" ? client.username : manager.username,
      type: type,
      amount: amount,
      createdAt: new Date(),
    });

    // Update SlotGame instance if the client is currently in a game
    // const socketUser = users.get(client.username);

    // if (socketUser?.currentGame) {
    //   socketUser.currentGame.player.credits = client.credits;
    //   socketUser.currentGame.sendMessage(messageType.CREDITSUPDATE, socketUser.currentGame.player.credits)
    // }
    await transaction.save({ session });

    return transaction;
  }

  async getTransactions(
    username: string,
    page: number,
    limit: number,
    query: QueryParams,
    sortField: keyof ITransaction,
    sortOrder: number
  ) {
    const skip = (page - 1) * limit;

    const user =
      (await User.findOne({ username })) ||
      (await Player.findOne({ username }));
    if (!user) {
      throw new Error("User not found");
    }

    const totalTransactions = await Transaction.countDocuments({
      $or: [{ debtor: user.username }, { creditor: user.username }],
      ...query,
    });

    const totalPages = Math.ceil(totalTransactions / limit);

    if (totalTransactions === 0) {
      return {
        transactions: [],
        totalTransactions: 0,
        totalPages: 0,
        currentPage: 0,
        outOfRange: false,
      };
    }

    if (page > totalPages && totalPages !== 0) {
      return {
        transactions: [],
        totalTransactions,
        totalPages,
        currentPage: page,
        outOfRange: true,
      };
    }

    const transactions = await Transaction.find({
      $and: [
        {
          $or: [{ debtor: user.username }, { creditor: user.username }],
        },
        query,
      ],
    })
      .sort({ [sortField]: sortOrder } as Record<string, SortOrder>) // Explicit cast to Record<string, SortOrder>
      .skip(skip)
      .limit(limit);


    return {
      transactions,
      totalTransactions,
      totalPages,
      currentPage: page,
      outOfRange: false,
    };
  }

  deleteTransaction(id: string, session: mongoose.ClientSession) {
    return Transaction.findByIdAndDelete(id).session(session);
  }
}

export default TransactionService;
