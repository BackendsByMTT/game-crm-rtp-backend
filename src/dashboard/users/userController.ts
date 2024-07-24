import { NextFunction, Request, Response } from "express";
import {
  AuthRequest,
  updateCredits,
  updatePassword,
  updateStatus,
} from "../../utils/utils";
import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import { config } from "../../config/config";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { User, Player } from "./userModel";
import UserService from "./userService";
import Transaction from "../transactions/transactionModel";
import { QueryParams } from "../../game/Utils/globalTypes";

export class UserController {
  private userService: UserService;
  private static rolesHierarchy = {
    company: ["master", "distributor", "subdistributor", "store", "player"],
    master: ["distributor"],
    distributor: ["subdistributor"],
    subdistributor: ["store"],
    store: ["player"],
  };

  constructor() {
    this.userService = new UserService();
    this.loginUser = this.loginUser.bind(this);
    this.createUser = this.createUser.bind(this);
    this.getCurrentUser = this.getCurrentUser.bind(this);
    this.getAllSubordinates = this.getAllSubordinates.bind(this);
    this.getSubordinateById = this.getSubordinateById.bind(this);
    this.deleteUser = this.deleteUser.bind(this);
    this.updateClient = this.updateClient.bind(this);
    this.getReport = this.getReport.bind(this);
    this.getASubordinateReport = this.getASubordinateReport.bind(this);
    this.getCurrentUserSubordinates =
      this.getCurrentUserSubordinates.bind(this);
    this.generatePassword = this.generatePassword.bind(this);
  }

  public static getSubordinateRoles(role: string): string[] {
    return this.rolesHierarchy[role] || [];
  }

  public static isRoleValid(role: string, subordinateRole: string): boolean {
    return this.getSubordinateRoles(role).includes(subordinateRole);
  }

