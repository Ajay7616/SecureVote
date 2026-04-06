const pool = require('../config/database');

// Create Election
exports.createElection = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      election_date, 
      start_time, 
      end_time, 
      total_wards,
      admin_ids,
    } = req.body;

    if (!title || !election_date) {
      return res.status(400).json({ error: 'Title and election date are required' });
    }

    const startDateTime = start_time 
      ? `${election_date} ${start_time}:00`
      : null;

    const endDateTime = end_time 
      ? `${election_date} ${end_time}:00`
      : null;

    const electionResult = await pool.query(
      `INSERT INTO elections 
      (title, description, election_date, start_time, end_time, total_wards, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        title,
        description,
        election_date,
        startDateTime,
        endDateTime,
        total_wards || 0,
        req.user.id,
      ]
    );

    const election = electionResult.rows[0];

    if (admin_ids && admin_ids.length > 0) {

      const values = admin_ids.map((adminId, index) => 
        `($1, $${index + 2})`
      ).join(',');

      await pool.query(
        `INSERT INTO election_admins (election_id, admin_id)
         VALUES ${values}`,
        [election.id, ...admin_ids]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Election created successfully',
      data: election
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to create election', 
      details: error.message 
    });
  }
};

// Get All Elections
exports.getAllElections = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        e.*,
        u.name as created_by_name,
        uu.name as updated_by_name,

        (SELECT COUNT(*) FROM candidates WHERE election_id = e.id) as candidate_count,
        (SELECT COUNT(*) FROM voters WHERE election_id = e.id) as voter_count,
        (SELECT COUNT(*) FROM wards WHERE election_id = e.id) as ward_count,
        (SELECT COUNT(*) FROM votes WHERE election_id = e.id) as vote_count,

        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', us.id,
                'name', us.name,
                'email', us.email
              )
            )
            FROM election_admins ea
            JOIN users us ON ea.admin_id = us.id
            WHERE ea.election_id = e.id
          ),
          '[]'
        ) as assigned_admins

       FROM elections e
       LEFT JOIN users u ON e.created_by = u.id
       LEFT JOIN users uu ON e.updated_by::int = uu.id  
       ORDER BY e.created_at DESC`
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch elections', 
      details: error.message 
    });
  }
};

// Get Election By ID
exports.getElectionById = async (req, res) => {
  try {
    const { id } = req.body;

    const result = await pool.query(
      `SELECT 
        e.*,
        u.name as created_by_name,
        u.email as created_by_email,

        (SELECT COUNT(*) FROM candidates WHERE election_id = e.id) as candidate_count,
        (SELECT COUNT(*) FROM voters WHERE election_id = e.id) as voter_count,
        (SELECT COUNT(*) FROM wards WHERE election_id = e.id) as ward_count,
        (SELECT COUNT(*) FROM votes WHERE election_id = e.id) as vote_count,

        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', us.id,
                'name', us.name,
                'email', us.email
              )
            )
            FROM election_admins ea
            JOIN users us ON ea.admin_id = us.id
            WHERE ea.election_id = e.id
          ),
          '[]'
        ) as assigned_admins

       FROM elections e
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Election not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch election', 
      details: error.message 
    });
  }
};

exports.updateElection = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      id,
      title,
      description,
      election_date,
      start_time,
      end_time,
      total_wards,
      admin_ids,
    } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Election ID is required' });
    }

    await client.query('BEGIN');

    const existingElection = await client.query(
      'SELECT * FROM elections WHERE id = $1',
      [id]
    );

    if (existingElection.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Election not found' });
    }

    const current = existingElection.rows[0];

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }

    let finalDate = election_date || current.election_date;

    if (election_date !== undefined) {
      updates.push(`election_date = $${paramCount++}`);
      values.push(election_date);
    }

    if (start_time !== undefined) {
      const combinedStart = start_time
        ? `${finalDate} ${start_time}:00`
        : null;

      updates.push(`start_time = $${paramCount++}`);
      values.push(combinedStart);
    }

    if (end_time !== undefined) {
      const combinedEnd = end_time
        ? `${finalDate} ${end_time}:00`
        : null;

      updates.push(`end_time = $${paramCount++}`);
      values.push(combinedEnd);
    }

    if (total_wards !== undefined) {
      updates.push(`total_wards = $${paramCount++}`);
      values.push(total_wards);
    }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      updates.push(`updated_by = $${paramCount++}`);
      values.push(req.user.id); 
      values.push(id);

      const query = `
        UPDATE elections
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      await client.query(query, values);
    }

    if (admin_ids !== undefined) {

      await client.query(
        `DELETE FROM election_admins WHERE election_id = $1`,
        [id]
      );

      // Insert new admins
      if (admin_ids.length > 0) {
        const values = admin_ids
          .map((adminId, index) => `($1, $${index + 2})`)
          .join(',');

        await client.query(
          `INSERT INTO election_admins (election_id, admin_id)
           VALUES ${values}`,
          [id, ...admin_ids]
        );
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Election updated successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');

    res.status(500).json({
      error: 'Failed to update election',
      details: error.message
    });

  } finally {
    client.release();
  }
};

// Delete Election
exports.deleteElection = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Election ID is required' });
    }

    await client.query('BEGIN');

    // Check election exists
    const checkElection = await client.query(
      'SELECT * FROM elections WHERE id = $1', [id]
    );
    if (checkElection.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Election not found' });
    }

    // Prevent deletion if votes exist
    const voteCheck = await client.query(
      'SELECT COUNT(*) as vote_count FROM votes WHERE election_id = $1', [id]
    );
    if (parseInt(voteCheck.rows[0].vote_count) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Cannot delete election with existing votes',
        voteCount: voteCheck.rows[0].vote_count
      });
    }

    // 1. Delete candidates
    const deletedCandidates = await client.query(
      'DELETE FROM candidates WHERE election_id = $1 RETURNING id', [id]
    );

    // 2. Delete voters
    const deletedVoters = await client.query(
      'DELETE FROM voters WHERE election_id = $1 RETURNING id', [id]
    );

    // 3. Delete wards
    const deletedWards = await client.query(
      'DELETE FROM wards WHERE election_id = $1 RETURNING id', [id]
    );

    // 4. Delete election_admins
    await client.query(
      'DELETE FROM election_admins WHERE election_id = $1', [id]
    );

    // 5. Delete election
    const result = await client.query(
      'DELETE FROM elections WHERE id = $1 RETURNING *', [id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Election deleted successfully',
      data: {
        election: result.rows[0],
        deleted_summary: {
          candidates: deletedCandidates.rowCount,
          voters:     deletedVoters.rowCount,
          wards:      deletedWards.rowCount,
        }
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      error: 'Failed to delete election',
      details: error.message
    });
  } finally {
    client.release();
  }
};

