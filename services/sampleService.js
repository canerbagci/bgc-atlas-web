const { pool } = require('../config/database');
const cacheService = require('./cacheService');

/**
 * Validates a dataset parameter
 * @param {string} dataset - The dataset to validate
 * @returns {string} - The validated dataset
 * @throws {Error} - If the dataset is invalid
 */
function validateDataset(dataset) {
  if (!dataset || typeof dataset !== 'string') {
    throw new Error('Dataset is required and must be a string');
  }

  // Validate dataset format (alphanumeric with some special chars)
  const validDatasetRegex = /^[A-Za-z0-9_.-]+$/;
  if (!validDatasetRegex.test(dataset)) {
    throw new Error(`Invalid dataset format: ${dataset}`);
  }

  if (dataset.length > 100) {
    throw new Error('Dataset name is too long');
  }

  return dataset;
}

/**
 * Validates an anchor parameter
 * @param {string} anchor - The anchor to validate
 * @returns {string} - The validated anchor
 * @throws {Error} - If the anchor is invalid
 */
function validateAnchor(anchor) {
  if (!anchor || typeof anchor !== 'string') {
    throw new Error('Anchor is required and must be a string');
  }

  // Validate anchor format (alphanumeric with some special chars)
  const validAnchorRegex = /^[A-Za-z0-9_.-]+$/;
  if (!validAnchorRegex.test(anchor)) {
    throw new Error(`Invalid anchor format: ${anchor}`);
  }

  if (anchor.length > 100) {
    throw new Error('Anchor name is too long');
  }

  return anchor;
}

/**
 * Validates pagination parameters
 * @param {*} start - The start index
 * @param {*} length - The page size
 * @returns {Object} - The validated pagination parameters
 * @throws {Error} - If the pagination parameters are invalid
 */
function validatePagination(start, length) {
  const startNum = Number.parseInt(start, 10);
  if (Number.isNaN(startNum) || startNum < 0) {
    throw new Error('Invalid start parameter: must be a non-negative integer');
  }

  const lengthNum = Number.parseInt(length, 10);
  if (Number.isNaN(lengthNum) || lengthNum <= 0 || lengthNum > 1000) {
    throw new Error('Invalid length parameter: must be a positive integer not exceeding 1000');
  }

  return { start: startNum, length: lengthNum };
}

/**
 * Validates a search value
 * @param {string} searchValue - The search value to validate
 * @returns {string|null} - The validated search value or null if empty
 * @throws {Error} - If the search value is invalid
 */
