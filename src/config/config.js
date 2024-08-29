"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const _config = {
    port: process.env.PORT || 5000,
    databaseUrl: process.env.MONGOURL,
    env: process.env.NODE_ENV,
    jwtSecret: process.env.JWT_SECRET,
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_NAME_API_KEY,
    api_secret: process.env.CLOUDINARY_NAME_API_SECRET,
    companyApiKey: process.env.COMPANY_API_KEY,
    phonenumber: process.env.PHONENUMBER,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || '',
    emailSource: process.env.EMAILSOURCE,
    platformName: process.env.PLATFORM_NAME,
    sentToemail: process.env.SENT_TO_EMAIL
};
exports.config = Object.freeze(_config);
