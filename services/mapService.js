const { client } = require('../config/database');

/**
 * Get map data for all samples with geographic coordinates
 * @returns {Promise<Array>} - Array of samples with coordinates
 */
async function getMapData() {
  try {
    const result = await client.query('WITH geo_data AS (\n' +
      '    SELECT\n' +
      '        sample,\n' +
      '        MAX(CASE WHEN meta_key = \'geographic location (longitude)\' AND meta_value ~ \'^-?\\d+(\\.\\d+)?$\' THEN CAST(meta_value AS FLOAT) END) AS longitude,\n' +
      '        MAX(CASE WHEN meta_key = \'geographic location (latitude)\' AND meta_value ~ \'^-?\\d+(\\.\\d+)?$\' THEN CAST(meta_value AS FLOAT) END) AS latitude\n' +
      '    FROM\n' +
      '        atlas.public.sample_metadata\n' +
      '    WHERE\n' +
      '        meta_key IN (\'geographic location (longitude)\', \'geographic location (latitude)\')\n' +
      '        AND meta_value IS NOT NULL\n' +
      '    GROUP BY\n' +
      '        sample\n' +
      ')\n' +
      'SELECT\n' +
      '    gd.sample,\n' +
      '    gd.longitude,\n' +
      '    gd.latitude,\n' +
      '    ma.assembly\n' +
      'FROM\n' +
      '    geo_data gd\n' +
      'JOIN\n' +
      '    atlas.public.mgnify_asms ma\n' +
      'ON\n' +
      '    gd.sample = ma.sampleacc\n' +
      'WHERE\n' +
      '    NOT (gd.longitude = 0 AND gd.latitude = 0)\n' +
      'ORDER BY\n' +
      '    gd.latitude;');
    
    return JSON.parse(JSON.stringify(result.rows));
  } catch (error) {
    console.error('Error getting map data:', error);
    throw error;
  }
}

/**
 * Get map data for a specific GCF
 * @param {number|null} gcfId - The GCF ID to filter by (optional)
 * @param {string[]|null} samples - Array of sample IDs to filter by (optional)
 * @returns {Promise<Array>} - Array of samples with coordinates
 */
async function getMapDataForGcf(gcfId = null, samples = null) {
  try {
    let sql = `
      SELECT
        sm.sample,
        MAX(CASE WHEN sm.meta_key = 'geographic location (longitude)' THEN sm.meta_value END) AS longitude,
        MAX(CASE WHEN sm.meta_key = 'geographic location (latitude)' THEN sm.meta_value END) AS latitude
      FROM
        sample_metadata sm
          JOIN
        mgnify_asms ma ON ma.sampleacc = sm.sample
      WHERE
        sm.meta_key IN ('geographic location (longitude)', 'geographic location (latitude)')
        AND sm.meta_value IS NOT NULL
    `;

    let filters = [];
    let params = [];
    let paramIndex = 1;

    // Handle the gcf query parameter
    if (gcfId) {
      filters.push(`ma.assembly IN (
              SELECT
                  assembly
              FROM
                  regions
              WHERE
                  bigslice_gcf_id = $${paramIndex}
          )`);
      params.push(parseInt(gcfId, 10));
      paramIndex++;
    }

    // Handle the samples query parameter
    if (samples && samples.length > 0) {
      let samplesArray = Array.isArray(samples) ? samples : samples.split(',').map(sample => sample.trim());
      filters.push(`ma.assembly IN (${samplesArray.map((_, idx) => `$${paramIndex + idx}`).join(', ')})`);
      params.push(...samplesArray);
      paramIndex += samplesArray.length;
    }

    // If there are any filters, apply them to the SQL query
    if (filters.length > 0) {
      sql += ` AND ${filters.join(' AND ')}`;
    }

    sql += `
      GROUP BY
          sm.sample
      ORDER BY
          latitude
    `;

    const result = await client.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Error getting map data for GCF:', error);
    throw error;
  }
}

/**
 * Get body map data
 * @returns {Promise<Array>} - Array of samples with body site information
 */
async function getBodyMapData() {
  try {
    const result = await client.query('SELECT sample, meta_value\n' +
      'FROM sample_metadata\n' +
      'WHERE meta_key = \'body site\'\n' +
      'GROUP BY sample, meta_value;');
    
    return JSON.parse(JSON.stringify(result.rows));
  } catch (error) {
    console.error('Error getting body map data:', error);
    throw error;
  }
}

/**
 * Get filtered map data based on a column
 * @param {string} column - The column to filter by
 * @returns {Promise<Array>} - Array of filtered samples
 */
async function getFilteredMapData(column) {
  try {
    const query = `SELECT
        sm1.sample AS sample,
        sm1.meta_value AS longitude,
        sm2.meta_value AS latitude,
        sm3.meta_value AS environment
      FROM
        sample_metadata sm1
        JOIN sample_metadata sm2 ON sm1.sample = sm2.sample
        JOIN sample_metadata sm3 ON sm1.sample = sm3.sample
      WHERE
        sm1.meta_key = 'geographic location (longitude)' AND sm1.meta_value IS NOT NULL
        AND sm2.meta_key = 'geographic location (latitude)' AND sm2.meta_value IS NOT NULL
        AND sm3.meta_key = $1 AND sm3.meta_value IS NOT NULL;`;

    const result = await client.query(query, [column]);
    
    return JSON.parse(JSON.stringify(result.rows));
  } catch (error) {
    console.error(`Error getting filtered map data for column ${column}:`, error);
    throw error;
  }
}

/**
 * Get distinct values for a column
 * @param {string} column - The column to get values for
 * @returns {Promise<Array>} - Array of distinct values
 */
async function getColumnValues(column) {
  try {
    const query = `SELECT DISTINCT meta_value
      FROM sample_metadata
      WHERE meta_key = $1
      ORDER BY meta_value ASC`;

    const result = await client.query(query, [column]);
    
    return JSON.parse(JSON.stringify(result.rows));
  } catch (error) {
    console.error(`Error getting column values for ${column}:`, error);
    throw error;
  }
}

module.exports = {
  getMapData,
  getMapDataForGcf,
  getBodyMapData,
  getFilteredMapData,
  getColumnValues
};