function validateSearchValue(searchValue) {
  if (!searchValue) {
    return null;
  }

  if (typeof searchValue !== 'string') {
    throw new Error('Search value must be a string');
  }

  if (searchValue.length > 1000) {
    throw new Error('Search value is too long');
  }

  // Remove potentially dangerous characters
  return searchValue.replace(/[;'"\\]/g, '');
}

/**
 * Validates order parameters
 * @param {*} order - The order parameters
 * @param {string[]} allowedColumns - The allowed column names
 * @returns {Array} - The validated order parameters
 * @throws {Error} - If the order parameters are invalid
 */
function validateOrder(order, allowedColumns) {
  if (!order || !Array.isArray(order) || order.length === 0) {
    return [];
  }

  return order.map(item => {
    const column = Number.parseInt(item.column, 10);
    if (Number.isNaN(column) || column < 0 || column >= allowedColumns.length) {
      throw new Error(`Invalid column index: ${item.column}`);
    }

    const dir = item.dir.toLowerCase();
    if (dir !== 'asc' && dir !== 'desc') {
      throw new Error(`Invalid sort direction: ${item.dir}`);
    }

    return { column, dir };
  });
}

/**
 * Get sample information including counts of samples, analyzed samples, running samples, and BGCs
 * @returns {Promise<Array>} - Array of sample information
 */
async function getSampleInfo() {
  // Create a simple cache key since this function has no parameters
  const cacheKey = 'sampleInfo';

  // Use the caching service to get or fetch the data
  return cacheService.getOrFetch(cacheKey, async () => {
    try {
      const result = await pool.query('SELECT\n' +
        '    (SELECT COUNT(*) FROM mgnify_asms) AS "sample_count",\n' +
        '    (SELECT COUNT(*) FROM antismash_runs WHERE status = \'success\') AS "success",\n' +
        '    (SELECT COUNT(*) FROM antismash_runs WHERE status = \'runningAS\') AS "running",\n' +
        '    (SELECT COUNT(*) FROM protoclusters) AS protoclusters,\n' +
        '    (SELECT COUNT(*) FROM protoclusters WHERE contig_edge = \'False\') AS complbgcscount');

      return result.rows;
    } catch (error) {
      console.error('Error getting sample info:', error);
      throw error;
    }
  }, 3600); // Cache for 1 hour
}

/**
 * Get detailed sample data
 * @returns {Promise<Array>} - Array of sample data
 */
async function getSampleData() {
  // Create a simple cache key since this function has no parameters
  const cacheKey = 'sampleData';

  // Use the caching service to get or fetch the data
  return cacheService.getOrFetch(cacheKey, async () => {
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
  }, 3600); // Cache for 1 hour
}

/**
 * Get paginated sample data with search and ordering capabilities
 * @param {Object} options - Pagination, search, and ordering options
 * @param {number} options.start - Starting index for pagination
 * @param {number} options.length - Number of records to return
 * @param {string} options.searchValue - Search value for filtering
 * @param {Array} options.order - Ordering information
 * @param {number} options.draw - DataTables draw counter
 * @returns {Promise<Object>} - Object containing paginated data and metadata
 */
async function getPaginatedSampleData(options) {
  const { start, length, searchValue, order, draw } = options;

  try {
    // Base query for counting total records
    const baseCountQuery = `
      SELECT COUNT(*) AS total
      FROM (
        SELECT ar.status, ma.sampleacc, ma.assembly, ab.longest_biome, ma.submittedseqs,
               COALESCE(pc.protocluster_count, 0) AS protocluster_count,
               ma.longitude, ma.latitude, ma.envbiome, ma.envfeat, ma.collectdate,
               ma.biosample, ma.species, ma.hosttaxid
        FROM atlas.public.antismash_runs ar
        INNER JOIN atlas.public.mgnify_asms ma ON ar.assembly = ma.assembly
        LEFT JOIN (
          SELECT assembly, COUNT(*) AS protocluster_count
          FROM atlas.public.protoclusters
          GROUP BY assembly
        ) pc ON ma.assembly = pc.assembly
        INNER JOIN (
          SELECT assembly, MAX(LENGTH(biome)) AS max_length,
                 FIRST_VALUE(biome) OVER (PARTITION BY assembly ORDER BY LENGTH(biome) DESC) AS longest_biome
          FROM atlas.public.assembly2biome
          GROUP BY assembly, biome
        ) ab ON ma.assembly = ab.assembly
        GROUP BY ar.status, ma.sampleacc, ma.assembly, ab.longest_biome, ma.submittedseqs,
                 ma.longitude, ma.latitude, ma.envbiome, ma.envfeat, ma.collectdate,
                 ma.biosample, ma.species, ma.hosttaxid, pc.protocluster_count
      ) AS counted_data
    `;

    // Base query for data
    let baseDataQuery = `
      SELECT ar.status, ma.sampleacc, ma.assembly, ab.longest_biome, ma.submittedseqs,
             COALESCE(pc.protocluster_count, 0) AS protocluster_count,
             ma.longitude, ma.latitude, ma.envbiome, ma.envfeat, ma.collectdate,
             ma.biosample, ma.species, ma.hosttaxid
      FROM atlas.public.antismash_runs ar
      INNER JOIN atlas.public.mgnify_asms ma ON ar.assembly = ma.assembly
      LEFT JOIN (
        SELECT assembly, COUNT(*) AS protocluster_count
        FROM atlas.public.protoclusters
        GROUP BY assembly
      ) pc ON ma.assembly = pc.assembly
      INNER JOIN (
        SELECT assembly, MAX(LENGTH(biome)) AS max_length,
               FIRST_VALUE(biome) OVER (PARTITION BY assembly ORDER BY LENGTH(biome) DESC) AS longest_biome
        FROM atlas.public.assembly2biome
        GROUP BY assembly, biome
      ) ab ON ma.assembly = ab.assembly
    `;

    // Search condition
    let searchCondition = '';
    let searchParams = [];

    if (searchValue) {
      searchCondition = `
        WHERE ma.sampleacc ILIKE $1
        OR ma.assembly ILIKE $1
        OR ab.longest_biome ILIKE $1
        OR ma.envbiome ILIKE $1
        OR ma.envfeat ILIKE $1
        OR ma.biosample ILIKE $1
        OR ma.species ILIKE $1
      `;
      searchParams.push(`%${searchValue}%`);
    }

    // Get total count (without search)
    const totalResult = await pool.query(baseCountQuery);
    const totalRecords = parseInt(totalResult.rows[0].total);

    // Get filtered count (with search)
    let filteredRecords = totalRecords;
    if (searchValue) {
      const filteredCountQuery = `
        SELECT COUNT(*) AS total
        FROM (
          SELECT ar.status, ma.sampleacc, ma.assembly, ab.longest_biome, ma.submittedseqs,
                 COALESCE(pc.protocluster_count, 0) AS protocluster_count,
                 ma.longitude, ma.latitude, ma.envbiome, ma.envfeat, ma.collectdate,
                 ma.biosample, ma.species, ma.hosttaxid
          FROM atlas.public.antismash_runs ar
          INNER JOIN atlas.public.mgnify_asms ma ON ar.assembly = ma.assembly
          LEFT JOIN (
            SELECT assembly, COUNT(*) AS protocluster_count
            FROM atlas.public.protoclusters
            GROUP BY assembly
          ) pc ON ma.assembly = pc.assembly
          INNER JOIN (
            SELECT assembly, MAX(LENGTH(biome)) AS max_length,
                   FIRST_VALUE(biome) OVER (PARTITION BY assembly ORDER BY LENGTH(biome) DESC) AS longest_biome
            FROM atlas.public.assembly2biome
            GROUP BY assembly, biome
          ) ab ON ma.assembly = ab.assembly
          ${searchCondition}
          GROUP BY ar.status, ma.sampleacc, ma.assembly, ab.longest_biome, ma.submittedseqs,
                   ma.longitude, ma.latitude, ma.envbiome, ma.envfeat, ma.collectdate,
                   ma.biosample, ma.species, ma.hosttaxid, pc.protocluster_count
        ) AS filtered_data
      `;
      const filteredResult = await pool.query(filteredCountQuery, searchParams);
      filteredRecords = parseInt(filteredResult.rows[0].total);
    }

    // Add search condition to data query
    if (searchValue) {
      baseDataQuery += searchCondition;
    }

    // Add GROUP BY clause
    baseDataQuery += `
      GROUP BY ar.status, ma.sampleacc, ma.assembly, ab.longest_biome, ma.submittedseqs,
               ma.longitude, ma.latitude, ma.envbiome, ma.envfeat, ma.collectdate,
               ma.biosample, ma.species, ma.hosttaxid, pc.protocluster_count
    `;

    // Add ORDER BY clause
    let orderClause = 'ORDER BY protocluster_count DESC';

    if (order && order.length > 0) {
      const columns = [
        'status', 'sampleacc', 'assembly', 'longest_biome', 'submittedseqs',
        'protocluster_count', 'longitude', 'latitude', 'envbiome', 'envfeat',
        'collectdate', 'biosample', 'species', 'hosttaxid'
      ];

      const orderParts = order.map(o => {
        const columnIndex = parseInt(o.column);
        const direction = o.dir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        return `${columns[columnIndex]} ${direction}`;
      });

      if (orderParts.length > 0) {
        orderClause = `ORDER BY ${orderParts.join(', ')}`;
      }
    }

    baseDataQuery += ` ${orderClause}`;

    // Add LIMIT and OFFSET
    baseDataQuery += ` LIMIT $${searchParams.length + 1} OFFSET $${searchParams.length + 2}`;
    searchParams.push(length);
    searchParams.push(start);

    // Execute the final query
    const { rows } = await pool.query(baseDataQuery, searchParams);

    return {
      draw: draw,
      recordsTotal: totalRecords,
      recordsFiltered: filteredRecords,
      data: rows
    };
  } catch (error) {
    console.error('Error getting paginated sample data:', error);
    throw error;
  }
}

/**
 * Get alternative sample data
 * @returns {Promise<Array>} - Array of alternative sample data
 */
async function getSampleData2() {
  // Create a simple cache key since this function has no parameters
  const cacheKey = 'sampleData2';

  // Use the caching service to get or fetch the data
  return cacheService.getOrFetch(cacheKey, async () => {
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
  }, 3600); // Cache for 1 hour
}

/**
 * Get BGC ID for a dataset and anchor
 * @param {string} dataset - The dataset ID
 * @param {string} anchor - The anchor ID
 * @returns {Promise<Object>} - Object containing the BGC ID
 */
async function getBgcId(dataset, anchor) {
  // Create a cache key based on the function parameters
  const cacheKey = `bgcId_${dataset}_${anchor}`;

  // Use the caching service to get or fetch the data
  return cacheService.getOrFetch(cacheKey, async () => {
    try {
      const query = 'SELECT region_id FROM regions WHERE assembly = $1 AND anchor = $2';
      const result = await pool.query(query, [dataset, anchor]);

      if (result.rows.length > 0) {
        return { bgcId: result.rows[0].region_id };
      } else {
        return { bgcId: 'Not Found' };
      }
    } catch (error) {
      console.error('Error getting BGC ID:', error);
      throw error;
    }
  }, 3600); // Cache for 1 hour
}

module.exports = {
  getSampleInfo,
  getSampleData,
  getSampleData2,
  getBgcId,
  getPaginatedSampleData
};
