"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOTP = exports.generateOTP = void 0;
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const config_1 = require("../../config/config");
// Configure AWS SDK
aws_sdk_1.default.config.update({
    accessKeyId: config_1.config.accessKeyId,
    secretAccessKey: config_1.config.secretAccessKey,
    region: config_1.config.region
});
const ses = new aws_sdk_1.default.SES();
const generateOTP = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    return otp;
};
exports.generateOTP = generateOTP;
const sendOTP = (to, otp) => __awaiter(void 0, void 0, void 0, function* () {
    const params = {
        Source: config_1.config.emailSource,
        Destination: {
            ToAddresses: [to]
        },
        Message: {
            Subject: {
                Data: 'Your OTP is'
            },
            Body: {
                Text: {
                    Data: `Your OTP code is ${otp} and valid for next 10 minutes `
                }
            }
        }
    };
    try {
        const result = yield ses.sendEmail(params).promise();
        console.log('OTP sent successfully:', result);
    }
    catch (error) {
        console.error('Error sending OTP:', error);
        throw new Error('Failed to send OTP');
    }
});
exports.sendOTP = sendOTP;
