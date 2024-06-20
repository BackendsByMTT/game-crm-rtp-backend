import jwt from "jsonwebtoken";
import Transaction from "../transaction/transactionModel";
import bcrypt from "bcrypt";
import { NextFunction, Request, Response } from "express";
import { validateApiKey } from "../../middleware/middlware";
import { rolesHierarchy } from "../../utils/utils";
import createHttpError from "http-errors";
import User, { BaseUser, Player } from "./userModel";

const clientDesignation = {
  company: "master",
  master: "distributer",
  distributer: "subDistributer",
  subDistributer: "store",
  store: "player",
};

interface PaginationResults {
  next?: {
    page: number;
    limit: number;
  };
  previous?: {
    page: number;
    limit: number;
  };
}

//{create company controller}
const companyCreation = async (req: Request, res: Response) => {
  // const { username, password } = req.body;
  // if (!username || !password) {
  //   return res.status(400).json({ error: "All fields are required" });
  // }
  // if (password.length < 6) {
  //   return res
  //     .status(400)
  //     .json({ error: "Password should be at least 6 characters" });
  // }
  // try {
  //   const existingUser = await User.findOne({ username });
  //   if (existingUser) {
  //     return res
  //       .status(400)
  //       .json({ error: "This username is already registered" });
  //   }
  //   // Hash password
  //   const hashedPassword = await bcrypt.hash(password, 10);
  //   // Create the new company user
  //   const company = await User.create({
  //     username,
  //     password: hashedPassword,
  //     credits: "Infinity",
  //     designation: "company",
  //     activeStatus: true,
  //   });
  //   // Respond with success message and company data
  //   return res
  //     .status(201)
  //     .json({ message: "Company created successfully", company });
  // } catch (err) {
  //   // Respond with server error
  //   return res
  //     .status(500)
  //     .json({ error: "Internal server error", details: err.message });
  // }
};

//{Login user controller}
const loginUser = async (req: Request, res: Response) => {
  // const { username, password } = req.body;
  // try {
  //   const user = await User.findOne(
  //     { username },
  //     "username password activeStatus designation credits lastLogin loginTimes"
  //   );
  //   if (!user) {
  //     return res.status(404).json({ error: "User not found. Please register" });
  //   }
  //   const passwordIsValid = await bcrypt.compare(password, user.password);
  //   if (!passwordIsValid) {
  //     return res.status(401).json({ error: "Invalid credentials" });
  //   }
  //   if (user.activeStatus !== true) {
  //     return res.status(403).json({ error: "Account is inactive" });
  //   }
  //   const istOffset = 5.5 * 60 * 60 * 1000;
  //   const istDate = new Date(Date.now() + istOffset);
  //   user.lastLogin = istDate.toISOString();
  //   user.loginTimes = (user.loginTimes || 0) + 1;
  //   await user.save();
  //   const token = jwt.sign(
  //     {
  //       username: user.username,
  //       designation: user.designation,
  //     },
  //     process.env.JWT_SECRET!,
  //     { expiresIn: "7d" }
  //   );
  //   res.cookie("userToken", token, {
  //     maxAge: 1000 * 60 * 60 * 24 * 7,
  //     httpOnly: true,
  //     // secure: true,
  //     sameSite: "none",
  //   });
  //   return res.status(200).json({ message: "Login successful", token: token });
  // } catch (err) {
  //   return res
  //     .status(500)
  //     .json({ error: "Internal server error", details: err.message });
  // }
};

//{GET CLIENT DATA AFTER LOGIN}
const clientData = async (req: Request, res: Response) => {
  // const { username } = req.body;
  // try {
  //   const user = await User.findOne({ username: username });
  //   if (!user) {
  //     return res.status(404).json({ message: "User not found" });
  //   }
  //   res.status(200).json(user);
  // } catch (error) {
  //   res
  //     .status(500)
  //     .json({ message: "Internal Server Error", error: error.message });
  // }
};

//{Add sub users to company}
const addClient = async (req, res) => {
  // const {
  //   clientUserName,
  //   password,
  //   clientNickName,
  //   isPlayer,
  //   creatorDesignation,
  //   username,
  //   credits,
  // } = req.body;
  // try {
  //   if (await User.findOne({ username: clientUserName })) {
  //     return res.status(409).json({ error: "Username already exists" });
  //   }
  //   let finalDesignation;
  //   if (creatorDesignation === "subDistributor" && !isPlayer) {
  //     finalDesignation =
  //       clientDesignation[creatorDesignation] || "subDistributor";
  //   } else if (isPlayer) {
  //     finalDesignation = "player";
  //   } else {
  //     finalDesignation = clientDesignation[creatorDesignation];
  //   }
  //   const hashedPassword = await bcrypt.hash(password, 10);
  //   const newUser = await User.create({
  //     username: clientUserName,
  //     password: hashedPassword,
  //     nickName: clientNickName,
  //     designation: finalDesignation,
  //     credits: credits,
  //   });
  //   if (newUser) {
  //     await addClientToUserList(res, username, newUser._id);
  //     return res.status(201).json({ message: "Client added successfully" });
  //   } else {
  //     return res.status(500).json({ error: "Failed to create client" });
  //   }
  // } catch (err) {
  //   console.error(err);
  //   return res.status(500).json({ error: "Internal server error" });
  // }
};

