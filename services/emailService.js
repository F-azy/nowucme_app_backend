// services/emailService.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Existing verification email
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

// ✅ NEW: Send password change notification
export const sendPasswordChangeNotification = async (email, username) => {
  try {
    const timestamp = new Date().toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    await transporter.sendMail({
      from: `"nowUCme Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔒 Your nowUCme password was changed',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; background-color: #f0fdf4; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; border: 2px solid #000; }
              .logo { font-size: 32px; font-weight: bold; color: #000; margin-bottom: 20px; }
              .alert-box { background: #fef2f2; border: 2px solid #ef4444; border-radius: 10px; padding: 20px; margin: 20px 0; }
              .alert-title { color: #dc2626; font-weight: bold; font-size: 18px; margin-bottom: 10px; }
              .info-box { background: #f0fdf4; border: 2px solid #84fe71; border-radius: 10px; padding: 15px; margin: 20px 0; }
              .button { display: inline-block; background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 10px; font-weight: bold; margin-top: 15px; }
              .footer { margin-top: 30px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">nowUCme</div>
              
              <div class="alert-box">
                <div class="alert-title">🔒 Security Alert</div>
                <p style="margin: 0; color: #dc2626;">Your password was recently changed</p>
              </div>

              <h2>Hi ${username},</h2>
              <p>This is a security notification to let you know that your nowUCme account password was successfully changed.</p>
              
              <div class="info-box">
                <p style="margin: 0;"><strong>When:</strong> ${timestamp}</p>
                <p style="margin: 5px 0 0 0;"><strong>Account:</strong> ${email}</p>
              </div>

              <p><strong>Did you make this change?</strong></p>
              <p>If you changed your password, you can ignore this email. Your account is secure.</p>

              <p><strong>Didn't change your password?</strong></p>
              <p>If you did not make this change, your account may be compromised. Please reset your password immediately and contact our support team.</p>

              <a href="${process.env.APP_URL || 'https://nowucme.in'}/forgot-password" class="button">Reset Password Now</a>

              <div class="footer">
                <p>This is an automated security notification. Please do not reply to this email.</p>
                <p>© 2025 nowUCme - Find people nearby</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
    console.log(`✅ Password change notification sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Password change notification error:', error);
    return false;
  }
};

// ✅ NEW: Send email change notification to OLD email
export const sendEmailChangeNotification = async (oldEmail, newEmail, username) => {
  try {
    const timestamp = new Date().toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    await transporter.sendMail({
      from: `"nowUCme Security" <${process.env.EMAIL_USER}>`,
      to: oldEmail,
      subject: '🔒 Your nowUCme email address was changed',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; background-color: #f0fdf4; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; border: 2px solid #000; }
              .logo { font-size: 32px; font-weight: bold; color: #000; margin-bottom: 20px; }
              .alert-box { background: #fef2f2; border: 2px solid #ef4444; border-radius: 10px; padding: 20px; margin: 20px 0; }
              .alert-title { color: #dc2626; font-weight: bold; font-size: 18px; margin-bottom: 10px; }
              .info-box { background: #f0fdf4; border: 2px solid #84fe71; border-radius: 10px; padding: 15px; margin: 20px 0; }
              .email-highlight { background: #fef3c7; padding: 2px 8px; border-radius: 5px; font-weight: bold; }
              .button { display: inline-block; background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 10px; font-weight: bold; margin-top: 15px; }
              .footer { margin-top: 30px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">nowUCme</div>
              
              <div class="alert-box">
                <div class="alert-title">🔒 Security Alert</div>
                <p style="margin: 0; color: #dc2626;">Your email address was recently changed</p>
              </div>

              <h2>Hi ${username},</h2>
              <p>This is a security notification to let you know that the email address for your nowUCme account was changed.</p>
              
              <div class="info-box">
                <p style="margin: 0;"><strong>When:</strong> ${timestamp}</p>
                <p style="margin: 5px 0;"><strong>Old email:</strong> <span class="email-highlight">${oldEmail}</span></p>
                <p style="margin: 5px 0 0 0;"><strong>New email:</strong> <span class="email-highlight">${newEmail}</span></p>
              </div>

              <p><strong>Did you make this change?</strong></p>
              <p>If you changed your email, you can ignore this message. Your account is secure and you should use <strong>${newEmail}</strong> to log in from now on.</p>

              <p><strong>Didn't change your email?</strong></p>
              <p>If you did not make this change, your account may be compromised. Please take action immediately:</p>
              <ul>
                <li>Try to log in and change your password</li>
                <li>Contact our support team if you can't access your account</li>
                <li>Enable two-factor authentication for extra security</li>
              </ul>

              <a href="${process.env.APP_URL || 'https://nowucme.com'}/support" class="button">Contact Support</a>

              <div class="footer">
                <p>This email was sent to your old address as a security measure.</p>
                <p>This is an automated notification. Please do not reply to this email.</p>
                <p>© 2025 nowUCme - Find people nearby</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
    console.log(`✅ Email change notification sent to ${oldEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Email change notification error:', error);
    return false;
  }
};

// ✅ NEW: Send welcome email to NEW email after change
export const sendEmailChangeConfirmation = async (newEmail, username) => {
  try {
    await transporter.sendMail({
      from: `"nowUCme" <${process.env.EMAIL_USER}>`,
      to: newEmail,
      subject: '✅ Your nowUCme email was updated successfully',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; background-color: #f0fdf4; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; border: 2px solid #000; }
              .logo { font-size: 32px; font-weight: bold; color: #000; margin-bottom: 20px; }
              .success-box { background: #f0fdf4; border: 2px solid #84fe71; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
              .checkmark { font-size: 48px; margin-bottom: 10px; }
              .footer { margin-top: 30px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">nowUCme</div>
              
              <div class="success-box">
                <div class="checkmark">✅</div>
                <h2 style="color: #16a34a; margin: 0;">Email Updated Successfully!</h2>
              </div>

              <h2>Hi ${username},</h2>
              <p>Your nowUCme account email has been successfully updated to <strong>${newEmail}</strong>.</p>
              
              <p>From now on, use this email address to:</p>
              <ul>
                <li>Log in to your account</li>
                <li>Receive notifications and updates</li>
                <li>Reset your password if needed</li>
              </ul>

              <p>If you have any questions, feel free to contact our support team.</p>

              <div class="footer">
                <p>© 2025 nowUCme - Find people nearby</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
    console.log(`✅ Email change confirmation sent to ${newEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Email change confirmation error:', error);
    return false;
  }
};
