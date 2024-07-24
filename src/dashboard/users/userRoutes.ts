import express from "express";
import { extractRoleFromCookie } from "../middleware/middlware";
import { UserController } from "./userController";
import { checkUser } from "../middleware/checkUser";

const userController = new UserController();
const userRoutes = express.Router();

// LOGIN
userRoutes.post("/login", userController.loginUser);

// ADD User
userRoutes.post("/", checkUser, userController.createUser);

userRoutes.get("/generatePassword", checkUser, userController.generatePassword);

// // GET all details about the current user
userRoutes.get("/", checkUser, userController.getCurrentUser);

// // GET all subordinates
userRoutes.get("/all", checkUser, userController.getAllSubordinates);

// GET Current User subordinate
userRoutes.get(
  "/subordinates",
  checkUser,
  userController.getCurrentUserSubordinates
);

// GET Report
userRoutes.get("/report", checkUser, userController.getReport);

// GET a client Report
userRoutes.get(
  "/report/:subordinateId",
  checkUser,
  userController.getASubordinateReport
);

// GET a client
userRoutes.get("/:subordinateId", checkUser, userController.getSubordinateById);

// // DELETE A Client
userRoutes.delete("/:clientId", checkUser, userController.deleteUser);

// // UPDATE a client
userRoutes.put("/:clientId", checkUser, userController.updateClient);

export default userRoutes;
