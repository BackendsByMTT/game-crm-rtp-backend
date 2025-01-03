import { Request, Response, NextFunction } from "express";
import { Player, User } from "../users/userModel";
import Transaction from "./transactionModel";
import createHttpError from "http-errors";
import mongoose from "mongoose";
import { AuthRequest, getAllSubordinateIds } from "../../utils/utils";
import { IPlayer, IUser } from "../users/userType";
import { ITransaction } from "./transactionType";
import TransactionService from "./transactionService";
import { QueryParams } from "../../utils/globalTypes";
import { isAdmin } from "../../utils/permissions";
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
    debtor: IUser | IPlayer,
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
      const filter = req.query.filter || "";
      const sortOrder = req.query.sort === "desc" ? -1 : 1;
      const typeQuery = req.query.type as string;


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


      if (role !== 'admin' || !typeQuery) {
        query.$and = [
          {
            $or: [{ debtor: username }, { creditor: username }],
          },
        ];
      } else {
        query.$and = [];
      }

      if (typeQuery) {
        query.$and.push({ type: typeQuery });
      } else if (type) {
        query.$and.push({ type: type });
      }

      if (filter) {
        query.$and.push({
          $or: [
            { creditor: { $regex: filter, $options: "i" } },
            { debtor: { $regex: filter, $options: "i" } },
          ],
        });
      }

      if (updatedAt) {
        const fromDate = new Date(parsedData.updatedAt.From);
        const toDate = new Date(parsedData.updatedAt.To) || new Date();

        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);

        query.$and.push({
          updatedAt: {
            $gte: fromDate,
            $lte: toDate,
          },
        });
      }

      if (amount) {
        query.$and.push({
          amount: {
            $gte: parsedData.amount.From,
            $lte: parsedData.amount.To,
          },
        });
      }


      const totalTransactions = await Transaction.countDocuments(query);

      const totalPages = Math.ceil(totalTransactions / limit);

      if (totalTransactions === 0) {
        return res.status(200).json({
          transactions: [],
          totalTransactions: 0,
          totalPages: 0,
          currentPage: 0,
          outOfRange: false,
        });
      }

      if (page > totalPages && totalPages !== 0) {
        return res.status(400).json({
          message: `Page number ${page} is out of range. There are only ${totalPages} pages available.`,
          totalTransactions,
          totalPages,
          currentPage: page,
          transactions: [],
        });
      }

      const transactions = await Transaction.find(query)
        .sort({ createdAt: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit);


      res.status(200).json({
        totalTransactions,
        totalPages,
        currentPage: page,
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
      const sortOrder = req.query.sort === "desc" ? -1 : 1; // Default to ascending order

      console.log("getTransactionsBySubId : ")


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
        user.role === "supermaster" ||
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
          query,
          "createdAt",
          sortOrder
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

  async getAllTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const _req = req as AuthRequest;
      const { username, role } = _req.user;

      const currentUser = await User.findOne({ username: username, role: role });


      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const filter = req.query.filter || "";
      const sortOrder = req.query.sort === "desc" ? -1 : 1; // Default to ascending order
      const skip = (page - 1) * limit;

      console.log("GET ALL TRANSACTIONS : ")
      console.log(username + " : " + req.query.sort)

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
      if (filter) {
        query.$or = [
          { creditor: { $regex: filter, $options: "i" } },
          { debtor: { $regex: filter, $options: "i" } },
        ];
      }
      if (updatedAt) {
        const fromDate = new Date(parsedData.updatedAt.From);
        const toDate = parsedData.updatedAt.To
          ? new Date(parsedData.updatedAt.To)
          : new Date();

        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);

        query.updatedAt = {
          $gte: fromDate,
          $lte: toDate,
        };
      }

      if (amount) {
        query.amount = {
          $gte: parsedData.amount.From,
          $lte: parsedData.amount.To,
        };
      }

      // If the user is not an admin, only return transactions that involve the user or their subordinates
      if (!isAdmin(currentUser)) {
        const allSubordinateIds = await this.getAllSubordinateIds(currentUser._id as mongoose.Types.ObjectId, currentUser.role);
        query.$or = [
          { creditor: { $in: [currentUser.username, ...allSubordinateIds] } },
          { debtor: { $in: [currentUser.username, ...allSubordinateIds] } },
        ];
      }

      const totalTransactions = await Transaction.countDocuments(query);
      const totalPages = Math.ceil(totalTransactions / limit);


      // Check if the requested page is out of range
      if (page > totalPages && totalPages !== 0) {
        return res.status(400).json({
          message: `Page number ${page} is out of range. There are only ${totalPages} pages available.`,
          totalTransactions,
          totalPages,
          currentPage: page,
          transactions: [],
        });
      }

      const transactions = await Transaction.find(query)
        .sort({ "createdAt": sortOrder }) // Sort by the specified field and order
        .skip(skip)
        .limit(limit);

      res.status(200).json({
        totalTransactions,
        totalPages,
        currentPage: page,
        transactions,
      });
    } catch (error) {
      console.error(
        `Error fetching all transactions by client ID: ${error}`
      );
      console.log(error)
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

  async getAllSubordinateIds(userId: mongoose.Types.ObjectId, role: string): Promise<mongoose.Types.ObjectId[]> {
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
}