// Get Elections by Status
// exports.getElectionsByStatus = async (req, res) => {
//   try {
//     const { status } = req.body; // 'Scheduled', 'Active', 'Completed', 'Cancelled'

//     const result = await pool.query(
//       `SELECT 
//         e.*,
//         u.name as created_by_name,
//         (SELECT COUNT(*) FROM candidates WHERE election_id = e.id) as candidate_count,
//         (SELECT COUNT(*) FROM voters WHERE election_id = e.id) as voter_count
//        FROM elections e
//        LEFT JOIN users u ON e.created_by = u.id
//        WHERE e.status = $1
//        ORDER BY e.election_date DESC`,
//       [status]
//     );

//     res.json({
//       success: true,
//       count: result.rows.length,
//       data: result.rows
//     });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to fetch elections', details: error.message });
//   }
// };

// Get Active/Upcoming Elections (for voters)
exports.getActiveElections = async (req, res) => {
  try {

    let query = `
      SELECT 
        e.id,
        e.title,
        e.description,
        e.election_date,
        e.start_time,
        e.end_time,
        e.total_wards,
        e.status,
        e.created_by,
        e.updated_at,
        uu.name AS updated_by_name,
        u_creator.name AS created_by_name, 

        (SELECT COUNT(*) FROM candidates WHERE election_id = e.id) AS candidate_count,

        (SELECT COALESCE(SUM(registered_voters_count), 0) 
        FROM wards 
        WHERE election_id = e.id) AS total_registered_voters,

        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', u.id,
                'name', u.name,
                'email', u.email
              )
            )
            FROM election_admins ea
            JOIN users u ON ea.admin_id = u.id
            WHERE ea.election_id = e.id
          ),
          '[]'
        ) AS assigned_admins

      FROM elections e
      LEFT JOIN users u_creator ON u_creator.id = e.created_by
      LEFT JOIN users uu ON e.updated_by::int = uu.id
    `;

    const values = [];

    if (req.user.role === 'admin') {
      query += `
        INNER JOIN election_admins ea_filter
          ON ea_filter.election_id = e.id
          AND ea_filter.admin_id = $1
      `;
      values.push(req.user.id);
    }

    query += `
      WHERE e.status IN ('Scheduled', 'Active')
      AND e.election_date >= CURRENT_DATE
      ORDER BY e.election_date ASC
    `;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch active elections',
      details: error.message
    });
  }
};

