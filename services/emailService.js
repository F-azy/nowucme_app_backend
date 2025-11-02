// services/emailService.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // your Gmail
    pass: process.env.EMAIL_PASSWORD, // App Password 
  },
});

export const sendVerificationEmail = async (email, otp, username) => {
  try {
    await transporter.sendMail({
      from: `"nowUCme" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify your nowUCme account',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; background-color: #f0fdf4; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; border: 2px solid #000; }
              .logo { font-size: 32px; font-weight: bold; color: #000; margin-bottom: 20px; }
              .otp { font-size: 36px; font-weight: bold; color: #000; background: #84fe71; padding: 15px 30px; border-radius: 10px; display: inline-block; letter-spacing: 8px; border: 2px solid #000; }
              .footer { margin-top: 30px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">nowUCme</div>
              <h2>Welcome, ${username}! 👋</h2>
              <p>Thanks for signing up! Please verify your email address to get started.</p>
              <p>Your verification code is:</p>
              <div style="text-align: center; margin: 30px 0;">
                <div class="otp">${otp}</div>
              </div>
              <p>This code will expire in 10 minutes.</p>
              <div class="footer">
                <p>If you didn't create this account, please ignore this email.</p>
                <p>© 2025 nowUCme - Find people nearby</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
    console.log(`✅ Verification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Email send error:', error);
    return false;
  }
};