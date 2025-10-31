import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../conn.js";
import { findUserByEmail } from "../Models/userModel.js";
import { sendVerificationEmail } from "../services/emailService.js";

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Signup (Step 1: Send OTP)
export const signup = async (req, res) => {
  const { email, username, password, confirmPassword } = req.body;

  if (!email || !username || !password || !confirmPassword) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: "Passwords don't match" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    // Check if user exists
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1 OR username = $2",
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      
      // If user exists but is NOT verified, allow re-registration
      if (!user.is_verified) {
        // Delete the old unverified account
        await pool.query("DELETE FROM users WHERE id = $1", [user.id]);
        console.log(`🗑️ Deleted unverified account for ${email}`);
      } else {
        // If user is verified, don't allow re-registration
        if (user.email === email) {
          return res.status(400).json({ error: "Email already exists" });
        }
        if (user.username === username) {
          return res.status(400).json({ error: "Username already exists" });
        }
      }
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create new unverified user
    const result = await pool.query(
      `INSERT INTO users (email, username, password_hash, display_name, is_verified, verification_otp, otp_expires_at)
       VALUES ($1, $2, $3, $4, false, $5, $6) RETURNING id, email, username`,
      [email, username, passwordHash, username, otp, otpExpires]
    );

    // Send verification email
    const emailSent = await sendVerificationEmail(email, otp, username);
    
    if (!emailSent) {
      // If email fails, delete the user
      await pool.query("DELETE FROM users WHERE id = $1", [result.rows[0].id]);
      return res.status(500).json({ error: "Failed to send verification email" });
    }

    res.status(201).json({ 
      message: "OTP sent to your email",
      userId: result.rows[0].id,
      email: result.rows[0].email
    });
  } catch (err) {
    console.error("❌ Signup error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};
// Verify OTP (Step 2: Verify and complete signup)
export const verifyOTP = async (req, res) => {
  const { userId, otp } = req.body;

  if (!userId || !otp) {
    return res.status(400).json({ error: "User ID and OTP are required" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];

    if (user.is_verified) {
      return res.status(400).json({ error: "Email already verified" });
    }

    if (new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({ error: "OTP expired" });
    }

    if (user.verification_otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // Mark as verified
    await pool.query(
      `UPDATE users SET is_verified = true, verification_otp = NULL, otp_expires_at = NULL WHERE id = $1`,
      [userId]
    );

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      message: "Email verified successfully",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
      },
    });
  } catch (err) {
    console.error("❌ Verify OTP error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// Resend OTP
export const resendOTP = async (req, res) => {
  const { userId } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];

    if (user.is_verified) {
      return res.status(400).json({ error: "Email already verified" });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      "UPDATE users SET verification_otp = $1, otp_expires_at = $2 WHERE id = $3",
      [otp, otpExpires, userId]
    );

    await sendVerificationEmail(user.email, otp, user.username);

    res.json({ message: "OTP resent successfully" });
  } catch (err) {
    console.error("❌ Resend OTP error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// Login (only allow verified users)
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    if (!user.is_verified) {
      return res.status(403).json({ error: "Please verify your email first" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
      },
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
// controllers/authController.js
//-------

// Change Password
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "All fields required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Get user's current password
    const userQuery = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, userQuery.rows[0].password_hash);
    if (!isValid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, userId]
    );

    console.log(`✅ Password changed for user ${userId}`);
    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Change Email
export const changeEmail = async (req, res) => {
  try {
    const userId = req.user.id;
    const { newEmail } = req.body;

    if (!newEmail) {
      return res.status(400).json({ error: "New email required" });
    }

    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [newEmail, userId]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "Email already in use" });
    }

    // Update email
    await pool.query(
      'UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2',
      [newEmail, userId]
    );

    console.log(`✅ Email changed for user ${userId}`);
    res.json({ success: true, message: "Email changed successfully" });
  } catch (error) {
    console.error("Change email error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete Account
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    // Delete user (cascade will handle related data)
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    console.log(`✅ Account deleted for user ${userId}`);
    res.json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete account error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
// Change Username
export const changeUsername = async (req, res) => {
  try {
    const userId = req.user.id;
    const { newUsername } = req.body;

    if (!newUsername) {
      return res.status(400).json({ error: "New username required" });
    }

    // Validate username format (alphanumeric, underscore, 3-20 chars)
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(newUsername)) {
      return res.status(400).json({ 
        error: "Username must be 3-20 characters (letters, numbers, underscore only)" 
      });
    }

    // Check if username already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 AND id != $2',
      [newUsername, userId]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "Username already taken" });
    }

    // Update username
    await pool.query(
      'UPDATE users SET username = $1, updated_at = NOW() WHERE id = $2',
      [newUsername, userId]
    );

    console.log(`✅ Username changed for user ${userId} to ${newUsername}`);
    res.json({ success: true, message: "Username changed successfully", username: newUsername });
  } catch (error) {
    console.error("Change username error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// controllers/authController.js

// Clean up expired unverified accounts
export const cleanupUnverifiedUsers = async () => {
  try {
    const result = await pool.query(
      `DELETE FROM users 
       WHERE is_verified = false 
       AND created_at < NOW() - INTERVAL '24 hours'
       RETURNING email`
    );
    
    if (result.rows.length > 0) {
      console.log(`🧹 Cleaned up ${result.rows.length} unverified accounts`);
    }
  } catch (error) {
    console.error("Cleanup error:", error);
  }
};
//-------------------
// controllers/authController.js
// controllers/authController.js

// Make sure this function exists and is exported
export const requestEmailChangeOTP = async (req, res) => {
  try {
    const userId = req.user.id;
    const { newEmail } = req.body;

    console.log(`📧 Email change OTP request from user ${userId} to ${newEmail}`);

    if (!newEmail) {
      return res.status(400).json({ error: "New email required" });
    }

    if (!/\S+@\S+\.\S+/.test(newEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [newEmail, userId]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "Email already in use" });
    }

    // Get current user
    const userQuery = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const username = userQuery.rows[0].username;

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Store OTP temporarily
    await pool.query(
      'UPDATE users SET verification_otp = $1, otp_expires_at = $2 WHERE id = $3',
      [otp, otpExpires, userId]
    );

    // Import your email-service
    const { sendVerificationEmail } = await import('../services/emailService.js');
    
    // Send OTP to NEW email
    const emailSent = await sendVerificationEmail(newEmail, otp, username);
    
    if (!emailSent) {
      return res.status(500).json({ error: "Failed to send verification email" });
    }

    console.log(`✅ OTP sent to ${newEmail} for user ${userId}`);
    res.json({ 
      success: true, 
      message: "OTP sent to new email address" 
    });
  } catch (error) {
    console.error("❌ Request email change OTP error:", error.message);
    console.error("Stack:", error.stack);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

// Verify OTP and change email
export const verifyEmailChangeOTP = async (req, res) => {
  try {
    const userId = req.user.id;
    const { newEmail, otp } = req.body;

    if (!newEmail || !otp) {
      return res.status(400).json({ error: "Email and OTP required" });
    }

    const userQuery = await pool.query(
      'SELECT verification_otp, otp_expires_at FROM users WHERE id = $1',
      [userId]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userQuery.rows[0];

    if (new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({ error: "OTP expired" });
    }

    if (user.verification_otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // Update email and clear OTP
    await pool.query(
      'UPDATE users SET email = $1, verification_otp = NULL, otp_expires_at = NULL, updated_at = NOW() WHERE id = $2',
      [newEmail, userId]
    );

    console.log(`✅ Email changed for user ${userId}`);
    res.json({ success: true, message: "Email changed successfully" });
  } catch (error) {
    console.error("Verify email change OTP error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Request OTP for forgot password
export const requestForgotPasswordOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }

    const userQuery = await pool.query('SELECT id, username FROM users WHERE email = $1', [email]);

    if (userQuery.rows.length === 0) {
      // Don't reveal if email exists or not (security)
      return res.json({ success: true, message: "If email exists, OTP has been sent" });
    }

    const user = userQuery.rows[0];

    // Generate OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Store OTP
    await pool.query(
      'UPDATE users SET verification_otp = $1, otp_expires_at = $2 WHERE id = $3',
      [otp, otpExpires, user.id]
    );

    // Send OTP email
    await sendVerificationEmail(email, otp, user.username);

    res.json({ 
      success: true, 
      message: "If email exists, OTP has been sent",
      userId: user.id // Send this to frontend (but don't expose in message)
    });
  } catch (error) {
    console.error("Request forgot password OTP error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Verify OTP and reset password
export const resetPasswordWithOTP = async (req, res) => {
  try {
    const { userId, otp, newPassword } = req.body;

    if (!userId || !otp || !newPassword) {
      return res.status(400).json({ error: "All fields required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const userQuery = await pool.query(
      'SELECT verification_otp, otp_expires_at FROM users WHERE id = $1',
      [userId]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userQuery.rows[0];

    if (new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({ error: "OTP expired" });
    }

    if (user.verification_otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password and clear OTP
    await pool.query(
      'UPDATE users SET password_hash = $1, verification_otp = NULL, otp_expires_at = NULL, updated_at = NOW() WHERE id = $2',
      [passwordHash, userId]
    );

    console.log(`✅ Password reset for user ${userId}`);
    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password OTP error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