// Update Election Status
// exports.updateElectionStatus = async (req, res) => {
//   try {
//     const { id, status } = req.body;

//     // Validation
//     const validStatuses = ['Scheduled', 'Active', 'Completed', 'Cancelled'];
//     if (!validStatuses.includes(status)) {
//       return res.status(400).json({ 
//         error: 'Invalid status', 
//         validStatuses 
//       });
//     }

//     const result = await pool.query(
//       `UPDATE elections 
//        SET status = $1, updated_at = NOW()
//        WHERE id = $2 
//        RETURNING *`,
//       [status, id]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: 'Election not found' });
//     }

//     res.json({
//       success: true,
//       message: 'Election status updated successfully',
//       data: result.rows[0]
//     });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to update election status', details: error.message });
//   }
// };

// Get Election Statistics
exports.getElectionStatistics = async (req, res) => {
  try {
    const { id } = req.body;

    const result = await pool.query(
      `SELECT 
        e.*,
        (SELECT COUNT(*) FROM candidates WHERE election_id = e.id) as total_candidates,
        (SELECT COUNT(*) FROM voters WHERE election_id = e.id) as total_voters,
        (SELECT COUNT(*) FROM voters WHERE election_id = e.id AND has_voted = true) as total_votes_cast,
        (SELECT COUNT(*) FROM wards WHERE election_id = e.id) as total_wards,
        CASE 
          WHEN (SELECT COUNT(*) FROM voters WHERE election_id = e.id) > 0 
          THEN ROUND(
            (SELECT COUNT(*) FROM voters WHERE election_id = e.id AND has_voted = true)::numeric / 
            (SELECT COUNT(*) FROM voters WHERE election_id = e.id)::numeric * 100, 
            2
          )
          ELSE 0 
        END as voter_turnout_percentage
       FROM elections e
       WHERE e.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Election not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch election statistics', details: error.message });
  }
};

exports.getCompletedElectionsWithWards = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        e.*,
        u.name AS created_by_name,
        uu.name AS updated_by_name,  
        COALESCE(cand_count.count, 0) AS candidate_count,
        COALESCE(voter_count.count, 0) AS voter_count,
        COALESCE(ward_count.count, 0) AS ward_count,
        COALESCE(vote_count.count, 0) AS vote_count,

        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', a.id,
                'name', a.name,
                'email', a.email
              )
            )
            FROM election_admins ea
            JOIN users a ON ea.admin_id = a.id
            WHERE ea.election_id = e.id
          ),
          '[]'
        ) AS assigned_admins,

        json_agg(
          json_build_object(
            'id', w.id,
            'ward_number', w.ward_number,
            'ward_name', w.ward_name,
            'registered_voters_count', w.registered_voters_count,
            'votes_cast_count', w.votes_cast_count
          )
        ) FILTER (WHERE w.id IS NOT NULL) AS wards

      FROM elections e
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN users uu ON e.updated_by::int = uu.id  
      LEFT JOIN wards w ON w.election_id = e.id
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS count FROM candidates WHERE election_id = e.id
      ) cand_count ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS count FROM voters WHERE election_id = e.id
      ) voter_count ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS count FROM wards WHERE election_id = e.id
      ) ward_count ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS count FROM votes WHERE election_id = e.id
      ) vote_count ON TRUE
      WHERE e.election_date <= CURRENT_DATE
        AND e.end_time < NOW()
      GROUP BY e.id, u.name, uu.name, cand_count.count, voter_count.count, ward_count.count, vote_count.count
      ORDER BY e.end_time DESC`
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch completed elections with wards",
      details: error.message
    });
  }
};

exports.autoUpdateElectionStatus = async () => {
  try {
    const now = new Date();

    // Active — election_date is today AND current time is between start_time and end_time
    await pool.query(
      `UPDATE elections
       SET status = 'Active', updated_at = NOW()
       WHERE status != 'Cancelled'
         AND election_date = CURRENT_DATE
         AND start_time::time <= NOW()::time
         AND end_time::time >= NOW()::time`,
    );

    // Completed — election_date has passed OR end_time has passed today
    await pool.query(
      `UPDATE elections
       SET status = 'Completed', updated_at = NOW()
       WHERE status != 'Cancelled'
         AND (
           election_date < CURRENT_DATE
           OR (election_date = CURRENT_DATE AND end_time::time < NOW()::time)
         )`
    );

    // Scheduled — election_date is in the future OR today but start_time hasn't come yet
    await pool.query(
      `UPDATE elections
       SET status = 'Scheduled', updated_at = NOW()
       WHERE status != 'Cancelled'
         AND (
           election_date > CURRENT_DATE
           OR (election_date = CURRENT_DATE AND start_time::time > NOW()::time)
         )`
    );

  } catch (error) {
  }
};

