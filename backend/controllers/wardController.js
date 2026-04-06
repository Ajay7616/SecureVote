const pool = require('../config/database');
const xlsx = require('xlsx');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const axios = require('axios');
const { sendVoterLoginMail } = require('../utils/emailService');


function extractKeyLocation(address) {
  let cleaned = address.replace(/[-–]\s*\d{6}/, '').trim();

  const parts = cleaned
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const relevant = parts.slice(-2);

  return relevant.join(', ');
}

async function geocodeAddress(rawAddress) {
  const simplifiedAddress = extractKeyLocation(rawAddress);

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: simplifiedAddress,
        format: 'json',
        limit: 1,
        addressdetails: 1
      },
      headers: { 'User-Agent': 'VoterUploadApp/1.0' },
      timeout: 10000
    });

    if (!response.data || response.data.length === 0) {
      return null;
    }

    const { lat, lon, display_name } = response.data[0];

    return {
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      latLng: `${lat},${lon}`,     
      displayAddress: display_name,   
      simplifiedAddress              
    };

  } catch (err) {
    return null;
  }
}

function readColumn(row, ...keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return String(row[key]).trim();
    }
  }
  return '';
}

exports.createWard = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      ward_number,
      ward_name,
      election_id,
      constituency,
      registered_voters_count,
      separate_voter_list,
      boundary_polygon,
    } = req.body;

    if (!ward_number || !ward_name || !election_id) {
      return res.status(400).json({
        error: "Ward number, ward name and election_id are required",
      });
    }

    if (separate_voter_list === true && !boundary_polygon) {
      return res.status(400).json({
        error: "Boundary polygon is required when separate_voter_list is true",
      });
    }

    const finalBoundary = separate_voter_list === true ? boundary_polygon : null;

    const wardResult = await client.query(
      `INSERT INTO wards
       (ward_number, ward_name, election_id, constituency, registered_voters_count,
        separate_voter_list, boundary_polygon, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        ward_number,
        ward_name,
        election_id,
        constituency || null,
        registered_voters_count || 0,
        separate_voter_list || false,
        finalBoundary,
        req.user.id,
      ]
    );

    const ward = wardResult.rows[0];

    await client.query(
      `INSERT INTO candidates
       (name, party, symbol, ward_id, election_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        "NOTA",
        "NOTA",
        null,
        ward.id,
        election_id,
        req.user.id
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Ward created successfully with default NOTA candidate",
      data: ward,
    });

  } catch (error) {
    await client.query("ROLLBACK");

    res.status(500).json({
      error: "Failed to create ward",
      details: error.message,
    });
  } finally {
    client.release();
  }
};

exports.getAllWards = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        w.*,
        e.title AS election_title,
        u.name AS created_by_name,
        uu.name AS updated_by_name,          
        ST_AsGeoJSON(w.boundary_polygon)::json AS boundary_geojson,

        (SELECT COUNT(*) FROM voters v WHERE v.ward_id = w.id) AS voter_count,
        (SELECT COUNT(*) FROM candidates c WHERE c.ward_id = w.id) AS candidate_count,
        (SELECT COUNT(*) FROM votes vt WHERE vt.ward_id = w.id) AS votes_cast_count

       FROM wards w
       LEFT JOIN elections e ON w.election_id = e.id
       LEFT JOIN users u ON w.created_by = u.id
       LEFT JOIN users uu ON w.updated_by::int = uu.id  
       ORDER BY w.created_at DESC`
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch wards',
      details: error.message
    });
  }
};

exports.getWardById = async (req, res) => {
  try {
    const { id } = req.body;

    const result = await pool.query(
      `SELECT 
        w.*,
        ST_AsGeoJSON(boundary_polygon)::json AS boundary_geojson,
        e.title as election_title,
        u.name as created_by_name,
        u.email as created_by_email
       FROM wards w
       LEFT JOIN elections e ON w.election_id = e.id
       LEFT JOIN users u ON w.created_by = u.id
       WHERE w.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ward not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch ward',
      details: error.message
    });
  }
};

