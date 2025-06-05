const { pool } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Get map data for all samples with geographic coordinates
 * @returns {Promise<Array>} - Array of samples with coordinates
 */
async function getMapData() {
  try {
    const result = await pool.query('WITH geo_data AS (\n' +
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

    return result.rows;
  } catch (error) {
    logger.error('Error getting map data:', error);
    throw error;
  }
}

/**
 * Get map data for a specific GCF
 * @param {number|null} gcfId - The GCF ID to filter by (optional)
 * @param {string[]|null} samples - Array of sample IDs to filter by (optional)
 * @param {string|null} jobId - Job ID to filter by (optional)
 * @param {number|null} putativeThreshold - Threshold for putative hits (optional)
 * @returns {Promise<Array>} - Array of samples with coordinates
 */
async function getMapDataForGcf(gcfId = null, samples = null, jobId = null, putativeThreshold = null) {
  try {
    // If job ID is provided, get GCF IDs from search_results table
    if (jobId) {
      let jobResultsQuery = `
        SELECT DISTINCT gcf_id
        FROM search_results
        WHERE job_id = $1
      `;

      const params = [jobId];

      // If putative threshold is provided, filter out hits with membership value greater than the threshold
      if (putativeThreshold !== null) {
        jobResultsQuery += ` AND membership_value <= $2`;
        params.push(putativeThreshold);
      }

      const jobResults = await pool.query(jobResultsQuery, params);

      // Extract GCF IDs from results
      const jobGcfIds = jobResults.rows.map(row => {
        // If the ID is in the format "GCF_123", extract the numeric part
        if (row.gcf_id.startsWith('GCF_')) {
          return parseInt(row.gcf_id.substring(4), 10);
        }
        return parseInt(row.gcf_id, 10);
      }).filter(id => !isNaN(id));

      // If we have GCF IDs from the job, use them instead of the provided GCF ID
      if (jobGcfIds.length > 0) {
        gcfId = null; // Clear the original gcfId

        // Build the SQL query with the job GCF IDs
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
            AND ma.assembly IN (
              SELECT
                  assembly
              FROM
                  regions
              WHERE
                  bigslice_gcf_id IN (${jobGcfIds.map((_, idx) => `$${idx + 1}`).join(', ')})
            )
        `;

        sql += `
          GROUP BY
              sm.sample
          ORDER BY
              latitude
        `;

        const result = await pool.query(sql, jobGcfIds);
        return result.rows;
      }
    }

    // If no job ID or no GCF IDs from job, proceed with the original logic
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

    const result = await pool.query(sql, params);
    return result.rows;
  } catch (error) {
    logger.error('Error getting map data for GCF:', error);
    throw error;
  }
}

/**
 * Get body map data
 * @returns {Promise<Array>} - Array of samples with body site information
 */
async function getBodyMapData() {
  try {
    const result = await pool.query('SELECT sample, meta_value\n' +
      'FROM sample_metadata\n' +
      'WHERE meta_key = \'body site\'\n' +
      'GROUP BY sample, meta_value;');

    return result.rows;
  } catch (error) {
    logger.error('Error getting body map data:', error);
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

    const result = await pool.query(query, [column]);

    return result.rows;
  } catch (error) {
    logger.error(`Error getting filtered map data for column ${column}:`, error);
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

    const result = await pool.query(query, [column]);

    return result.rows;
  } catch (error) {
    logger.error(`Error getting column values for ${column}:`, error);
    throw error;
  }
}

/**
 * Get biome data for a specific GCF or set of GCFs
 * @param {number[]|null} gcfIds - Array of GCF IDs to filter by (optional)
 * @param {string[]|null} samples - Array of sample IDs to filter by (optional)
 * @param {string|null} jobId - Job ID to filter by (optional)
 * @param {number|null} putativeThreshold - Threshold for putative hits (optional)
 * @returns {Promise<Array>} - Array of biomes with counts
 */
async function getBiomeDataForGcfs(gcfIds = null, samples = null, jobId = null, putativeThreshold = null) {
  try {
    // If job ID is provided, get GCF IDs from search_results table
    if (jobId) {
      let jobResultsQuery = `
        SELECT DISTINCT gcf_id
        FROM search_results
        WHERE job_id = $1
      `;

      const params = [jobId];

      // If putative threshold is provided, filter out hits with membership value greater than the threshold
      if (putativeThreshold !== null) {
        jobResultsQuery += ` AND membership_value <= $2`;
        params.push(putativeThreshold);
      }

      const jobResults = await pool.query(jobResultsQuery, params);

      // Extract GCF IDs from results
      const jobGcfIds = jobResults.rows.map(row => {
        // If the ID is in the format "GCF_123", extract the numeric part
        if (row.gcf_id.startsWith('GCF_')) {
          return parseInt(row.gcf_id.substring(4), 10);
        }
        return parseInt(row.gcf_id, 10);
      }).filter(id => !isNaN(id));

      // If we have GCF IDs from the job, use them instead of the provided GCF IDs
      if (jobGcfIds.length > 0) {
        gcfIds = jobGcfIds;
      }
    }

    // If no GCF IDs and no samples, return empty array
    if ((!gcfIds || gcfIds.length === 0) && (!samples || samples.length === 0)) {
      return [];
    }

    // New SQL query that uses the regions table and longest_biome column
    let sql = `
      SELECT
        r.longest_biome AS biome,
        COUNT(DISTINCT r.region_id) AS count
      FROM
        regions r
      WHERE
        r.longest_biome IS NOT NULL
    `;

    let filters = [];
    let params = [];
    let paramIndex = 1;

    // Handle the gcfIds parameter
    if (gcfIds && gcfIds.length > 0) {
      // Create placeholders for each GCF ID
      const gcfPlaceholders = gcfIds.map((_, idx) => `$${paramIndex + idx}`).join(', ');

      filters.push(`r.bigslice_gcf_id IN (${gcfPlaceholders})`);

      // Add each GCF ID as a parameter
      params.push(...gcfIds.map(id => parseInt(id, 10)));
      paramIndex += gcfIds.length;
    }

    // Handle the samples parameter
    if (samples && samples.length > 0) {
      let samplesArray = Array.isArray(samples) ? samples : samples.split(',').map(sample => sample.trim());
      filters.push(`r.assembly IN (${samplesArray.map((_, idx) => `$${paramIndex + idx}`).join(', ')})`);
      params.push(...samplesArray);
      paramIndex += samplesArray.length;
    }

    // If there are any filters, apply them to the SQL query
    if (filters.length > 0) {
      sql += ` AND ${filters.join(' AND ')}`;
    }

    // Group by biome and order by count
    sql += `
      GROUP BY
        r.longest_biome
      ORDER BY
        count DESC
    `;

    // Log the SQL query and parameters to the console
    logger.info('Executing SQL query for biome data:', { sql, params });

    const result = await pool.query(sql, params);

    // Process the results to remove "root:" prefix from biome names
    const processedRows = result.rows.map(row => ({
      ...row,
      biome: row.biome ? row.biome.replace(/^root:/, '') : 'Unknown'
    }));

    return processedRows;
  } catch (error) {
    logger.error('Error getting biome data for GCFs:', error);
    throw error;
  }
}

module.exports = {
  getMapData,
  getMapDataForGcf,
  getBodyMapData,
  getFilteredMapData,
  getColumnValues,
  getBiomeDataForGcfs
};
