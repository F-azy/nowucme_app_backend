// backend/routes/survey.js
import express from 'express';
import axios from 'axios';

const router = express.Router();

// Store Google Script URL in backend .env
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

router.post('/submit-survey', async (req, res) => {
  try {
    const { name, email, gender, timestamp } = req.body;

    // Validate input
    if (!name || !email || !gender) {
      return res.status(400).json({
        status: 'error',
        message: 'All fields are required'
      });
    }

    // Forward to Google Sheets
    await axios.post(
      GOOGLE_SCRIPT_URL,
      { name, email, gender, timestamp },
      { headers: { 'Content-Type': 'application/json' } }
    );

    res.json({
      status: 'success',
      message: 'Survey submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting survey:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit survey'
    });
  }
});

export default router;