//{addClientToUserList from addClient}
async function addClientToUserList(res, userId, clientId) {
  // try {
  //   const updatedUserClients = await User.findOneAndUpdate(
  //     { username: userId },
  //     { $push: { clientList: clientId } },
  //     { new: true }
  //   );
  //   if (!updatedUserClients) {
  //     res.status(201).json({ error: "failed to add" });
  //   }
  //   return updatedUserClients;
  // } catch (err) {
  //   res.status(500).json({ error: err.message });
  // }
}

//{getRealTimeCredits of users}
const getClientList = async (req: Request, res: Response) => {
  // const { pageNumber, limit, username } = req.body;
  // const page = parseInt(pageNumber) || 1;
  // const limitValue = parseInt(limit) || 10;
  // const startIndex = (page - 1) * limitValue;
  // const results: PaginationResults = {};
  // try {
  //   const user = await User.aggregate([
  //     { $match: { username: username } },
  //     {
  //       $project: {
  //         clientCount: { $size: "$clientList" },
  //       },
  //     },
  //   ]);
  //   const totalClientCount = user[0]?.clientCount;
  //   if (!totalClientCount) {
  //     return res.status(204).json({ error: "No User Found for this client" });
  //   }
  //   if (startIndex + limitValue < totalClientCount) {
  //     results.next = {
  //       page: page + 1,
  //       limit: limitValue,
  //     };
  //   }
  //   if (startIndex > 0) {
  //     results.previous = {
  //       page: page - 1,
  //       limit: limitValue,
  //     };
  //   }
  //   const userList = await User.find({ username: username })
  //     .populate({
  //       path: "clientList",
  //       select:
  //         "username nickName activeStatus designation credits totalRedeemed totalRecharged lastLogin loginTimes",
  //       options: {
  //         limit: limitValue,
  //         skip: startIndex,
  //       },
  //     })
  //     .exec();
  //   const userClientList = userList[0]?.clientList;
  //   if (!userClientList) {
  //     return res.status(201).json({ error: "No Clients Found" });
  //   }
  //   return res
  //     .status(200)
  //     .json({ userClientList, totalPageCount: totalClientCount });
  // } catch (err) {
  //   return res.status(500).json(err);
  // }
};

//{DELETE CLIENT}
const deleteClient = async (req, res) => {
  // const { username } = req.params;
  // try {
  //   const deletedClient = await User.findOneAndDelete({
  //     username: username,
  //   });
  //   if (!deletedClient) {
  //     return res.status(404).json({ error: "Client not found" });
  //   }
  //   return res
  //     .status(204)
  //     .json({ message: `Successfully deleted client ${username}` });
  // } catch (err) {
  //   console.error(err);
  //   return res.status(500).json({ error: "Internal server error" });
  // }
};
//{change user password}
const updateClientPassword = async (req, res) => {
  // const { changedPassword } = req.body;
  // const { clientUserName } = req.params;
  // try {
  //   if (!clientUserName) {
  //     return res.status(400).json({ error: "Username is required." });
  //   }
  //   const newPassword = changedPassword;
  //   if (!newPassword) {
  //     return res.status(400).json({ error: "New password is required." });
  //   }
  //   const hashedPassword = await bcrypt.hash(newPassword, 10);
  //   const updatedClient = await User.findOneAndUpdate(
  //     { username: clientUserName },
  //     { password: hashedPassword },
  //     { new: true }
  //   );
  //   if (updatedClient) {
  //     return res
  //       .status(200)
  //       .json({ message: "Client password updated successfully." });
  //   } else {
  //     return res.status(404).json({ error: "Client not found." });
  //   }
  // } catch (err) {
  //   console.error(err);
  //   return res.status(500).json({
  //     error:
  //       "Internal server error occurred while updating the client password.",
  //   });
  // }
};

const updateClientStatus = async (req, res) => {
  // try {
  //   const { clientUserName } = req.params;
  //   const { activeStatus } = req.body;
  //   const updatedClient = await User.findOneAndUpdate(
  //     { username: clientUserName },
  //     {
  //       activeStatus: activeStatus,
  //     },
  //     { new: true }
  //   );
  //   if (updatedClient) {
  //     return res
  //       .status(200)
  //       .json({ message: "Client status updated successfully" });
  //   } else {
  //     return res.status(404).json({ error: "Client not found" });
  //   }
  // } catch (err) {
  //   return res
  //     .status(500)
  //     .json({ error: "Internal server error", details: err });
  // }
};

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { creatorRole } = req.body;
    const user = req.body.user;

    if (user.role === "company") {
      validateApiKey(req, res, () => {});
    }

    if (
      !rolesHierarchy[creatorRole] ||
      !rolesHierarchy[creatorRole].includes(user.role)
    ) {
      throw createHttpError(
        403,
        `A ${creatorRole} cannot create a ${user.role}`
      );
    }

    let newUser;
    if (user.role === "player") {
      newUser = new Player(user);
    } else {
      newUser = new BaseUser(user);
    }

    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    next(error);
  }
};

export {
  companyCreation,
  loginUser,
  clientData,
  addClient,
  getClientList,
  deleteClient,
  updateClientPassword,
  updateClientStatus,
};
