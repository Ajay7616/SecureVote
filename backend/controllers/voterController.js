const pool = require('../config/database');
const jwt = require('jsonwebtoken');
const { voterSendOTPEmail } = require('../utils/voterEmailService');
const { encrypt, decrypt } = require('../utils/tokenEncryption');

exports.getAllVoters = async (req, res) => {
  try {
    const { ward_id, election_id } = req.body;

    // Validate required fields
    if (!ward_id || !election_id) {
      return res.status(400).json({
        success: false,
        error: "ward_id and election_id are required"
      });
    }

    const result = await pool.query(
      `SELECT 
        v.*,
        w.ward_name AS ward_name,
        e.title AS election_title,
        u.name AS created_by_name
       FROM voters v
       LEFT JOIN wards w ON v.ward_id = w.id
       LEFT JOIN elections e ON v.election_id = e.id
       LEFT JOIN users u ON v.created_by = u.id
       WHERE v.ward_id = $1 AND v.election_id = $2
       ORDER BY v.created_at DESC`,
      [ward_id, election_id]
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch voters",
      details: error.message
    });
  }
};

// Get Voter By ID
exports.getVoterById = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Voter ID is required' });
    }

    const result = await pool.query(
      `SELECT 
        v.*,
        w.name AS ward_name,
        e.title AS election_title,
        u.name AS created_by_name
       FROM voters v
       LEFT JOIN wards w ON v.ward_id = w.id
       LEFT JOIN elections e ON v.election_id = e.id
       LEFT JOIN users u ON v.created_by = u.id
       WHERE v.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Voter not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch voter',
      details: error.message
    });
  }
};

// Delete Voter
exports.deleteVoter = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Voter ID is required' });
    }

    // Check if voter exists
    const voterCheck = await pool.query(
      'SELECT * FROM voters WHERE id = $1',
      [id]
    );

    if (voterCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Voter not found' });
    }

    const voter = voterCheck.rows[0];

    // Prevent delete if already voted
    if (voter.has_voted) {
      return res.status(400).json({
        error: 'Cannot delete voter who has already voted'
      });
    }

    // Delete voter
    const result = await pool.query(
      'DELETE FROM voters WHERE id = $1 RETURNING *',
      [id]
    );

    res.json({
      success: true,
      message: 'Voter deleted successfully',
      data: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to delete voter',
      details: error.message
    });
  }
};

exports.voterLogin = async (req, res) => {
  try {
    const { login_id } = req.body;

    if (!login_id) {
      return res.status(400).json({
        success: false,
        error: "Login ID is required"
      });
    }

    // Get voter with election info
    const result = await pool.query(
      `SELECT v.*, e.election_date, e.start_time, e.end_time
      FROM voters v
      JOIN elections e ON v.election_id = e.id
      WHERE v.login_id = $1
      AND v.has_voted = false`,
      [login_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Voter not found"
      });
    }

    const voter = result.rows[0];

    // Check if already voted
    if (voter.has_voted) {
      return res.status(400).json({
        success: false,
        message: "You have already voted"
      });
    }

    const now = new Date();

    const electionDate = new Date(voter.election_date);
    const startTime = new Date(voter.start_time);
    const endTime = new Date(voter.end_time);

    // Check election date
    // if (now.toDateString() !== electionDate.toDateString()) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Voting is not scheduled for today"
    //   });
    // }
    // console.log("NOW:", now);
    // console.log("START:", startTime);
    // console.log("END:", endTime);

    // Check voting time window
    if (now < startTime || now > endTime) {
      return res.status(403).json({
        success: false,
        message: "Voting is allowed only during election time"
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const encryptedOTP = encrypt(otp)

    await pool.query(
      `INSERT INTO voter_login_otps (login_id, otp, expires_at)
       VALUES ($1, $2, $3)`,
      [login_id, encryptedOTP, expiresAt]
    );

    await voterSendOTPEmail(voter.email, otp);

    res.json({
      success: true,
      message: "OTP sent to registered email"
    });

  } catch (error) {
    console.error("OTP ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP"
    });
  }
};

exports.verifyVoterOTP = async (req, res) => {
  try {
    const { login_id, otp } = req.body;

    if (!login_id || !otp) {
      return res.status(400).json({
        success: false,
        message: "Login ID and OTP are required"
      });
    }

    const voterResult = await pool.query(
      `SELECT * FROM voters WHERE login_id = $1`,
      [login_id]
    );

    if (voterResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Voter not found"
      });
    }

    const voter = voterResult.rows[0];

    if (voter.has_voted) {
      return res.status(400).json({
        success: false,
        message: "You have already voted"
      });
    }

    const otpResult = await pool.query(
      `SELECT *
       FROM voter_login_otps
       WHERE login_id = $1
         AND verified = false
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [login_id]
    );

    if (otpResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "OTP expired or not found"
      });
    }
    const decryptedData = decrypt(otpResult.rows[0].otp);

    
    if (decryptedData !== otp) {

      await pool.query(
        `UPDATE voter_login_otps
         SET attempts = attempts + 1
         WHERE id = $1`,
        [otpResult.rows[0].id]
      );

      return res.status(401).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    // Mark OTP verified
    await pool.query(
      `UPDATE voter_login_otps
       SET verified = true
       WHERE id = $1`,
      [otpResult.rows[0].id]
    );

    // Generate JWT
    // const token = jwt.sign(
    //   {
    //     id: voter.id,
    //     login_id: voter.login_id,
    //     role: "voter"
    //   },
    //   process.env.JWT_SECRET,
    //   { expiresIn: process.env.JWT_EXPIRE }
    // );

    const token = encrypt({ 
      id: voter.id, 
      login_id: voter.login_id,
      role: "voter",
      election_id: voter.election_id,
      ward_id: voter.ward_id,
      expiresIn: Date.now() + (60 * 60 * 1000)
    });

    res.json({
      success: true,
      message: "OTP verified successfully",
      token,
      voter: {
        name: voter.name,
        role: "voter",
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.getAllVotersForAdmin = async (req, res) => {
  try {
    const { ward_id, election_id } = req.body;

    if (!ward_id || !election_id ) {
      return res.status(400).json({
        success: false,
        error: "ward_id and election_id are required"
      });
    }

    const result = await pool.query(
      `SELECT 
        v.*,
        w.ward_name AS ward_name,
        e.title AS election_title,
        u.name AS created_by_name
       FROM voters v
       LEFT JOIN wards w ON v.ward_id = w.id
       LEFT JOIN elections e ON v.election_id = e.id
       LEFT JOIN users u ON v.created_by = u.id
       LEFT JOIN election_admins ea ON ea.election_id = e.id
       WHERE v.ward_id = $1 
         AND v.election_id = $2
         AND (e.created_by = $3 OR ea.admin_id = $3)
       ORDER BY v.created_at DESC`,
      [ward_id, election_id, req.user.id]
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch voters",
      details: error.message
    });
  }
};