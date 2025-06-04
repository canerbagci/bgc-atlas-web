const { client, pool } = require('../config/database');

/**
 * Get sample information including counts of samples, analyzed samples, running samples, and BGCs
 * @returns {Promise<Array>} - Array of sample information
 */
async function getSampleInfo() {
  try {
    const result = await client.query('SELECT\n' +
      '    (SELECT COUNT(*) FROM mgnify_asms) AS "sample_count",\n' +
      '    (SELECT COUNT(*) FROM antismash_runs WHERE status = \'success\') AS "success",\n' +
      '    (SELECT COUNT(*) FROM antismash_runs WHERE status = \'runningAS\') AS "running",\n' +
      '    (SELECT COUNT(*) FROM protoclusters) AS protoclusters,\n' +
      '    (SELECT COUNT(*) FROM protoclusters WHERE contig_edge = \'False\') AS complbgcscount');
    
    return JSON.parse(JSON.stringify(result.rows));
  } catch (error) {
    console.error('Error getting sample info:', error);
    throw error;
  }
}

/**
 * Get detailed sample data
 * @returns {Promise<Array>} - Array of sample data
 */
async function getSampleData() {
  try {
    const { rows } = await pool.query('SELECT ar.status, ma.sampleacc, ma.assembly, ab.longest_biome, ma.submittedseqs,\n' +
      '       COALESCE(pc.protocluster_count, 0) AS protocluster_count,\n' +
      '       ma.longitude, ma.latitude, ma.envbiome, ma.envfeat, ma.collectdate,\n' +
      '       ma.biosample, ma.species, ma.hosttaxid\n' +
      'FROM atlas.public.antismash_runs ar\n' +
      '         INNER JOIN atlas.public.mgnify_asms ma ON ar.assembly = ma.assembly\n' +
      '         LEFT JOIN (\n' +
      '    SELECT assembly, COUNT(*) AS protocluster_count\n' +
      '    FROM atlas.public.protoclusters\n' +
      '    GROUP BY assembly\n' +
      ') pc ON ma.assembly = pc.assembly\n' +
      '         INNER JOIN (\n' +
      '    SELECT assembly, MAX(LENGTH(biome)) AS max_length,\n' +
      '           FIRST_VALUE(biome) OVER (PARTITION BY assembly ORDER BY LENGTH(biome) DESC) AS longest_biome\n' +
      '    FROM atlas.public.assembly2biome\n' +
      '    GROUP BY assembly, biome\n' +
      ') ab ON ma.assembly = ab.assembly\n' +
      'GROUP BY ar.status, ma.sampleacc, ma.assembly, ab.longest_biome, ma.submittedseqs,\n' +
      '         ma.longitude, ma.latitude, ma.envbiome, ma.envfeat, ma.collectdate,\n' +
      '         ma.biosample, ma.species, ma.hosttaxid, pc.protocluster_count\n' +
      'ORDER BY protocluster_count DESC;');
    
    return rows;
  } catch (error) {
    console.error('Error getting sample data:', error);
    throw error;
  }
}

/**
 * Get alternative sample data
 * @returns {Promise<Array>} - Array of alternative sample data
 */
async function getSampleData2() {
  try {
    const { rows } = await pool.query('SELECT ar.status, ma.sampleacc, ma.assembly, ma.submittedseqs, COUNT(pc.assembly) AS protocluster_count,\n' +
      '       ma.longitude, ma.latitude, ma.envbiome, ma.envfeat, ma.collectdate, ma.biosample, ma.species, ma.hosttaxid\n' +
      'FROM atlas.public.antismash_runs ar\n' +
      '         INNER JOIN atlas.public.mgnify_asms ma ON ar.assembly = ma.assembly\n' +
      '         LEFT JOIN atlas.public.protoclusters pc ON ma.assembly = pc.assembly\n' +
      'GROUP BY ar.status, ma.sampleacc, ma.assembly, ma.submittedseqs, ma.longitude, ma.latitude, ma.envbiome,\n' +
      '         ma.envfeat, ma.collectdate, ma.biosample, ma.species, ma.hosttaxid\n' +
      'ORDER BY ar.status;');
    
    return rows;
  } catch (error) {
    console.error('Error getting sample data 2:', error);
    throw error;
  }
}

/**
 * Get BGC ID for a dataset and anchor
 * @param {string} dataset - The dataset ID
 * @param {string} anchor - The anchor ID
 * @returns {Promise<Object>} - Object containing the BGC ID
 */
async function getBgcId(dataset, anchor) {
  try {
    const query = 'SELECT region_id FROM regions WHERE assembly = $1 AND anchor = $2';
    const result = await client.query(query, [dataset, anchor]);
    
    if (result.rows.length > 0) {
      return { bgcId: result.rows[0].region_id };
    } else {
      return { bgcId: 'Not Found' };
    }
  } catch (error) {
    console.error('Error getting BGC ID:', error);
    throw error;
  }
}

module.exports = {
  getSampleInfo,
  getSampleData,
  getSampleData2,
  getBgcId
};