  public static getStartAndEndOfPeriod(type: string) {
    const start = new Date();
    const end = new Date();

    switch (type) {
      case "weekly":
        start.setDate(start.getDate() - start.getDay()); // set to start of the week
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() + (6 - end.getDay())); // set to end of the week
        end.setHours(23, 59, 59, 999);
        break;
      case "monthly":
        start.setDate(1); // set to start of the month
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0); // set to end of the month
        end.setHours(23, 59, 59, 999);
        break;
      case "daily":
      default:
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  }

  async generatePassword(req: Request, res: Response, next: NextFunction) {
    const lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
    const uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const digitChars = "0123456789";
    const specialChars = '!@#$%^&()_/,.?":{}|<>';

    let password = "";

    password += this.userService.getRandomChar(lowercaseChars);
    password += this.userService.getRandomChar(uppercaseChars);
    password += this.userService.getRandomChar(digitChars);
    password += this.userService.getRandomChar(specialChars);

    const remainingLength = 8 - password.length;
    for (let i = 0; i < remainingLength; i++) {
      const randomSet = Math.floor(Math.random() * 3);
      if (randomSet === 0) {
        password += this.userService.getRandomChar(lowercaseChars);
      } else if (randomSet === 1) {
        password += this.userService.getRandomChar(uppercaseChars);
      } else {
        password += this.userService.getRandomChar(digitChars);
      }
    }

    password = this.userService.shuffleString(password);
    res.status(200).json({ password });
  }

  async loginUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        throw createHttpError(400, "Username, password are required");
      }

      let user;
      user = await this.userService.findUserByUsername(username);

      if (!user) {
        user = await this.userService.findPlayerByUsername(username);

        if (!user) {
          throw createHttpError(401, "User not found");
        }
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw createHttpError(401, "Invalid username or password");
      }

      user.lastLogin = new Date();

      user.loginTimes = (user.loginTimes || 0) + 1;
      await user.save();

      const token = jwt.sign(
        { id: user._id, username: user.username, role: user.role },
        config.jwtSecret!,
        { expiresIn: "24h" }
      );

      res.cookie("userToken", token, {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
        sameSite: "none",
      });

      res.status(200).json({
        message: "Login successful",
        token: token,
        role: user.role,
      });
    } catch (error) {
      console.log(error);

      next(error);
    }
  }

  async createUser(req: Request, res: Response, next: NextFunction) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const _req = req as AuthRequest;
      const { user } = req.body;
      const { username, role } = _req.user; // ADMIN

      if (
        !user ||
        !user.name ||
        !user.username ||
        !user.password ||
        !user.role ||
        user.credits === undefined
      ) {
        throw createHttpError(400, "All required fields must be provided");
      }

      if (role !== "company" && !UserController.isRoleValid(role, user.role)) {
        throw createHttpError(403, `A ${role} cannot create a ${user.role}`);
      }

      const admin = await this.userService.findUserByUsername(
        username,
        session
      );
      if (!admin) {
        throw createHttpError(404, "Admin not found");
      }

      let existingUser =
        (await this.userService.findPlayerByUsername(user.username, session)) ||
        (await this.userService.findUserByUsername(user.username, session));
      if (existingUser) {
        throw createHttpError(409, "User already exists");
      }

      const hashedPassword = await bcrypt.hash(user.password, 10);

      let newUser;

      if (user.role === "player") {
        newUser = await this.userService.createPlayer(
          { ...user, createdBy: admin._id },
          0,
          hashedPassword,
          session
        );
      } else {
        newUser = await this.userService.createUser(
          { ...user, createdBy: admin._id },
          0,
          hashedPassword,
          session
        );
      }

      if (user.credits > 0) {
        const transaction = await this.userService.createTransaction(
          "recharge",
          admin,
          newUser,
          user.credits,
          session
        );
        newUser.transactions.push(transaction._id as mongoose.Types.ObjectId);
        admin.transactions.push(transaction._id as mongoose.Types.ObjectId);
      }

      await newUser.save({ session });
      admin.subordinates.push(newUser._id);

      await admin.save({ session });

      await session.commitTransaction();
      res.status(201).json(newUser);
    } catch (error) {
      next(error);
    } finally {
      session.endSession();
    }
  }

  async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      const _req = req as AuthRequest;
      const { username, role } = _req.user;

      // throw createHttpError(404, "Access Denied")`

      let user;

      if (role === "player") {
        user = await this.userService.findPlayerByUsername(username);
      } else {
        user = await this.userService.findUserByUsername(username);
      }

      if (!user) {
        throw createHttpError(404, "User not found");
      }

      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  async getAllSubordinates(req: Request, res: Response, next: NextFunction) {
    try {
      const _req = req as AuthRequest;
      const { username: loggedUserName, role: loggedUserRole } = _req.user;

      const loggedUser = await this.userService.findUserByUsername(
        loggedUserName
      );

      if (!loggedUser) {
        throw createHttpError(404, "User not found");
      }

      if (loggedUser.role !== "company") {
        throw createHttpError(
          403,
          "Access denied. Only users with the role 'company' can access this resource."
        );
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;
      const filter = req.query.filter || "";
      const search = req.query.search as string;
      let parsedData: QueryParams = {
        role: "",
        status: "",
        totalRecharged: { From: 0, To: Infinity },
        totalRedeemed: { From: 0, To: Infinity },
        credits: { From: 0, To: Infinity },
        updatedAt: { From: null, To: null },
        type: "",
        amount: { From: 0, To: 0 },
      };

      let role, status, redeem, recharge, credits;

      if (search) {
        parsedData = JSON.parse(search);
        if (parsedData) {
          role = parsedData.role;
          status = parsedData.status;
          redeem = parsedData.totalRedeemed;
          recharge = parsedData.totalRecharged;
          credits = parsedData.credits;
        }
      }

      let query: any = {};
      if (filter) {
        query.username = { $regex: filter, $options: "i" };
      }
      if (role) {
        query.role = { $ne: "company", $eq: role };
      } else if (!role) {
        query.role = { $ne: "company" };
      }
      if (status) {
        query.status = status;
      }
      if (parsedData.totalRecharged) {
        query.totalRecharged = {
          $gte: parsedData.totalRecharged.From,
          $lte: parsedData.totalRecharged.To,
        };
      }

      if (parsedData.totalRedeemed) {
        query.totalRedeemed = {
          $gte: parsedData.totalRedeemed.From,
          $lte: parsedData.totalRedeemed.To,
        };
      }

      if (parsedData.credits) {
        query.credits = {
          $gte: parsedData.credits.From,
          $lte: parsedData.credits.To,
        };
      }

      const userCount = await User.countDocuments(query);
      const playerCount = await Player.countDocuments(query);

      const totalSubordinates = userCount + playerCount;
      const totalPages = Math.ceil(totalSubordinates / limit);

      if (totalSubordinates === 0) {
        return res.status(200).json({
          message: "No subordinates found",
          totalSubordinates: 0,
          totalPages: 0,
          currentPage: 0,
          subordinates: [],
        });
      }

      if (page > totalPages) {
        return res.status(400).json({
          message: `Page number ${page} is out of range. There are only ${totalPages} pages available.`,
          totalSubordinates,
          totalPages,
          currentPage: page,
          subordinates: [],
        });
      }

      let users = [];
      if (skip < userCount) {
        users = await User.find(query).skip(skip).limit(limit);
      }

      const remainingLimit = limit - users.length;
      let players = [];
      if (remainingLimit > 0) {
        const playerSkip = Math.max(0, skip - userCount);
        players = await Player.find(query)
          .skip(playerSkip)
          .limit(remainingLimit);
      }

      const allSubordinates = [...users, ...players];
      console.log(allSubordinates.length);

      res.status(200).json({
        totalSubordinates,
        totalPages,
        currentPage: page,
        subordinates: allSubordinates,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUserSubordinates(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const _req = req as AuthRequest;
      const { username, role } = _req.user;
      const { id } = req.query;

      const currentUser = await User.findOne({ username });
      if (!currentUser) {
        throw createHttpError(401, "User not found");
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      let userToCheck = currentUser;

      if (id) {
        userToCheck = await User.findById(id);
        if (!userToCheck) {
          userToCheck = await Player.findById(id);
          if (!userToCheck) {
            return res.status(404).json({ message: "User not found" });
          }
        }
      }
      let filterRole, status, redeem, recharge, credits;
      const filter = req.query.filter || "";
      const search = req.query.search as string;
      let parsedData: QueryParams = {
        role: "",
        status: "",
        totalRecharged: { From: 0, To: Infinity },
        totalRedeemed: { From: 0, To: Infinity },
        credits: { From: 0, To: Infinity },
        updatedAt: { From: new Date(), To: new Date() },
        type: "",
        amount: { From: 0, To: 0 },
      };

      if (search) {
        parsedData = JSON.parse(search);
        if (parsedData) {
          filterRole = parsedData.role;
          status = parsedData.status;
          redeem = parsedData.totalRedeemed;
          recharge = parsedData.totalRecharged;
          credits = parsedData.credits;
        }
      }

      let query: any = {};
      query.createdBy = userToCheck._id;
      if (filter) {
        query.username = { $regex: filter, $options: "i" };
      }
      if (filterRole) {
        query.role = { $ne: "company", $eq: filterRole };
      } else if (!filterRole) {
        query.role = { $ne: "company" };
      }
      if (status) {
        query.status = status;
      }
      if (parsedData.totalRecharged) {
        query.totalRecharged = {
          $gte: parsedData.totalRecharged.From,
          $lte: parsedData.totalRecharged.To,
        };
      }

      if (parsedData.totalRedeemed) {
        query.totalRedeemed = {
          $gte: parsedData.totalRedeemed.From,
          $lte: parsedData.totalRedeemed.To,
        };
      }

      if (parsedData.credits) {
        query.credits = {
          $gte: parsedData.credits.From,
          $lte: parsedData.credits.To,
        };
      }

      let subordinates;
      let totalSubordinates;

      if (userToCheck.role === "store") {
        totalSubordinates = await Player.countDocuments(query);
        subordinates = await Player.find(query)
          .skip(skip)
          .limit(limit)
          .select(
            "name username status role totalRecharged totalRedeemed credits"
          );
      } else if (userToCheck.role === "company") {
        const userSubordinatesCount = await User.countDocuments(query);
        const playerSubordinatesCount = await Player.countDocuments(query);

        totalSubordinates = userSubordinatesCount + playerSubordinatesCount;
        const userSubordinates = await User.find(query)
          .skip(skip)
          .limit(limit)
          .select(
            "name username status role totalRecharged totalRedeemed credits"
          );

        const remainingLimit = limit - userSubordinates.length;

        const playerSubordinates =
          remainingLimit > 0
            ? await Player.find(query)
                .skip(Math.max(skip - userSubordinatesCount, 0))
                .limit(remainingLimit)
                .select(
                  "name username status role totalRecharged totalRedeemed credits"
                )
            : [];

        subordinates = [...userSubordinates, ...playerSubordinates];
      } else {
        totalSubordinates = await User.countDocuments(query);
        subordinates = await User.find(query)
          .skip(skip)
          .select(
            "name username status role totalRecharged totalRedeemed credits"
          );
      }

      const totalPages = Math.ceil(totalSubordinates / limit);

      if (totalSubordinates === 0) {
        return res.status(200).json({
          message: "No subordinates found",
          totalSubordinates: 0,
          totalPages: 0,
          currentPage: 0,
          subordinates: [],
        });
      }

      if (page > totalPages) {
        return res.status(400).json({
          message: `Page number ${page} is out of range. There are only ${totalPages} pages available.`,
          totalSubordinates,
          totalPages,
          currentPage: page,
          subordinates: [],
        });
      }

      res.status(200).json({
        totalSubordinates,
        totalPages,
        currentPage: page,
        subordinates,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const _req = req as AuthRequest;
      const { username, role } = _req.user;
      const { clientId } = req.params;

      if (!clientId) {
        throw createHttpError(400, "Client Id is required");
      }

      const clientObjectId = new mongoose.Types.ObjectId(clientId);

      const admin = await this.userService.findUserByUsername(username);
      if (!admin) {
        throw createHttpError(404, "Admin Not Found");
      }

      const client =
        (await this.userService.findUserById(clientObjectId)) ||
        (await this.userService.findPlayerById(clientObjectId));

      if (!client) {
        throw createHttpError(404, "User not found");
      }

      if (
        role != "company" &&
        !admin.subordinates.some((id) => id.equals(clientObjectId))
      ) {
        throw createHttpError(403, "Client does not belong to the creator");
      }

      const clientRole = client.role;
      if (
        !UserController.rolesHierarchy[role] ||
        !UserController.rolesHierarchy[role].includes(clientRole)
      ) {
        throw createHttpError(403, `A ${role} cannot delete a ${clientRole}`);
      }

      if (client instanceof User) {
        await this.userService.deleteUserById(clientObjectId);
      } else if (client instanceof Player) {
        await this.userService.deletePlayerById(clientObjectId);
      }

      admin.subordinates = admin.subordinates.filter(
        (id) => !id.equals(clientObjectId)
      );
      await admin.save();

      res.status(200).json({ message: "Client deleted successfully" });
    } catch (error) {
      next(error);
    }
  }

  async updateClient(req: Request, res: Response, next: NextFunction) {
    try {
      const _req = req as AuthRequest;
      const { username, role } = _req.user;
      const { clientId } = req.params;
      const { status, credits, password, existingPassword } = req.body;

      if (!clientId) {
        throw createHttpError(400, "Client Id is required");
      }

      const clientObjectId = new mongoose.Types.ObjectId(clientId);

      let admin;

      admin = await this.userService.findUserByUsername(username);
      if (!admin) {
        admin = await this.userService.findPlayerByUsername(username);

        if (!admin) {
          throw createHttpError(404, "Creator not found");
        }
      }

      const client =
        (await this.userService.findUserById(clientObjectId)) ||
        (await this.userService.findPlayerById(clientObjectId));

      if (!client) {
        throw createHttpError(404, "Client not found");
      }

      // if (role != "company" && !admin.subordinates.some((id) => id.equals(clientObjectId))) {
      //   throw createHttpError(403, "Client does not belong to the creator");
      // }

      if (status) {
        updateStatus(client, status);
      }

      if (password) {
        await updatePassword(client, password, existingPassword);
      }

      if (credits) {
        credits.amount = Number(credits.amount);
        await updateCredits(client, admin, credits);
      }

      await admin.save();
      await client.save();

      res.status(200).json({ message: "Client updated successfully", client });
    } catch (error) {
      console.log("Error in updating : ", error);
      next(error);
    }
  }

  async getSubordinateById(req: Request, res: Response, next: NextFunction) {
    try {
      const _req = req as AuthRequest;
      const { subordinateId } = req.params;
      const { username: loggedUserName, role: loggedUserRole } = _req.user;

      const subordinateObjectId = new mongoose.Types.ObjectId(subordinateId);
      const loggedUser = await this.userService.findUserByUsername(
        loggedUserName
      );

      let user;

      user = await this.userService.findUserById(subordinateObjectId);

      if (!user) {
        user = await this.userService.findPlayerById(subordinateObjectId);

        if (!user) {
          throw createHttpError(404, "User not found");
        }
      }

      if (
        loggedUserRole === "company" ||
        loggedUser.subordinates.includes(subordinateObjectId) ||
        user._id.toString() == loggedUser._id.toString()
      ) {
        let client;

        switch (user.role) {
          case "company":
            client = await User.findById(subordinateId).populate({
              path: "transactions",
              model: Transaction,
            });
            const userSubordinates = await User.find({
              createdBy: subordinateId,
            });

            const playerSubordinates = await Player.find({
              createdBy: subordinateId,
            });

            client = client.toObject(); // Convert Mongoose Document to plain JavaScript object
            client.subordinates = [...userSubordinates, ...playerSubordinates];

            break;

          case "store":
            client = await User.findById(subordinateId)
              .populate({ path: "subordinates", model: Player })
              .populate({ path: "transactions", model: Transaction });
            break;

          case "player":
            client = user;
            break;

          default:
            client = await User.findById(subordinateObjectId)
              .populate({ path: "transactions", model: Transaction })
              .populate({ path: "subordinates", model: User });
        }

        if (!client) {
          throw createHttpError(404, "Client not found");
        }

        console.log(client);

        res.status(200).json(client);
      } else {
        throw createHttpError(
          403,
          "Forbidden: You do not have the necessary permissions to access this resource."
        );
      }
    } catch (error) {
      next(error);
    }
  }

  async getReport(req: Request, res: Response, next: NextFunction) {
    try {
      const _req = req as AuthRequest;
      const { username, role } = _req.user;
      const { type, userId } = req.query;
      const { start, end } = UserController.getStartAndEndOfPeriod(
        type as string
      );
      const allowedAdmins = [
        "company",
        "master",
        "distributor",
        "subdistributor",
        "store",
      ];

      const currentUser = await User.findOne({ username });

      if (!currentUser) {
        throw createHttpError(401, "User not found");
      }

      if (!allowedAdmins.includes(currentUser.role)) {
        throw createHttpError(400, "Access denied : Invalid User ");
      }

      let targetUser = currentUser;

      if (userId) {
        let subordinate = await User.findById(userId);

        if (!subordinate) {
          subordinate = await Player.findById(userId);

          if (!subordinate) {
            throw createHttpError(404, "Subordinate user not found");
          }
        }

        targetUser = subordinate;
      }

      if (targetUser.role === "company") {
        // Total Recharge Amount
        const totalRechargedAmt = await Transaction.aggregate([
          {
            $match: {
              $and: [
                {
                  createdAt: {
                    $gte: start,
                    $lte: end,
                  },
                },
                {
                  type: "recharge",
                },
              ],
            },
          },
          {
            $group: {
              _id: null,
              totalAmount: {
                $sum: "$amount",
              },
            },
          },
        ]);

        // Total Redeem Amount
        const totalRedeemedAmt = await Transaction.aggregate([
          {
            $match: {
              $and: [
                {
                  createdAt: {
                    $gte: start,
                    $lte: end,
                  },
                },
                {
                  type: "redeem",
                },
              ],
            },
          },
          {
            $group: {
              _id: null,
              totalAmount: {
                $sum: "$amount",
              },
            },
          },
        ]);

        const users = await User.aggregate([
          {
            $match: {
              $and: [
                {
                  role: { $ne: targetUser.role },
                },
                {
                  createdAt: { $gte: start, $lte: end },
                },
              ],
            },
          },
          {
            $group: {
              _id: "$role",
              count: { $sum: 1 },
            },
          },
        ]);

        const players = await Player.countDocuments({
          role: "player",
          createdAt: { $gte: start, $lte: end },
        });

        const counts = users.reduce((acc: Record<string, number>, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {});

        counts["player"] = players;

        // Transactions
        const transactions = await Transaction.find({
          createdAt: { $gte: start, $lte: end },
        })
          .sort({ createdAt: -1 })
          .limit(9);

        return res.status(200).json({
          username: targetUser.username,
          role: targetUser.role,
          recharge: totalRechargedAmt[0]?.totalAmount || 0,
          redeem: totalRedeemedAmt[0]?.totalAmount || 0,
          users: counts,
          transactions: transactions,
        });
      } else {
        const userRechargeAmt = await Transaction.aggregate([
          {
            $match: {
              $and: [
                {
                  createdAt: {
                    $gte: start,
                    $lte: end,
                  },
                },
                {
                  type: "recharge",
                },
                {
                  creditor: targetUser.username,
                },
              ],
            },
          },
          {
            $group: {
              _id: null,
              totalAmount: {
                $sum: "$amount",
              },
            },
          },
        ]);

        const userRedeemAmt = await Transaction.aggregate([
          {
            $match: {
              $and: [
                {
                  createdAt: {
                    $gte: start,
                    $lte: end,
                  },
                },
                {
                  type: "redeem",
                },
                {
                  debtor: targetUser.username,
                },
              ],
            },
          },
          {
            $group: {
              _id: null,
              totalAmount: {
                $sum: "$amount",
              },
            },
          },
        ]);

        const userTransactions = await Transaction.find({
          $or: [
            { debtor: targetUser.username },
            { creditor: targetUser.username },
          ],
          createdAt: { $gte: start, $lte: end },
        })
          .sort({ createdAt: -1 })
          .limit(9);

        let users;
        if (targetUser.role === "store" || targetUser.role === "player") {
          users = await Player.aggregate([
            {
              $match: {
                $and: [
                  {
                    createdBy: targetUser._id,
                  },
                  {
                    createdAt: { $gte: start, $lte: end },
                  },
                ],
              },
            },
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ]);
        } else {
          users = await User.aggregate([
            {
              $match: {
                $and: [
                  {
                    createdBy: targetUser._id,
                  },
                  {
                    createdAt: { $gte: start, $lte: end },
                  },
                ],
              },
            },
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ]);
        }

        const counts = users.reduce(
          (acc: { active: number; inactive: number }, curr) => {
            if (curr._id === "active") {
              acc.active += curr.count;
            } else {
              acc.inactive += curr.count;
            }
            return acc;
          },
          { active: 0, inactive: 0 }
        );

        return res.status(200).json({
          username: targetUser.username,
          role: targetUser.role,
          recharge: userRechargeAmt[0]?.totalAmount || 0,
          redeem: userRedeemAmt[0]?.totalAmount || 0,
          users: counts,
          transactions: userTransactions,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  async getASubordinateReport(req: Request, res: Response, next: NextFunction) {
    try {
      const _req = req as AuthRequest;
      const { username: loggedUsername, role: loggedUserRole } = _req.user;
      const { subordinateId } = req.params;
      const { type } = req.query;
      const { start, end } = UserController.getStartAndEndOfPeriod(
        type as string
      );

      const subordinateObjectId = new mongoose.Types.ObjectId(subordinateId);

      // Fetch subordinate details
      let subordinate = await User.findById(subordinateObjectId);

      if (!subordinate) {
        subordinate = await Player.findById(subordinateObjectId);

        if (!subordinate) {
          throw createHttpError(404, "Subordinate not found");
        }
      }

      // Fetch today's transactions where the subordinate is the creditor
      const transactionsTodayAsCreditor = await Transaction.find({
        creditor: subordinate.username,
        createdAt: { $gte: start, $lte: end },
      });

      // Aggregate the total credits given to the subordinate today
      const totalCreditsGivenToday = transactionsTodayAsCreditor.reduce(
        (sum, t) => sum + t.amount,
        0
      );

      // Fetch today's transactions where the subordinate is the debtor
      const transactionsTodayAsDebtor = await Transaction.find({
        debtor: subordinate.username,
        createdAt: { $gte: start, $lte: end },
      });

      // Aggregate the total money spent by the subordinate today
      const totalMoneySpentToday = transactionsTodayAsDebtor.reduce(
        (sum, t) => sum + t.amount,
        0
      );

      // Combine both sets of transactions
      const allTransactions = [
        ...transactionsTodayAsCreditor,
        ...transactionsTodayAsDebtor,
      ];

      // Fetch users and players created by this subordinate today
      const usersCreatedToday = await User.find({
        createdBy: subordinate._id,
        createdAt: { $gte: start, $lte: end },
      });

      const playersCreatedToday = await Player.find({
        createdBy: subordinate._id,
        createdAt: { $gte: start, $lte: end },
      });

      const report = {
        creditsGiven: totalCreditsGivenToday,
        moneySpent: totalMoneySpentToday,
        transactions: allTransactions, // All transactions related to the subordinate
        users: usersCreatedToday,
        players: playersCreatedToday,
      };

      res.status(200).json(report);
    } catch (error) {
      console.log(error);

      next(error);
    }
  }
}
