import AWS from 'aws-sdk';
import { config } from '../../config/config';

// Configure AWS SDK
AWS.config.update({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    region: config.region
});

const ses = new AWS.SES();

export const generateOTP = (): string => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    return otp;
};


export const sendOTP = async (to: string, otp: string): Promise<void> => {
    const params = {
        Source: config.emailSource,
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
        const result = await ses.sendEmail(params).promise();
        console.log('OTP sent successfully:', result);
    } catch (error) {
        console.error('Error sending OTP:', error);
        throw new Error('Failed to send OTP');
    }
};
