import SibApiV3Sdk from 'sib-api-v3-sdk';
import dotenv from 'dotenv';

dotenv.config();

const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

export const sendEmail = async (to, subject, htmlContent) => {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = { name: "Arihant Dream Infra Projects Limited", email: process.env.SENDER_EMAIL }; // Ensure SENDER_EMAIL is in .env or hardcode a verified sender
    sendSmtpEmail.to = [{ email: to }];

    try {
        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('Email sent successfully:', data);
        return data;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

const getEmailTemplate = (title, content, mainColor = "#dc2626") => {
    return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f7f6; padding: 40px 20px; text-align: center;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05); text-align: left;">
            
            <!-- Professional Header -->
            <div style="background-color: #dc2626; padding: 30px 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">
                    Arihant Dream Infra Projects Limited
                </h1>
            </div>
            
            <!-- Main Content Area -->
            <div style="padding: 40px 30px; background-color: #ffffff;">
                <h2 style="color: #111827; font-size: 22px; margin-top: 0; margin-bottom: 24px; font-weight: 600;">
                    ${title}
                </h2>
                
                <div style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                    ${content}
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; border-top: 1px solid #f3f4f6; padding: 25px 30px; text-align: center;">
                <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px 0;">
                    This is an automated communication. Please do not reply directly to this email.
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    &copy; ${new Date().getFullYear()} Arihant Dream Infra Projects Limited.<br/>All rights reserved.
                </p>
            </div>

        </div>
    </div>
    `;
};


export const sendVerificationEmail = async (to, otp) => {
    const subject = "Verify Your Email - Arihant Dream Infra Projects Limited";
    const content = `
        <p>Thank you for registering your account.</p>
        <p>To complete your registration, please verify your email address using the following One-Time Password (OTP):</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0; border: 1px dashed #d1d5db;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #4F46E5;">${otp}</span>
        </div>
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">This OTP will expire in 10 minutes.</p>
        <p style="font-size: 14px; color: #6b7280; margin-top: 5px;">If you did not request this verification, you can safely ignore this email.</p>
    `;
    const htmlContent = getEmailTemplate("Email Verification", content, "#4F46E5");
    return sendEmail(to, subject, htmlContent);
};

export const sendPasswordResetEmail = async (to, otp) => {
    const subject = "Reset Your Password - Arihant Dream Infra Projects Limited";
    const content = `
        <p>We received a request to reset the password associated with this email address.</p>
        <p>Please use the following One-Time Password (OTP) to proceed with your password reset:</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0; border: 1px dashed #d1d5db;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #DC2626;">${otp}</span>
        </div>
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">This OTP will expire in 10 minutes.</p>
        <p style="font-size: 14px; color: #6b7280; margin-top: 5px;">If you did not request a password reset, please secure your account and ignore this email.</p>
    `;
    const htmlContent = getEmailTemplate("Password Reset Request", content, "#DC2626");
    return sendEmail(to, subject, htmlContent);
};

export const sendStatusChangeEmail = async (to, fullName, newStatus) => {
    const subject = "Account Status Update - Arihant Dream Infra Projects Limited";

    // Determine colors and specific messaging based on the new status
    let statusColor = "#4F46E5"; // Default primary
    let statusBadgeColor = "#e0e7ff";
    let statusTextColor = "#4338ca";
    let statusMessage = "Your account status has been updated by an administrator.";
    let actionMessage = "";

    if (newStatus === 'active') {
        statusColor = "#059669"; // Green
        statusBadgeColor = "#d1fae5";
        statusTextColor = "#047857";
        statusMessage = "Good news! Your account has been reviewed and is now <strong>Active</strong>.";
        actionMessage = "<p>You can now log in to the portal and access your dashboard.</p>";
    } else if (newStatus === 'inactive' || newStatus === 'suspended') {
        statusColor = "#DC2626"; // Red
        statusBadgeColor = "#fee2e2";
        statusTextColor = "#b91c1c";
        statusMessage = `Your account has been marked as <strong>${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}</strong>.`;
        actionMessage = "<p>You will no longer be able to access the portal. If you believe this is a mistake, please contact the administration team.</p>";
    } else if (newStatus === 'pending') {
        statusColor = "#D97706"; // Yellow/Orange
        statusBadgeColor = "#fef3c7";
        statusTextColor = "#b45309";
        statusMessage = "Your account has been moved back to <strong>Pending</strong> status.";
        actionMessage = "<p>Your access is temporarily restricted until an administrator reviews your account again.</p>";
    }

    const content = `
        <p>Dear ${fullName},</p>
        <p>${statusMessage}</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <span style="background-color: ${statusBadgeColor}; color: ${statusTextColor}; padding: 8px 16px; border-radius: 9999px; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                Status: ${newStatus.toUpperCase()}
            </span>
        </div>
        
        ${actionMessage}
        <p>Thank you for your cooperation.</p>
    `;

    const htmlContent = getEmailTemplate("Account Status Update", content, statusColor);
    return sendEmail(to, subject, htmlContent);
};