exports.getAllElectionsForAdmin = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        e.*,
        u.name AS created_by_name,
        uu.name AS updated_by_name,  

        (SELECT COUNT(*) FROM candidates WHERE election_id = e.id) AS candidate_count,
        (SELECT COUNT(*) FROM voters WHERE election_id = e.id) AS voter_count,
        (SELECT COUNT(*) FROM wards WHERE election_id = e.id) AS ward_count,
        (SELECT COUNT(*) FROM votes WHERE election_id = e.id) AS vote_count,

        (SELECT COALESCE(SUM(registered_voters_count), 0) 
         FROM wards WHERE election_id = e.id) AS total_registered_voters,

        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', a.id,
                'name', a.name,
                'email', a.email
              )
            )
            FROM election_admins ea
            JOIN users a ON ea.admin_id = a.id
            WHERE ea.election_id = e.id
          ),
          '[]'
        ) AS assigned_admins

       FROM elections e
       LEFT JOIN users u ON e.created_by = u.id
       LEFT JOIN users uu ON e.updated_by::int = uu.id   

       WHERE 
         e.created_by = $1
         OR EXISTS (
           SELECT 1 
           FROM election_admins ea 
           WHERE ea.election_id = e.id 
           AND ea.admin_id = $1
         )

       ORDER BY e.created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch elections',
      details: error.message
    });
  }
};

exports.getActiveElectionsForAdmin = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        e.id,
        e.title,
        e.description,
        e.election_date,
        e.start_time,
        e.end_time,
        e.total_wards,
        e.status,
        e.updated_at,
        uu.name AS updated_by_name, 

        (SELECT COUNT(*) FROM candidates WHERE election_id = e.id) AS candidate_count,
        (SELECT COALESCE(SUM(registered_voters_count), 0) FROM wards WHERE election_id = e.id) AS total_registered_voters,

        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', a.id,
                'name', a.name,
                'email', a.email
              )
            )
            FROM election_admins ea
            JOIN users a ON ea.admin_id = a.id
            WHERE ea.election_id = e.id
          ),
          '[]'
        ) AS assigned_admins

      FROM elections e
      LEFT JOIN users uu ON e.updated_by::int = uu.id       
      LEFT JOIN election_admins ea_filter ON ea_filter.election_id = e.id
      WHERE e.status IN ('Scheduled', 'Active')
        AND e.election_date >= CURRENT_DATE
        AND (e.created_by = $1 OR ea_filter.admin_id = $1)
      GROUP BY e.id, uu.name, e.updated_at
      ORDER BY e.election_date ASC`,
      [req.user.id]
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch active elections',
      details: error.message
    });
  }
};

exports.getCompletedElectionsWithWardsForAdmin = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        e.*,
        u.name AS created_by_name,
        uu.name AS updated_by_name, 
        COALESCE(cand_count.count, 0) AS candidate_count,
        COALESCE(voter_count.count, 0) AS voter_count,
        COALESCE(ward_count.count, 0) AS ward_count,
        COALESCE(vote_count.count, 0) AS vote_count,

        json_agg(
          json_build_object(
            'id', w.id,
            'ward_number', w.ward_number,
            'ward_name', w.ward_name,
            'registered_voters_count', w.registered_voters_count,
            'votes_cast_count', w.votes_cast_count
          )
        ) FILTER (WHERE w.id IS NOT NULL) AS wards

      FROM elections e
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN users uu ON e.updated_by::int = uu.id 
      LEFT JOIN wards w ON w.election_id = e.id
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS count FROM candidates WHERE election_id = e.id
      ) cand_count ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS count FROM voters WHERE election_id = e.id
      ) voter_count ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS count FROM wards WHERE election_id = e.id
      ) ward_count ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS count FROM votes WHERE election_id = e.id
      ) vote_count ON TRUE
      WHERE e.election_date <= CURRENT_DATE
        AND e.end_time < NOW()
        AND e.created_by = $1
      GROUP BY e.id, u.name, uu.name, cand_count.count, voter_count.count, ward_count.count, vote_count.count
      ORDER BY e.end_time DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch completed elections with wards",
      details: error.message
    });
  }
};

module.exports = exports;