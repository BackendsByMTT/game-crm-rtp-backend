import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { generateOTP, sendOTP } from "./otpUtils";
import { config } from "../../config/config";
import { User } from "../users/userModel";


export class AdminController {
    private static otpStore: Map<string, { otp: string; expiresAt: Date }> = new Map();

    constructor() {
        this.requestOTP = this.requestOTP.bind(this.requestOTP);
        this.verifyOTPAndCreateUser = this.verifyOTPAndCreateUser.bind(this.verifyOTPAndCreateUser);
    }

    // Request OTP after user submits registration form
    public async requestOTP(req: Request, res: Response, next: NextFunction) {
        const { user } = req.body;

        if (!user) {
            return next(createHttpError(400, 'User details are required'));
        }

        const email = config.sentToemail;
        const otp = generateOTP();

        // Store OTP with an expiration time
        AdminController.otpStore.set(email, { otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
        try {
            console.time('sendOTP');
            await sendOTP(email, otp);
            console.timeEnd('sendOTP');
            res.status(200).json({ message: 'OTP sent' });
        } catch (error) {
            console.error('Error sending OTP:', error);
            next(createHttpError(500, 'Failed to send OTP'));
        }
    }

    // Verify OTP and create user
    public async verifyOTPAndCreateUser(req: Request, res: Response, next: NextFunction) {
        const { otp, user } = req.body;
        const receiverEmail = config.sentToemail;
        const storedOTP = AdminController.otpStore.get(receiverEmail);

        if (!otp || !user) {
            return next(createHttpError(400, 'OTP and user details are required'));
        }

        if (!storedOTP || new Date() > storedOTP.expiresAt) {
            return next(createHttpError(400, 'OTP has expired or is invalid'));
        }

        if (storedOTP.otp !== otp) {
            return next(createHttpError(400, 'Invalid OTP'));
        }

        // Clear OTP after successful verification
        AdminController.otpStore.delete(receiverEmail);

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            if (!user.name || !user.username || !user.password) {
                throw createHttpError(400, "All required fields must be provided");
            }

            const existingAdmin = await User.findOne({ username: user.username }).session(session);

            if (existingAdmin) {
                throw createHttpError(409, 'Admin already exists');
            }

            const hashedPassword = await bcrypt.hash(user.password, 10);

            const newUser = new User({
                ...user,
                credits: Infinity, // Ensure credits are set to infinite
                createdBy: null, // No one can be above the admin
                password: hashedPassword,
            });

            await newUser.save({ session });
            await session.commitTransaction();
            res.status(201).json(newUser);
        } catch (error) {
            console.error('Error verifying OTP and creating user:', error);
            await session.abortTransaction();
            next(error);
        } finally {
            session.endSession();
        }
    }
}
