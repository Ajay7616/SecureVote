const pool = require('../config/database');
const crypto = require('crypto');
const { ethers } = require('ethers');

const VOTING_CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const VOTING_CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "_electionId", "type": "uint256" },
      { "internalType": "uint256", "name": "_candidateId", "type": "uint256" },
      { "internalType": "bytes32", "name": "_voterHash", "type": "bytes32" }
    ],
    "name": "castVote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "_voterHash", "type": "bytes32" }
    ],
    "name": "checkIfVoted",
    "outputs": [
      { "internalType": "bool", "name": "", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "electionId", "type": "uint256" },
      { "indexed": true, "internalType": "uint256", "name": "candidateId", "type": "uint256" },
      { "indexed": false, "internalType": "bytes32", "name": "voterHash", "type": "bytes32" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "VoteCast",
    "type": "event"
  }
];

const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_NETWORK || 'http://localhost:8545');
const wallet = new ethers.Wallet(process.env.BLOCKCHAIN_PRIVATE_KEY, provider);
const votingContract = new ethers.Contract(VOTING_CONTRACT_ADDRESS, VOTING_CONTRACT_ABI, wallet);

exports.castVote = async (req, res) => {
  const client = await pool.connect();
  
  try {
    let { candidate_id } = req.body;

    // Validation
    if (!candidate_id) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['candidate_id']
      });
    };

    const ipAddress =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress ||
      req.ip;

    const userAgent = req.headers["user-agent"];


    // Start transaction
    await client.query('BEGIN');

    // Step 1: Get voter details using login_id
    const voterResult = await client.query(
      `SELECT * FROM voters 
       WHERE login_id = $1 AND election_id = $2`,
      [req.user.login_id, req.user.election_id]
    );

    if (voterResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Voter not found or not registered for this election' });
    }

    const voter = voterResult.rows[0];

    // Step 2: Validate voter eligibility
    
    // Check if already voted
    if (voter.has_voted) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'You have already cast your vote',
        votedAt: voter.updated_at 
      });
    }

    // Verify ward_id matches voter's ward
    if (voter.ward_id !== req.user.ward_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Ward mismatch. You can only vote in your registered ward.',
        yourWard: voter.ward_id,
        attemptedWard: ward_id
      });
    }

    if (candidate_id === "NOTA") {
      const notaResult = await client.query(
        `SELECT id FROM candidates 
        WHERE name = 'NOTA' 
          AND election_id = $1 
          AND ward_id = $2
        LIMIT 1`,
        [req.user.election_id, req.user.ward_id]
      );

      if (notaResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: "NOTA candidate not found for this ward/election" });
      }

      candidate_id = notaResult.rows[0].id;
    }

    // Verify candidate exists and belongs to same election and ward
    const candidateResult = await client.query(
      `SELECT * FROM candidates 
       WHERE id = $1 AND election_id = $2 AND ward_id = $3`,
      [candidate_id, req.user.election_id, req.user.ward_id]
    );

    if (candidateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        error: 'Candidate not found or not eligible for this ward/election' 
      });
    }

    // Check if election is active
    const electionResult = await client.query(
      `SELECT * FROM elections WHERE id = $1`,
      [req.user.election_id]
    );

    if (electionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Election not found' });
    }

    const election = electionResult.rows[0];

    if (election.status !== 'Ongoing') {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: `Election is not active. Current status: ${election.status}` 
      });
    }

    // Check if election time is valid
    const now = new Date();
    if (election.start_time && new Date(election.start_time) > now) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Election has not started yet',
        startsAt: election.start_time
      });
    }

    if (election.end_time && new Date(election.end_time) < now) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Election has ended',
        endedAt: election.end_time
      });
    }

    // Step 3: Generate blockchain hash
    const voterHash = crypto
      .createHash('sha256')
      .update(`${req.user.login_id}-${req.user.election_id}-${candidate_id}-${Date.now()}-${Math.random()}`)
      .digest('hex');

    const blockchainHashBytes32 = ethers.keccak256(ethers.toUtf8Bytes(voterHash));

    // Step 4: Record vote on blockchain
    let transactionHash = null;
    try {
      const tx = await votingContract.castVote(
        req.user.election_id,
        candidate_id,
        blockchainHashBytes32
      );
      
      const receipt = await tx.wait();
      
      transactionHash = receipt.hash;
    } catch (blockchainError) {
      await client.query('ROLLBACK');
      return res.status(500).json({ 
        error: 'Failed to record vote on blockchain',
        details: blockchainError.message 
      });
    }

    // Step 5: Store vote in database
    const voteResult = await client.query(
      `INSERT INTO votes (
        election_id, 
        ward_id, 
        voter_id, 
        candidate_id, 
        blockchain_hash, 
        transaction_hash,
        ip_address,
        user_agent
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        req.user.election_id, 
        req.user.ward_id, 
        voter.voter_id, 
        candidate_id, 
        voterHash, 
        transactionHash,
        ipAddress,
        userAgent,
      ]
    );

    const vote = voteResult.rows[0];

    // Step 6: Increment candidate votes count
    await client.query(
      `UPDATE candidates 
       SET votes = votes + 1,
           updated_at = NOW()
       WHERE id = $1`,
      [candidate_id]
    );

    // Step 7: Increment ward votes_cast_count
    await client.query(
      `UPDATE wards 
       SET votes_cast_count = votes_cast_count + 1,
           updated_at = NOW()
       WHERE id = $1`,
      [req.user.ward_id]
    );

    // Step 8: Mark voter as has_voted
    await client.query(
      `UPDATE voters 
       SET has_voted = true,
           updated_at = NOW()
       WHERE id = $1`,
      [voter.id]
    );

    // Commit transaction
    await client.query('COMMIT');

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Vote cast successfully',
      data: {
        voteId: vote.id,
        blockchainHash: voterHash,
        transactionHash: transactionHash,
        votedAt: vote.voted_at,
        electionId: req.user.election_id,
        wardId: req.user.ward_id,
        candidateName: candidateResult.rows[0].name,
        candidateParty: candidateResult.rows[0].party
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ 
      error: 'Failed to cast vote', 
      details: error.message 
    });
  } finally {
    client.release();
  }
};

exports.getVoterStatus = async (req, res) => {
  try {

    const result = await pool.query(
      `SELECT 
        v.id,
        v.voter_id,
        v.name,
        v.ward_id,
        v.has_voted,
        w.ward_name,
        w.ward_number,
        e.title as election_title,
        e.status as election_status,
        e.start_time,
        e.end_time
       FROM voters v
       LEFT JOIN wards w ON v.ward_id = w.id
       LEFT JOIN elections e ON v.election_id = e.id
       WHERE v.login_id = $1 AND v.election_id = $2`,
      [req.user.login_id, req.user.election_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Voter not found' });
    }

    const voter = result.rows[0];

    res.json({
      success: true,
      data: {
        voterId: voter.voter_id,
        name: voter.name,
        wardId: voter.ward_id,
        wardName: voter.ward_name,
        wardNumber: voter.ward_number,
        hasVoted: voter.has_voted,
        election: {
          title: voter.election_title,
          status: voter.election_status,
          startTime: voter.start_time,
          endTime: voter.end_time
        },
        canVote: !voter.has_voted && voter.election_status === 'Active'
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch voter status', details: error.message });
  }
};


exports.getCandidatesForVoter = async (req, res) => {
  try {

    const voterResult = await pool.query(
      `SELECT ward_id, has_voted FROM voters 
       WHERE login_id = $1 AND election_id = $2`,
      [req.user.login_id, req.user.election_id]
    );

    if (voterResult.rows.length === 0) {
      return res.status(404).json({ error: 'Voter not found' });
    }

    const { ward_id, has_voted } = voterResult.rows[0];

    // Get candidates for this ward and election
    const candidatesResult = await pool.query(
      `SELECT 
        c.id,
        c.name,
        c.party,
        c.symbol,
        c.votes
       FROM candidates c
       WHERE c.election_id = $1 AND c.ward_id = $2
       ORDER BY c.name ASC`,
      [req.user.election_id, ward_id]
    );

    res.json({
      success: true,
      hasVoted: has_voted,
      wardId: ward_id,
      candidates: candidatesResult.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch candidates', details: error.message });
  }
};

exports.getElectionResults = async (req, res) => {
  try {
    const { election_id, ward_id } = req.body;

    if (!election_id) {
      return res.status(400).json({ error: "election_id is required" });
    }

    let query = `
      SELECT
        v.id AS vote_id,
        v.voter_id,
        vr.name AS voter_name,
        vr.mobile,
        v.candidate_id,
        v.ward_id,
        w.ward_name,
        w.ward_number,
        v.blockchain_hash,
        v.transaction_hash,
        v.voted_at
      FROM votes v
      JOIN voters vr 
        ON vr.voter_id = v.voter_id
        AND vr.election_id = v.election_id
      LEFT JOIN wards w
        ON w.id = v.ward_id
      WHERE v.election_id = $1
    `;

    const params = [election_id];

    if (ward_id) {
      query += ` AND v.ward_id = $2`;
      params.push(ward_id);
    }

    query += ` ORDER BY v.voted_at DESC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      electionId: election_id,
      results: result.rows
    });

  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch results",
      details: error.message
    });
  }
};

