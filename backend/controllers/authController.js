const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { sendOTPEmail, sendOTPForPasswordReset } = require('../utils/emailService');
const { encrypt, decrypt } = require('../utils/tokenEncryption');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.role === 'admin' || user.role === 'super_admin') {
      const maskedEmail = await sendEmployeeOtp(user.id);
      return res.json({
        message: 'OTP sent',
        otpSentTo: maskedEmail
      });
    }

    // const token = jwt.sign(
    //   { id: user.id, email: user.email, role: user.role },
    //   process.env.JWT_SECRET,
    //   { expiresIn: process.env.JWT_EXPIRE }
    // );
    const token = encrypt({ 
      id: user.id, 
      email: user.email, 
      role: user.role,
      expiresIn: Date.now() + (60 * 60 * 1000)
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};


const sendEmployeeOtp = async (userId) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  const user = result.rows[0];

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const encryptedOTP = encrypt(otp);

  await pool.query(
    'INSERT INTO otp_verifications (email, otp, expires_at) VALUES ($1, $2, $3)',
    [user.email, encryptedOTP, expiresAt]
  );

  await sendOTPEmail(user.email, otp);

  return user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
};

exports.employeeLoginVerifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const otpResult = await pool.query(
      `SELECT *
       FROM otp_verifications
       WHERE email = $1
         AND verified = false
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [email]
    );

    if (otpResult.rows.length === 0) {
      return res.status(401).json({ error: 'OTP expired or not found' });
    }

    const decryptedData = decrypt(otpResult.rows[0].otp);

    if (decryptedData !== otp) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    await pool.query(
      'UPDATE otp_verifications SET verified = true WHERE id = $1',
      [otpResult.rows[0].id]
    );

    const user = userResult.rows[0];

    // const token = jwt.sign(
    //   { id: user.id, email: user.email, role: user.role },
    //   process.env.JWT_SECRET,
    //   { expiresIn: process.env.JWT_EXPIRE }
    // );
    const token = encrypt({ 
      id: user.id, 
      email: user.email, 
      role: user.role,
      expiresIn: Date.now() + (60 * 60 * 1000)
    });

    res.json({
      message: 'OTP verified successfully',
      token,
      user: {
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, created_at`,
      [email, hashedPassword, name, role]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
};

exports.createAdmin = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password, name, role)
       VALUES ($1, $2, $3, 'admin')
       RETURNING id, email, name, role, created_at`,
      [email, hashedPassword, name]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to create admin' });
  }
};

exports.updateAdmin = async (req, res) => {
  try {
    const { id, name, email } = req.body;

    const result = await pool.query(
      `UPDATE users
       SET name = $1,
           email = $2,
           updated_at = CURRENT_TIMESTAMP,
           updated_by = $3
       WHERE id = $4 AND role = 'admin'
       RETURNING id, email, name, role, updated_at, updated_by`,
      [name, email, req.user.id, id]
    );


    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to update admin' });
  }
};

exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.body;

    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Admin not found" });
    }

    res.json({ message: "Admin deleted successfully", deletedAdmin: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete admin" });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'New password are required' });
    }

    const result = await pool.query(
      'SELECT id, email FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const encryptedOTP = encrypt(otp)

    await pool.query(
      `INSERT INTO password_otp_verifications (email, otp, expires_at)
       VALUES ($1, $2, $3)`,
      [user.email, encryptedOTP, expiresAt]
    );

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE users
       SET temp_password = $1,
           updated_at = CURRENT_TIMESTAMP,
           updated_by = $2
       WHERE id = $3`,
      [hashedPassword, req.user.id, user.id]
    );

    await sendOTPForPasswordReset(user.email, otp);

    res.json({
      message: 'OTP sent to your email for password change verification'
    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to initiate password change' });
  }
};

exports.verifyChangePasswordOTP = async (req, res) => {
  try {
    const { otp } = req.body;

    const userResult = await pool.query(
      'SELECT id, email, temp_password FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    const otpResult = await pool.query(
      `SELECT *
       FROM password_otp_verifications
       WHERE email = $1
         AND verified = false
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.email]
    );

    if (otpResult.rows.length === 0) {
      return res.status(401).json({ error: 'OTP expired or not found' });
    }

    const decryptedData = decrypt(otpResult.rows[0].otp);

    
    if (decryptedData !== otp) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    await pool.query(
      `UPDATE users
       SET password = temp_password,
           temp_password = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [user.id]
    );

    res.json({ message: 'Password changed successfully' });

  } catch (err) {
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

exports.getAllAdmins = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
          u.id, 
          u.name, 
          u.email, 
          u.role, 
          u.created_at,
          u.updated_at,
          ub.name AS updated_by
       FROM users u
       LEFT JOIN users ub ON u.updated_by = ub.id
       WHERE u.role = 'admin'
       ORDER BY u.created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
};