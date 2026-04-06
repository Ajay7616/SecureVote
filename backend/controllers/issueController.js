const pool = require('../config/database');
const cron = require("node-cron");


exports.createFeedbackIssue = async (req, res) => {
  try {
    const {
      name,
      email,
      mobile_number,
      issue_subject,
      issue
    } = req.body;

    if (!email || !issue_subject || !issue) {
      return res.status(400).json({
        error: "Email, issue_subject and issue are required"
      });
    }

    const result = await pool.query(
      `INSERT INTO feedback_and_issues
       (name, email, mobile_number, issue_subject, issue)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [name || null, email, mobile_number || null, issue_subject, issue]
    );

    res.status(201).json({
      success: true,
      message: "Issue submitted successfully",
      data: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({
      error: "Failed to create issue",
      details: error.message
    });
  }
};

exports.getAllFeedbackIssues = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        f.*,
        uu.name AS updated_by_name
       FROM feedback_and_issues f
       LEFT JOIN users uu ON f.updated_by::int = uu.id
       ORDER BY f.created_at DESC`
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch issues",
      details: error.message
    });
  }
};

exports.getIssuesBySeenStatus = async (req, res) => {
  try {
    const { issue_seen } = req.body;

    const result = await pool.query(
      `SELECT 
        f.*,
        uu.name AS updated_by_name
       FROM feedback_and_issues f
       LEFT JOIN users uu ON f.updated_by::int = uu.id
       WHERE f.issue_seen = $1
       ORDER BY f.created_at DESC`,
      [issue_seen]
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch issues",
      details: error.message
    });
  }
};

exports.updateIssueSeen = async (req, res) => {
  try {
    const { id, issue_seen } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Issue id is required" });
    }

    const result = await pool.query(
      `UPDATE feedback_and_issues
       SET 
         issue_seen = $1,
         updated_at = NOW(),
         updated_by = $2
       WHERE id = $3
       RETURNING *`,
      [issue_seen, req.user.id, id]  
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Issue not found" });
    }

    res.status(200).json({
      success: true,
      message: "Issue status updated",
      data: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({
      error: "Failed to update issue",
      details: error.message
    });
  }
};

exports.updateIssue = async (req, res) => {
  try {
    const { id, issue_seen, status } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Issue id is required" });
    }

    const result = await pool.query(
      `UPDATE feedback_and_issues
       SET 
         issue_seen = COALESCE($1, issue_seen),
         status = COALESCE($2, status),
         updated_at = NOW(),
         updated_by = $3
       WHERE id = $4
       RETURNING *`,
      [issue_seen, status, req.user.id, id]  
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Issue not found" });
    }

    res.status(200).json({
      success: true,
      message: "Issue updated successfully",
      data: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({
      error: "Failed to update issue",
      details: error.message
    });
  }
};

exports.deleteOldFeedback = async () => {
  try {
    const result = await pool.query(`
      DELETE FROM feedback_and_issues
      WHERE created_at < NOW() - INTERVAL '90 days'
    `);

    return result.rowCount;

  } catch (error) {
    throw error;
  }
};