exports.updateWard = async (req, res) => {
  try {
    const {
      id,
      ward_number,
      ward_name,
      constituency,
      registered_voters_count,
      separate_voter_list,
      boundary_polygon,
      description
    } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Ward ID is required' });
    }

    const existing = await pool.query('SELECT * FROM wards WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Ward not found' });
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

    if (ward_number !== undefined) addField('ward_number', ward_number);
    if (ward_name !== undefined) addField('ward_name', ward_name);
    if (constituency !== undefined) addField('constituency', constituency);
    if (registered_voters_count !== undefined) addField('registered_voters_count', registered_voters_count);
    if (separate_voter_list !== undefined) addField('separate_voter_list', separate_voter_list);

    const finalSeparate = separate_voter_list !== undefined ? separate_voter_list : current.separate_voter_list;
    if (finalSeparate) {
      if (boundary_polygon !== undefined) {
        addField('boundary_polygon', boundary_polygon);
      } else if (!current.boundary_polygon) {
        return res.status(400).json({
          error: 'Boundary polygon is required when separate_voter_list is true'
        });
      }
    } else {
      updates.push('boundary_polygon = NULL');
    }

    if (description !== undefined) addField('description', description);

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = NOW()');
    updates.push(`updated_by = $${paramCount}`);
    values.push(req.user.id);

    values.push(id);

    const query = `
      UPDATE wards
      SET ${updates.join(', ')}
      WHERE id = $${paramCount + 1}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: 'Ward updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to update ward',
      details: error.message
    });
  }
};

exports.deleteWard = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.body;

    const check = await client.query('SELECT * FROM wards WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Ward not found' });
    }

    await client.query('BEGIN');

    const deletedVoters = await client.query(
      'DELETE FROM voters WHERE ward_id = $1 RETURNING id',
      [id]
    );

    const result = await client.query(
      'DELETE FROM wards WHERE id = $1 RETURNING *',
      [id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Ward deleted successfully',
      data: {
        ward: result.rows[0],
        voters_deleted: deletedVoters.rowCount  
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      error: 'Failed to delete ward',
      details: error.message
    });
  } finally {
    client.release();
  }
};

exports.uploadVoterList = async (req, res) => {
  const client = await pool.connect();

  try {
    console.log("📥 Upload request received");

    const { ward_id, election_id } = req.body;

    console.log("➡️ ward_id:", ward_id, "election_id:", election_id);

    if (!ward_id || !election_id) {
      console.log("❌ Missing ward_id or election_id");
      return res.status(400).json({
        error: 'ward_id and election_id are required'
      });
    }

    if (!req.file) {
      console.log("❌ No file uploaded");
      return res.status(400).json({
        error: 'Excel or CSV file is required'
      });
    }

    console.log("📄 File uploaded:", req.file.originalname);

    const filePath = path.resolve(req.file.path);

    const workbook  = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(
      workbook.Sheets[sheetName],
      { defval: '' }
    );

    console.log("📊 Total rows in file:", sheetData.length);

    if (!sheetData || sheetData.length === 0) {
      await fs.unlink(filePath);
      console.log("❌ File is empty");
      return res.status(400).json({ error: 'File is empty' });
    }

    const total = sheetData.length;

    const wardResult = await client.query(
      `SELECT id, separate_voter_list FROM wards WHERE id = $1`,
      [ward_id]
    );

    if (wardResult.rows.length === 0) {
      await fs.unlink(filePath);
      console.log("❌ Ward not found:", ward_id);
      return res.status(404).json({ error: 'Ward not found' });
    }

    const ward = wardResult.rows[0];
    console.log("🏢 Ward found. Geo filtering:", ward.separate_voter_list);

    const allVoterIdsInFile = sheetData
      .map(row => readColumn(row, 'voter_id','Voter ID','VoterID','VOTER_ID','voter id','Voter_ID'))
      .filter(Boolean);

    const existingResult = await client.query(
      `SELECT voter_id FROM voters
       WHERE election_id = $1
         AND voter_id = ANY($2::text[])`,
      [election_id, allVoterIdsInFile]
    );

    const alreadyExistingIds = new Set(existingResult.rows.map(r => r.voter_id));
    console.log(`⚠️ Duplicate voter_ids already in election: ${alreadyExistingIds.size}`);

    const validRows        = [];
    const duplicateRows    = []; 
    let geocodeFailed = 0;
    let skippedRows   = 0;

    for (let i = 0; i < sheetData.length; i++) {
      const row = sheetData[i];

      const voter_id   = readColumn(row, 'voter_id','Voter ID','VoterID','VOTER_ID','voter id','Voter_ID');
      const name       = readColumn(row, 'name','Name','NAME','Full Name','full_name','FullName','FULL_NAME');
      const email      = readColumn(row, 'email','Email','EMAIL','Email ID','email_id','EmailID','E-Mail');
      const mobile     = readColumn(row, 'mobile','Mobile','MOBILE','Phone','phone','PHONE','mobile_no','Mobile No','MobileNo','Phone Number','Contact');
      const rawAddress = readColumn(row, 'address','Address','ADDRESS','Full Address','full_address','Addr');

      if (!voter_id || !name || !email || !mobile) {
        skippedRows++;
        console.log(`⚠️ Row ${i + 1} skipped (missing required fields)`);
        continue;
      }

      if (alreadyExistingIds.has(String(voter_id))) {
        duplicateRows.push({ row: i + 1, voter_id, name });
        console.log(`🔁 Row ${i + 1} skipped — voter_id "${voter_id}" already registered in this election`);
        continue;
      }

      let address = rawAddress;

      if (ward.separate_voter_list === true) {
        console.log(`🌍 Geocoding row ${i + 1}...`);

        const result = await geocodeAddress(rawAddress);
        console.log("Geocode result for row:", result);

        if (!result) {
          geocodeFailed++;
          console.log(`❌ Geocode failed for row ${i + 1}`);
          continue;
        }

        address = result.latLng;
        console.log(`✅ Geocoded: ${address}`);

        await new Promise(r => setTimeout(r, 1100));
      }

      validRows.push([
        voter_id,
        name,
        email,
        mobile,
        address,
        ward_id,
        election_id,
        uuidv4(),
        req.user.id
      ]);
    }

    console.log("✅ Valid rows:", validRows.length);
    console.log("⚠️ Skipped rows (missing fields):", skippedRows);
    console.log("🔁 Duplicate rows (already registered):", duplicateRows.length);
    console.log("❌ Geocode failed:", geocodeFailed);

    if (validRows.length === 0) {
      await fs.unlink(filePath);

      let errorMessage = 'No valid rows found in file.';
      if (duplicateRows.length > 0 && skippedRows === 0 && geocodeFailed === 0) {
        errorMessage = `All ${duplicateRows.length} voter(s) in this file are already registered for this election.`;
      } else if (duplicateRows.length > 0) {
        errorMessage = `No rows could be imported. ${duplicateRows.length} duplicate(s), ${skippedRows} missing required fields, ${geocodeFailed} geocode failure(s).`;
      }

      console.log("❌ No valid rows after processing");
      return res.status(400).json({
        error: errorMessage,
        summary: {
          total,
          success:               0,
          duplicates:            duplicateRows.length,
          skipped_missing_fields: skippedRows,
          geocode_failed:        geocodeFailed,
        },
        duplicates: duplicateRows, 
      });
    }

    await client.query('BEGIN');
    console.log("🟢 Transaction started");

    await client.query(`
      CREATE TEMP TABLE temp_voters (
        voter_id    TEXT,
        name        TEXT,
        email       TEXT,
        mobile      TEXT,
        address     TEXT,
        ward_id     INTEGER,
        election_id INTEGER,
        login_id    TEXT,
        created_by  INTEGER
      ) ON COMMIT DROP;
    `);

    console.log("📦 Temp table created");

    const valuesClause = validRows.map((_, i) => {
      const base = i * 9;
      return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9})`;
    }).join(',');

    const flatValues = validRows.flat();

    await client.query(
      `INSERT INTO temp_voters
       (voter_id, name, email, mobile, address, ward_id, election_id, login_id, created_by)
       VALUES ${valuesClause}`,
      flatValues
    );

    console.log("📥 Inserted into temp table");

    if (ward.separate_voter_list === true) {
      console.log("📍 Applying geo-boundary filtering...");

      await client.query(
        `DELETE FROM temp_voters t
         WHERE
           position(',' in t.address) = 0
           OR split_part(t.address, ',', 1) !~ '^[0-9.\\-]+$'
           OR split_part(t.address, ',', 2) !~ '^[0-9.\\-]+$'
           OR NOT EXISTS (
             SELECT 1
             FROM wards w
             WHERE w.id = $1
             AND ST_Contains(
                   w.boundary_polygon,
                   ST_SetSRID(
                     ST_MakePoint(
                       split_part(t.address, ',', 2)::FLOAT,
                       split_part(t.address, ',', 1)::FLOAT
                     ),
                     4326
                   )
                 )
           )`,
        [ward_id]
      );

      console.log("✅ Geo filtering done");
    }

    const insertResult = await client.query(
      `INSERT INTO voters
       (voter_id, name, email, mobile, address,
        ward_id, election_id, login_id, created_by)
       SELECT voter_id, name, email, mobile, address,
              ward_id, election_id, login_id, created_by
       FROM temp_voters
       ON CONFLICT (voter_id, election_id) DO NOTHING
       RETURNING name, email, login_id`
    );

    console.log("📤 Inserted into voters table:", insertResult.rowCount);

    const success = insertResult.rowCount;

    const raceConditionDuplicates = validRows.length - success;

    const failed =
      total -
      success -
      duplicateRows.length -
      skippedRows -
      geocodeFailed -
      raceConditionDuplicates;

    for (const voter of insertResult.rows) {
      try {
        await sendVoterLoginMail(voter.email, voter.name, voter.login_id);
        console.log(`📧 Email sent to ${voter.email}`);
      } catch {
        console.log(`⚠️ Email failed for ${voter.email}`);
      }
    }

    await client.query('COMMIT');
    console.log("✅ Transaction committed");
    
    await client.query(
      `INSERT INTO voter_list_uploads
      (ward_id, election_id, file_name, file_path,
        total_voters, successful_imports, failed_imports,
        upload_status, uploaded_by, processed_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())`,
      [
        ward_id,
        election_id,
        req.file.originalname,
        req.file.path,
        total,
        success,
        Math.max(failed, 0),
        'completed',
        req.user.id
      ]
    );

    console.log("📝 Audit record inserted (SUCCESS)");

    await fs.unlink(filePath);
    console.log("🧹 File deleted");

    return res.status(201).json({
      success: true,
      message: 'Voter list uploaded successfully',
      summary: {
        total,
        success,
        failed:                 Math.max(failed, 0),
        duplicates:             duplicateRows.length + raceConditionDuplicates,
        geocode_failed:         geocodeFailed,
        skipped_missing_fields: skippedRows,
      },
      ...(duplicateRows.length > 0 && { duplicate_voters: duplicateRows }),
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.log("❌ ERROR:", error.message);

    return res.status(500).json({
      error:   'Failed to upload voter list',
      details: error.message,
    });

  } finally {
    client.release();
    console.log("🔚 DB client released");
  }
};

