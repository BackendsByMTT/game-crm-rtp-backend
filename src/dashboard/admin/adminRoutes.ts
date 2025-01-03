import express from "express";
import { AdminController } from '../admin/adminController'
const adminRoutes = express.Router();
const company = new AdminController();

adminRoutes.post('/request-otp', company.requestOTP)
adminRoutes.post('/verify-otp', company.verifyOTPAndCreateUser)
export default adminRoutes;
