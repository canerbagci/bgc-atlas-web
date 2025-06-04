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

    // Handle the gcf query parameter
    if (gcfId) {
      filters.push(`ma.assembly IN (
              SELECT
                  assembly
              FROM
                  regions
              WHERE
                  bigslice_gcf_id = ${gcfId}
          )`);
    }

    // Handle the samples query parameter
    if (samples && samples.length > 0) {
      let samplesStr = samples.map(sample => `'${sample.trim()}'`).join(', ');
      filters.push(`ma.assembly IN (${samplesStr})`);
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

    const result = await client.query(sql);
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
    const result = await client.query('SELECT \n' +
      '    sm1.sample AS sample, \n' +
      '    sm1.meta_value AS longitude, \n' +
      '    sm2.meta_value AS latitude,\n' +
      '    sm3.meta_value AS environment\n' +
      'FROM \n' +
      '    sample_metadata sm1\n' +
      '    JOIN sample_metadata sm2 ON sm1.sample = sm2.sample\n' +
      '    JOIN sample_metadata sm3 ON sm1.sample = sm3.sample\n' +
      'WHERE \n' +
      '    sm1.meta_key = \'geographic location (longitude)\' AND sm1.meta_value IS NOT NULL\n' +
      '    AND sm2.meta_key = \'geographic location (latitude)\' AND sm2.meta_value IS NOT NULL\n' +
      '    AND sm3.meta_key = \'' + column +'\' AND sm3.meta_value IS NOT NULL;\n');
    
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
    const result = await client.query('SELECT DISTINCT meta_value\n' +
      'FROM sample_metadata\n' +
      'WHERE meta_key = \''+ column + '\'' +
      'ORDER BY meta_value ASC');
    
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