exports.getAllWardsForAdmin = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        w.*,
        e.title AS election_title,
        u.name AS created_by_name,
        uu.name AS updated_by_name,         
        ST_AsGeoJSON(w.boundary_polygon)::json AS boundary_geojson,

        (SELECT COUNT(*) FROM voters v WHERE v.ward_id = w.id) AS voter_count,
        (SELECT COUNT(*) FROM candidates c WHERE c.ward_id = w.id) AS candidate_count,
        (SELECT COUNT(*) FROM votes vt WHERE vt.ward_id = w.id) AS votes_cast_count

       FROM wards w
       LEFT JOIN elections e ON w.election_id = e.id
       LEFT JOIN users u ON w.created_by = u.id
       LEFT JOIN users uu ON w.updated_by::int = uu.id  
       LEFT JOIN election_admins ea ON ea.election_id = e.id
       WHERE e.created_by = $1 OR ea.admin_id = $1
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch wards',
      details: error.message
    });
  }
};

exports.getUploadHistory = async (req, res) => {
  try {
    const { ward_id, election_id } = req.body;

    if (!ward_id) {
      return res.status(400).json({
        success: false,
        message: "ward_id is required",
      });
    }

    let query = `
      SELECT
        vlu.id,
        vlu.ward_id,
        vlu.election_id,
        vlu.file_name,
        vlu.total_voters,
        vlu.successful_imports,
        vlu.failed_imports,
        vlu.upload_status,
        vlu.uploaded_at,
        vlu.processed_at,
        u.name  AS uploaded_by_name,
        e.title AS election_title,
        w.ward_name,
        w.ward_number
      FROM voter_list_uploads vlu
      LEFT JOIN users     u ON u.id = vlu.uploaded_by
      LEFT JOIN elections e ON e.id = vlu.election_id
      LEFT JOIN wards     w ON w.id = vlu.ward_id
      WHERE vlu.ward_id = $1
    `;

    const params = [ward_id];

    if (election_id) {
      query += ` AND vlu.election_id = $2`;
      params.push(election_id);
    }

    query += ` ORDER BY vlu.uploaded_at DESC`;

    const result = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      data: result.rows,
      total: result.rowCount,
    });

  } catch (error) {
    console.error("❌ getUploadHistory error:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch upload history",
      details: error.message,
    });
  }
};
 
exports.getUploadHistoryByElection = async (req, res) => {
  try {
    const { election_id } = req.body;

    if (!election_id) {
      return res.status(400).json({
        success: false,
        message: "election_id is required",
      });
    }

    const result = await pool.query(
      `SELECT
         vlu.id,
         vlu.ward_id,
         vlu.election_id,
         vlu.file_name,
         vlu.total_voters,
         vlu.successful_imports,
         vlu.failed_imports,
         vlu.upload_status,
         vlu.uploaded_at,
         vlu.processed_at,
         u.name  AS uploaded_by_name,
         e.title AS election_title,
         w.ward_name,
         w.ward_number
       FROM voter_list_uploads vlu
       LEFT JOIN users     u ON u.id = vlu.uploaded_by
       LEFT JOIN elections e ON e.id = vlu.election_id
       LEFT JOIN wards     w ON w.id = vlu.ward_id
       WHERE vlu.election_id = $1
       ORDER BY vlu.uploaded_at DESC`,
      [election_id]
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
      total: result.rowCount,
    });

  } catch (error) {
    console.error("❌ getUploadHistoryByElection error:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch upload history",
      details: error.message,
    });
  }
};

module.exports = exports;