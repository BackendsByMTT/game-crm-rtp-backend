import { Request, Response, NextFunction } from "express";
import { Player, User } from "../users/userModel";
import Transaction from "./transactionModel";
import createHttpError from "http-errors";
import mongoose from "mongoose";
import { AuthRequest } from "../../utils/utils";
import { IPlayer, IUser } from "../users/userType";
import { ITransaction } from "./transactionType";
import TransactionService from "./transactionService";
import { QueryParams } from "../../game/Utils/globalTypes";

export class TransactionController {
  private transactionService: TransactionService;

  constructor() {
    this.transactionService = new TransactionService();
    this.getTransactions = this.getTransactions.bind(this);
    this.getTransactionsBySubId = this.getTransactionsBySubId.bind(this);
    this.deleteTransaction = this.deleteTransaction.bind(this);
    this.getAllTransactions = this.getAllTransactions.bind(this);
  }

  /**
   * Creates a new transaction.
   */
  async createTransaction(
    type: string,
    debtor: IUser,
    creditor: IUser | IPlayer,
    amount: number,
    session: mongoose.ClientSession
  ): Promise<ITransaction> {
    try {
      const transaction = await this.transactionService.createTransaction(
        type,
        debtor,
        creditor,
        amount,
        session
      );
      return transaction;
    } catch (error) {
      console.error(`Error creating transaction: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieves transactions for the authenticated user.
   */
  async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const _req = req as AuthRequest;
      const { username, role } = _req.user;

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      let parsedData: QueryParams = {
        role: "",
        status: "",
        totalRecharged: { From: 0, To: 0 },
        totalRedeemed: { From: 0, To: 0 },
        credits: { From: 0, To: 0 },
        updatedAt: { From: new Date(), To: new Date() },
        type: "",
        amount: { From: 0, To: Infinity },
      };
      let type, updatedAt, amount;

      if (search) {
        parsedData = JSON.parse(search);
        if (parsedData) {
          type = parsedData.type;
          updatedAt = parsedData.updatedAt;
          amount = parsedData.amount;
        }
      }

      let query: any = {};
      if (type) {
        query.type = type;
      }
      if (updatedAt) {
        query.updatedAt = {
          $gte: parsedData.updatedAt.From,
          $lte: parsedData.updatedAt.To,
        };
      }

      if (amount) {
        query.amount = {
          $gte: parsedData.amount.From,
          $lte: parsedData.amount.To,
        };
      }

      const {
        transactions,
        totalTransactions,
        totalPages,
        currentPage,
        outOfRange,
      } = await this.transactionService.getTransactions(
        username,
        page,
        limit,
        query
      );

      if (outOfRange) {
        return res.status(400).json({
          message: `Page number ${page} is out of range. There are only ${totalPages} pages available.`,
          totalTransactions,
          totalPages,
          currentPage: page,
          transactions: [],
        });
      }

      res.status(200).json({
        totalTransactions,
        totalPages,
        currentPage,
        transactions,
      });
    } catch (error) {
      console.error(`Error fetching transactions: ${error.message}`);
      next(error);
    }
  }

  /**
   * Retrieves transactions for a specific client.
   */
  async getTransactionsBySubId(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const _req = req as AuthRequest;
      const { username, role } = _req.user;
      const { subordinateId } = req.params;

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const user = await User.findOne({ username });
      const subordinate =
        (await User.findOne({ _id: subordinateId })) ||
        (await Player.findOne({ _id: subordinateId }));

      if (!user) {
        throw createHttpError(404, "Unable to find logged in user");
      }

      if (!subordinate) {
        throw createHttpError(404, "User not found");
      }
      let query: any = {};
      if (
        user.role === "company" ||
        user.subordinates.includes(new mongoose.Types.ObjectId(subordinateId))
      ) {
        const {
          transactions,
          totalTransactions,
          totalPages,
          currentPage,
          outOfRange,
        } = await this.transactionService.getTransactions(
          subordinate.username,
          page,
          limit,
          query
        );

        if (outOfRange) {
          return res.status(400).json({
            message: `Page number ${page} is out of range. There are only ${totalPages} pages available.`,
            totalTransactions,
            totalPages,
            currentPage: page,
            transactions: [],
          });
        }

        res.status(200).json({
          totalTransactions,
          totalPages,
          currentPage,
          transactions,
        });
      } else {
        throw createHttpError(
          403,
          "Forbidden: You do not have the necessary permissions to access this resource."
        );
      }
    } catch (error) {
      console.error(
        `Error fetching transactions by client ID: ${error.message}`
      );
      next(error);
    }
  }

  /**
   * Retrieves All transactions
   */
  async getAllTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const _req = req as AuthRequest;
      const { username, role } = _req.user;

      if (role != "company") {
        throw createHttpError(
          403,
          "Access denied. Only users with the role 'company' can access this resource."
        );
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      let parsedData: QueryParams = {
        role: "",
        status: "",
        totalRecharged: { From: 0, To: 0 },
        totalRedeemed: { From: 0, To: 0 },
        credits: { From: 0, To: 0 },
        updatedAt: { From: new Date(), To: new Date() },
        type: "",
        amount: { From: 0, To: Infinity },
      };
      let type, updatedAt, amount;

      if (search) {
        parsedData = JSON.parse(search);
        if (parsedData) {
          type = parsedData.type;
          updatedAt = parsedData.updatedAt;
          amount = parsedData.amount;
        }
      }

      let query: any = {};
      if (type) {
        query.type = type;
      }
      if (updatedAt) {
        query.updatedAt = {
          $gte: parsedData.updatedAt.From,
          $lte: parsedData.updatedAt.To,
        };
      }

      if (amount) {
        query.amount = {
          $gte: parsedData.amount.From,
          $lte: parsedData.amount.To,
        };
      }

      const skip = (page - 1) * limit;

      const totalTransactions = await Transaction.countDocuments(query);
      const totalPages = Math.ceil(totalTransactions / limit);

      // Check if the requested page is out of range
      if (page > totalPages) {
        return res.status(400).json({
          message: `Page number ${page} is out of range. There are only ${totalPages} pages available.`,
          totalTransactions,
          totalPages,
          currentPage: page,
          transactions: [],
        });
      }

      const transactions = await Transaction.find(query).skip(skip).limit(limit);

      res.status(200).json({
        totalTransactions,
        totalPages,
        currentPage: page,
        transactions,
      });
    } catch (error) {
      console.error(
        `Error fetching transactions by client ID: ${error.message}`
      );
      next(error);
    }
  }

  /**
   * Deletes a transaction.
   */
  async deleteTransaction(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw createHttpError(400, "Invalid transaction ID");
      }

      const deletedTransaction =
        await this.transactionService.deleteTransaction(id, session);
      if (deletedTransaction instanceof mongoose.Query) {
        const result = await deletedTransaction.lean().exec();
        if (!result) {
          throw createHttpError(404, "Transaction not found");
        }
        res.status(200).json({ message: "Transaction deleted successfully" });
      } else {
        if (!deletedTransaction) {
          throw createHttpError(404, "Transaction not found");
        }
        res.status(200).json({ message: "Transaction deleted successfully" });
      }
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error(`Error deleting transaction: ${error.message}`);
      next(error);
    }
  }
}