exports.verifyVoteOnBlockchain = async (req, res) => {
  try {
    const { blockchain_hash } = req.body;

    if (!blockchain_hash) {
      return res.status(400).json({ error: 'blockchain_hash is required' });
    }

    // Get vote from database
    const voteResult = await pool.query(
      `SELECT * FROM votes WHERE blockchain_hash = $1`,
      [blockchain_hash]
    );

    if (voteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vote not found' });
    }

    const vote = voteResult.rows[0];

    // Convert hash to bytes32
    const hashBytes32 = ethers.keccak256(ethers.toUtf8Bytes(vote.blockchain_hash));

    // Check on blockchain
    const hasVoted = await votingContract.checkIfVoted(hashBytes32);
    
    res.json({
      success: true,
      verified: hasVoted,
      voteData: {
        voteId: vote.id,
        electionId: vote.election_id,
        blockchainHash: vote.blockchain_hash,
        transactionHash: vote.transaction_hash,
        votedAt: vote.voted_at,
        verifiedOnBlockchain: hasVoted
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify vote', details: error.message });
  }
};

exports.getWardStatistics = async (req, res) => {
  try {
    const { ward_id } = req.body;

    if (!ward_id) {
      return res.status(400).json({ error: 'ward_id is required' });
    }

    const result = await pool.query(
      `SELECT 
        w.*,
        e.title as election_title,
        ROUND(
          (w.votes_cast_count::numeric / NULLIF(w.registered_voters_count, 0)) * 100,
          2
        ) as voter_turnout_percentage
       FROM wards w
       LEFT JOIN elections e ON w.election_id = e.id
       WHERE w.id = $1`,
      [ward_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ward not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ward statistics', details: error.message });
  }
};

exports.getElectionResultsForAdmin = async (req, res) => {
  try {
    const { election_id, ward_id, user_id } = req.body;

    if (!election_id || !user_id) {
      return res.status(400).json({ 
        error: "election_id and user_id are required" 
      });
    }

    let query = `
      SELECT
        v.id AS vote_id,
        v.voter_id,
        vr.name AS voter_name,
        vr.mobile,
        v.candidate_id,
        v.ward_id,
        w.ward_name,
        w.ward_number,
        v.blockchain_hash,
        v.transaction_hash,
        v.voted_at
      FROM votes v
      JOIN voters vr 
        ON vr.voter_id = v.voter_id
        AND vr.election_id = v.election_id
      LEFT JOIN wards w
        ON w.id = v.ward_id
      JOIN elections e
        ON e.id = v.election_id
      LEFT JOIN election_admins ea
        ON ea.election_id = e.id
      WHERE v.election_id = $1
        AND (e.created_by = $2 OR ea.admin_id = $2)
    `;

    const params = [election_id, user_id];

    if (ward_id) {
      query += ` AND v.ward_id = $3`;
      params.push(ward_id);
    }

    query += ` ORDER BY v.voted_at DESC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      electionId: election_id,
      results: result.rows
    });

  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch results",
      details: error.message
    });
  }
};

module.exports = exports;