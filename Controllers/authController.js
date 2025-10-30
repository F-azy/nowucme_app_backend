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
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1 OR username = $2",
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "Email or Username already exists" });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create unverified user
    const result = await pool.query(
      `INSERT INTO users (email, username, password_hash, display_name, is_verified, verification_otp, otp_expires_at)
       VALUES ($1, $2, $3, $4, false, $5, $6) RETURNING id, email, username`,
      [email, username, passwordHash, username, otp, otpExpires]
    );

    // Send verification email
    const emailSent = await sendVerificationEmail(email, otp, username);
    
    if (!emailSent) {
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