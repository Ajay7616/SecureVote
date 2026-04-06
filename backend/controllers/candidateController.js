const pool = require('../config/database');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// =========================
// MULTER CONFIG (Symbol Upload)
// =========================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../public/uploads/candidates');

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mime = allowedTypes.test(file.mimetype);

  if (ext && mime) cb(null, true);
  else cb(new Error('Only images are allowed (jpg, png, webp)'));
};

exports.uploadSymbol = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter
}).single('symbol');

exports.createCandidate = async (req, res) => {
  try {
    const {
      name,
      party,
      ward_id,
      election_id
    } = req.body;

    if (!name || !party || !election_id) {
      return res.status(400).json({
        error: 'Name, party and election_id are required'
      });
    }

    const symbolPath = req.file
      ? `/uploads/candidates/${req.file.filename}`
      : null;

    const result = await pool.query(
      `INSERT INTO candidates
       (name, party, symbol, ward_id, election_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        name,
        party,
        symbolPath,
        ward_id || null,
        election_id,
        req.user.id
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Candidate created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to create candidate',
      details: error.message
    });
  }
};

exports.getAllCandidates = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        c.id,
        c.name,
        c.party,
        c.symbol,
        c.votes,
        c.created_at,
        c.updated_at,
        
        e.title as election_title,
        w.ward_number,
        w.ward_name,
        w.constituency,
        
        u.name as created_by_name,
        uu.name as updated_by_name,

        (SELECT COUNT(*) FROM votes v WHERE v.candidate_id = c.id) as total_votes

      FROM candidates c
      LEFT JOIN elections e ON c.election_id = e.id
      LEFT JOIN wards w ON c.ward_id = w.id
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN users uu ON c.updated_by::int = uu.id
      ORDER BY c.created_at DESC`
    );
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch candidates',
      details: error.message
    });
  }
};

exports.getCandidateById = async (req, res) => {
  try {
    const { id } = req.body;

    const result = await pool.query(
      `SELECT
        c.*,
        e.title as election_title,
        w.ward_name,
        u.name as created_by_name,
        u.email as created_by_email
       FROM candidates c
       LEFT JOIN elections e ON c.election_id = e.id
       LEFT JOIN wards w ON c.ward_id = w.id
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch candidate',
      details: error.message
    });
  }
};

exports.updateCandidate = async (req, res) => {
  try {
    const {
      id,
      name,
      party,
      constituency,
      ward_id
    } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Candidate ID is required' });
    }

    const existing = await pool.query(
      'SELECT * FROM candidates WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const current = existing.rows[0];

    const updates = [];
    const values = [];
    let paramCount = 1;

    const addField = (field, value) => {
      updates.push(`${field} = $${paramCount}`);
      values.push(value);
      paramCount++;
    };

    if (name !== undefined) addField('name', name);
    if (party !== undefined) addField('party', party);
    if (constituency !== undefined) addField('constituency', constituency);
    if (ward_id !== undefined) addField('ward_id', ward_id);

    // If new symbol uploaded
    if (req.file) {
      // delete old file
      if (current.symbol) {
        const oldPath = path.join(__dirname, '../public', current.symbol);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      addField('symbol', `/uploads/candidates/${req.file.filename}`);
      addField('updated_by', req.user.id);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = NOW()');

    values.push(id);

    const query = `
      UPDATE candidates
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: 'Candidate updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to update candidate',
      details: error.message
    });
  }
};

exports.deleteCandidate = async (req, res) => {
  try {
    const { id } = req.body;

    const check = await pool.query(
      'SELECT * FROM candidates WHERE id = $1',
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const candidate = check.rows[0];

    // Delete symbol image
    if (candidate.symbol) {
      const filePath = path.join(__dirname, '../public', candidate.symbol);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await pool.query(
      'DELETE FROM candidates WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      message: 'Candidate deleted successfully'
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to delete candidate',
      details: error.message
    });
  }
};

exports.getCandidatesByUser = async (req, res) => {
  try {
    const { role } = req.user;

    let query = 
    `SELECT
        c.*,
        e.title as election_title,
        w.ward_number,
        w.ward_name,
        w.constituency,
        u.name as created_by_name,
        uu.name as updated_by_name,

        (SELECT COUNT(*) FROM votes v WHERE v.candidate_id = c.id) as total_votes

      FROM candidates c
      LEFT JOIN elections e ON c.election_id = e.id
      LEFT JOIN wards w ON c.ward_id = w.id
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN users uu ON c.updated_by::int = uu.id
    `;

    const values = [];

    if (role !== 'admin') {
      // Non-admin users only see their own candidates
      query += ` WHERE c.created_by = $1`;
      values.push(req.user.id);
    }

    query += ` ORDER BY c.created_at DESC`;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch candidates',
      details: error.message
    });
  }
};

exports.getCandidateByElectionAndWard = async (req, res) => {
  try {
    const { election_id, ward_id } = req.body;

    if (!election_id || !ward_id) {
      return res.status(400).json({
        error: 'election_id and ward_id are required'
      });
    }

    const result = await pool.query(
      `SELECT
        c.*,
        e.title as election_title,
        w.ward_number,
        w.ward_name,
        w.constituency,
        u.name as created_by_name,
        (SELECT COUNT(*) FROM votes v WHERE v.candidate_id = c.id) as total_votes
      FROM candidates c
      LEFT JOIN elections e ON c.election_id = e.id
      LEFT JOIN wards w ON c.ward_id = w.id
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.election_id = $1
      AND c.ward_id = $2
      ORDER BY c.created_at DESC`,
      [election_id, ward_id]
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch candidates',
      details: error.message
    });
  }
};

exports.getAllCandidatesForAdmin = async (req, res) => {
  try {
    // const { user_id } = req.body;

    const result = await pool.query(
      `SELECT
        c.*,
        e.title as election_title,
        w.ward_number,
        w.ward_name,
        w.constituency,
        u.name as created_by_name,
        uu.name as updated_by_name,

        (SELECT COUNT(*) FROM votes v WHERE v.candidate_id = c.id) as total_votes

       FROM candidates c
       LEFT JOIN elections e ON c.election_id = e.id
       LEFT JOIN wards w ON c.ward_id = w.id
       LEFT JOIN users u ON c.created_by = u.id
       LEFT JOIN users uu ON c.updated_by::int = uu.id
       LEFT JOIN election_admins ea ON ea.election_id = e.id
       WHERE e.created_by = $1 OR ea.admin_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch candidates',
      details: error.message
    });
  }
};

exports.getCandidateByElectionAndWardForAdmin = async (req, res) => {
  try {
    // const { election_id, ward_id, user_id } = req.body;
    const { election_id, ward_id } = req.body;


    if (!election_id || !ward_id ) {
      return res.status(400).json({
        error: 'election_id and ward_id are required'
      });
    }

    const result = await pool.query(
      `SELECT
        c.*,
        e.title as election_title,
        w.ward_number,
        w.ward_name,
        w.constituency,
        u.name as created_by_name,
        (SELECT COUNT(*) FROM votes v WHERE v.candidate_id = c.id) as total_votes
      FROM candidates c
      LEFT JOIN elections e ON c.election_id = e.id
      LEFT JOIN wards w ON c.ward_id = w.id
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN election_admins ea ON ea.election_id = e.id
      WHERE c.election_id = $1
        AND c.ward_id = $2
        AND (e.created_by = $3 OR ea.admin_id = $3)
      ORDER BY c.created_at DESC`,
      [election_id, ward_id, req.user.id]
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch candidates',
      details: error.message
    });
  }
};