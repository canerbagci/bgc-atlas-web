const { pool } = require('../config/database');
const cacheService = require('./cacheService');
const debug = require('debug')('bgc-atlas:bgcService');
const logger = require('../utils/logger');

/**
 * Validates a GCF ID parameter
 * @param {*} gcfId - The GCF ID to validate
 * @returns {number} - The validated GCF ID as a number
 * @throws {Error} - If the GCF ID is invalid
 */
function validateGcfId(gcfId) {
  if (gcfId === null || gcfId === undefined) {
    return null;
  }

  const id = Number.parseInt(gcfId, 10);
  if (Number.isNaN(id) || id <= 0) {
    throw new Error('Invalid gcf parameter: must be a positive integer');
  }
  return id;
}

/**
 * Validates a samples parameter
 * @param {*} samples - The samples parameter to validate
 * @returns {string[]} - The validated samples as an array of strings
 * @throws {Error} - If the samples parameter is invalid
 */
function validateSamples(samples) {
  if (!samples || (Array.isArray(samples) && samples.length === 0) || 
      (typeof samples === 'string' && samples.trim() === '')) {
    return null;
  }

  const samplesArray = Array.isArray(samples) 
    ? samples 
    : samples.split(',').map(s => s.trim());

  // Validate each sample ID
  const validSampleRegex = /^[A-Za-z0-9_.-]+$/;
  for (const sample of samplesArray) {
    if (!validSampleRegex.test(sample)) {
      throw new Error(`Invalid sample ID: ${sample}`);
    }
    if (sample.length > 100) {
      throw new Error(`Sample ID too long: ${sample}`);
    }
  }

  return samplesArray;
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
 * Get BGC information including counts of BGCs, success runs, GCFs, etc.
 * @param {number|null} gcfId - The GCF ID to filter by (optional)
 * @param {string[]|null} samples - Array of sample IDs to filter by (optional)
 * @returns {Promise<Array>} - Array of BGC information
 */
async function getBgcInfo(gcfId = null, samples = null) {
  try {
    // Validate inputs
    const validatedGcfId = validateGcfId(gcfId);
    const validatedSamples = validateSamples(samples);

    const cacheKey = `bgcInfo_${validatedGcfId || 'null'}_${validatedSamples ? validatedSamples.join(',') : 'null'}`;

    return cacheService.getOrFetch(cacheKey, async () => {
      try {
        /* ────────────
           1. Defaults
           ──────────── */
        let sql = `
          SELECT
            (SELECT COUNT(*) FROM regions)                                         AS bgc_count,
            (SELECT COUNT(*) FROM antismash_runs WHERE status = 'success')         AS success_count,
            (SELECT COUNT(DISTINCT gcf_id) FROM bigslice_gcf_membership)           AS gcf_count,
            ROUND(
              (SELECT COUNT(*) FROM regions)::NUMERIC /
              NULLIF((SELECT COUNT(*) FROM antismash_runs WHERE status = 'success'), 0),
              2
            ) AS meanbgcsamples,
            ROUND(
              (SELECT COUNT(*) FROM bigslice_gcf_membership)::NUMERIC /
              NULLIF((SELECT COUNT(DISTINCT gcf_id) FROM bigslice_gcf_membership), 0),
              2
            ) AS meanbgc,
            (SELECT COUNT(*) FROM regions WHERE gcf_from_search = false)           AS core_count,
            (SELECT COUNT(*) FROM regions WHERE membership_value < 0.405)          AS non_putative_count
        `;

        const params = [];
        const where = [];

        /* ────────────
           2. gcfId filter
           ──────────── */
        if (validatedGcfId) {
          where.push(`regions.bigslice_gcf_id = $${params.length + 1}`);
          params.push(validatedGcfId);
        }

        /* ────────────
           3. samples filter
           ──────────── */
        if (validatedSamples && validatedSamples.length) {
          const placeholders = validatedSamples
              .map((_, idx) => `$${params.length + idx + 1}`)
              .join(', ');

          where.push(`assembly IN (${placeholders})`);
          params.push(...validatedSamples);
        }

        /* ────────────
           4. If filters → wrap with CTEs using ONE where-clause string
           ──────────── */
        if (where.length) {
          const wc = where.join(' AND ');
          sql = `
            WITH
              bgc AS (
                SELECT COUNT(*) AS count FROM regions WHERE ${wc}
              ),
              success AS (
                SELECT COUNT(*) AS count
                FROM antismash_runs
                WHERE status = 'success'
                  AND assembly IN (SELECT assembly FROM regions WHERE ${wc})
              ),
              gcf AS (
                SELECT COUNT(DISTINCT gcf_id) AS count
                FROM bigslice_gcf_membership
                WHERE gcf_id IN (SELECT bigslice_gcf_id FROM regions WHERE ${wc})
              ),
              core AS (
                SELECT COUNT(*) AS count
                FROM regions
                WHERE gcf_from_search = false AND ${wc}
              ),
              non_putative AS (
                SELECT COUNT(*) AS count
                FROM regions
                WHERE membership_value < 0.405 AND ${wc}
              )
            SELECT
              bgc.count          AS bgc_count,
              success.count      AS success_count,
              gcf.count          AS gcf_count,
              ROUND(bgc.count::NUMERIC / NULLIF(success.count, 0), 2) AS meanbgcsamples,
              ROUND(bgc.count::NUMERIC / NULLIF(gcf.count, 0),       2) AS meanbgc,
              core.count         AS core_count,
              non_putative.count AS non_putative_count
            FROM bgc, success, gcf, core, non_putative;
          `;
        }

        const { rows } = await pool.query(sql, params); // use pooled client
        return rows;
      } catch (err) {
        logger.error('Error getting BGC info:', err);
        throw err;
      }
    }, 3600); // cache 1 h
  } catch (error) {
    logger.error('Error validating inputs for BGC info:', error);
    throw error;
  }
}

/**
 * Get product category counts
 * @param {number|null} gcfId - The GCF ID to filter by (optional)
 * @param {string[]|null} samples - Array of sample IDs to filter by (optional)
 * @returns {Promise<Array>} - Array of product category counts
 */
async function getProductCategoryCounts(gcfId = null, samples = null) {
  try {
    // Validate inputs
    const validatedGcfId = validateGcfId(gcfId);
    const validatedSamples = validateSamples(samples);

    let sql = `
        SELECT ARRAY_TO_STRING(product_categories, '|') AS categories, COUNT(*) AS count
        FROM regions
        GROUP BY categories
        ORDER BY count DESC
    `;

    let params = [];
    let filters = [];

    // If the gcf query parameter is provided, modify the SQL query
    if (validatedGcfId) {
      filters.push(`bigslice_gcf_id = $${params.length + 1}`);
      params.push(validatedGcfId);
    }

    // Handle the samples query parameter
    if (validatedSamples && validatedSamples.length > 0) {
      filters.push(`assembly IN (${validatedSamples.map((_, idx) => `$${params.length + idx + 1}`).join(', ')})`);
      params.push(...validatedSamples);
    }

    // If there are any filters, apply them to the SQL query
    if (filters.length > 0) {
      sql = `
        SELECT ARRAY_TO_STRING(product_categories, '|') AS categories, COUNT(*) AS count
        FROM regions
        WHERE ${filters.join(' AND ')}
        GROUP BY categories
        ORDER BY count DESC
      `;
    }

    const result = await pool.query(sql, params);
    return result.rows;
  } catch (error) {
    logger.error('Error getting product category counts:', error);
    throw error;
  }
}

/**
 * Get GCF category counts
 * @returns {Promise<Array>} - Array of GCF category counts
 */
async function getGcfCategoryCounts() {
  // Create a simple cache key since this function has no parameters
  const cacheKey = 'gcfCategoryCounts';

  // Use the caching service to get or fetch the data
  return cacheService.getOrFetch(cacheKey, async () => {
    try {
      const result = await pool.query('SELECT bgc_type, COUNT(DISTINCT family_number) as unique_families\n' +
        'FROM atlas.public.bigscape_clustering\n' +
        'WHERE clustering_threshold = 0.3\n' +
        'GROUP BY bgc_type\n' +
        'ORDER BY unique_families DESC;');

      return result.rows;
    } catch (error) {
      logger.error('Error getting GCF category counts:', error);
      throw error;
    }
  }, 3600); // Cache for 1 hour
}

/**
 * Get product counts
 * @param {number|null} gcfId - The GCF ID to filter by (optional)
 * @param {string[]|null} samples - Array of sample IDs to filter by (optional)
 * @returns {Promise<Array>} - Array of product counts
 */
async function getProductCounts(gcfId = null, samples = null) {
  try {
    // Validate inputs
    const validatedGcfId = validateGcfId(gcfId);
    const validatedSamples = validateSamples(samples);

    let sql = `
      SELECT prod, count
      FROM (
             SELECT type AS prod, COUNT(*) AS count, ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) AS row_num
             FROM regions
             GROUP BY type
           ) top_rows
      WHERE row_num <= 15
      UNION ALL
      SELECT 'Others', SUM(count) AS count
      FROM (
        SELECT COUNT(*) AS count
        FROM regions
        GROUP BY type
        ORDER BY count DESC
        OFFSET 15 -- Exclude the top 15 rows
        ) other_rows;
    `;

    let params = [];
    let filters = [];

    // Handle the gcf query parameter
    if (validatedGcfId) {
      filters.push(`bigslice_gcf_id = $${params.length + 1}`);
      params.push(validatedGcfId);
    }

    // Handle the samples query parameter
    if (validatedSamples && validatedSamples.length > 0) {
      filters.push(`assembly IN (${validatedSamples.map((_, idx) => `$${params.length + idx + 1}`).join(', ')})`);
      params.push(...validatedSamples);
    }

    // If filters are applied, adjust the SQL query
    if (filters.length > 0) {
      sql = `
      SELECT prod, count
      FROM (
        SELECT type AS prod, COUNT(*) AS count, ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) AS row_num
        FROM regions
        WHERE ${filters.join(' AND ')}
        GROUP BY type
      ) top_rows
      WHERE row_num <= 15
      UNION ALL
      SELECT 'Others', SUM(count) AS count
      FROM (
        SELECT COUNT(*) AS count
        FROM regions
        WHERE ${filters.join(' AND ')}
        GROUP BY type
        ORDER BY count DESC
        OFFSET 15 -- Exclude the top 15 rows
      ) other_rows;
      `;
    }

    const result = await pool.query(sql, params);
    return result.rows;
  } catch (error) {
    logger.error('Error getting product counts:', error);
    throw error;
  }
}

/**
 * Get GCF count histogram
 * @returns {Promise<Array>} - Array of GCF count histogram data
 */
async function getGcfCountHistogram() {
  // Create a simple cache key since this function has no parameters
  const cacheKey = 'gcfCountHistogram';

  // Use the caching service to get or fetch the data
  return cacheService.getOrFetch(cacheKey, async () => {
    try {
      const sql = 'WITH max_row_count AS (\n' +
        '    SELECT max(row_count) as max_row_count\n' +
        '    FROM (\n' +
        '             SELECT COUNT(*) as row_count\n' +
        '             FROM atlas.public.bigscape_clustering\n' +
        '             WHERE clustering_threshold = 0.3\n' +
        '             GROUP BY family_number\n' +
        '         ) counts\n' +
        ')\n' +
        'SELECT bucket_range, count(*) as count_in_bucket,\n' +
        '       min(row_count) as min_row_count, max(row_count) as max_row_count\n' +
        'FROM (\n' +
        '         SELECT family_number,\n' +
        '                width_bucket(count(*), 1, (SELECT max_row_count FROM max_row_count), 10) as bucket,\n' +
        '                count(*) as row_count\n' +
        '         FROM atlas.public.bigscape_clustering\n' +
        '         WHERE clustering_threshold = 0.3\n' +
        '         GROUP BY family_number\n' +
        '     ) counts\n' +
        '         JOIN (\n' +
        '    SELECT generate_series(0, (SELECT max_row_count FROM max_row_count) - 10, 10) as lower_bound,\n' +
        '           generate_series(10, (SELECT max_row_count FROM max_row_count), 10) as upper_bound,\n' +
        '           concat(generate_series(0, (SELECT max_row_count FROM max_row_count) - 10, 10), \'-\', generate_series(10, (SELECT max_row_count FROM max_row_count), 10)) as bucket_range\n' +
        ') buckets\n' +
        '              ON counts.row_count >= buckets.lower_bound AND counts.row_count < buckets.upper_bound\n' +
        'GROUP BY bucket_range, buckets.lower_bound\n' +
        'ORDER BY lower_bound;';

      const result = await pool.query(sql);
      return result.rows;
    } catch (error) {
      logger.error('Error getting GCF count histogram:', error);
      throw error;
    }
  }, 3600); // Cache for 1 hour
}

/**
 * Get GCF table sunburst data
 * @param {number|null} gcfId - The GCF ID to filter by (optional)
 * @param {string[]|null} samples - Array of sample IDs to filter by (optional)
 * @returns {Promise<Array>} - Array of GCF table sunburst data
 */
async function getGcfTableSunburst(gcfId = null, samples = null) {
  try {
    // Validate inputs
    const validatedGcfId = validateGcfId(gcfId);
    const validatedSamples = validateSamples(samples);

    let sql = `
      SELECT longest_biome, COUNT(longest_biome)
      FROM regions
      WHERE longest_biome IS NOT NULL
    `;

    let params = [];
    let filters = [];

    // Handle the gcf query parameter
    if (validatedGcfId) {
      filters.push(`bigslice_gcf_id = $${params.length + 1}`);
      params.push(validatedGcfId);
    }

    // Handle the samples query parameter
    if (validatedSamples && validatedSamples.length > 0) {
      filters.push(`assembly IN (${validatedSamples.map((_, idx) => `$${params.length + idx + 1}`).join(', ')})`);
      params.push(...validatedSamples);
    }

    // If there are filters, append them to the SQL query
    if (filters.length > 0) {
      sql += ` AND ${filters.join(' AND ')}`;
    }

    sql += ` GROUP BY longest_biome`;

    const result = await pool.query(sql, params);
    return result.rows;
  } catch (error) {
    logger.error('Error getting GCF table sunburst:', error);
    throw error;
  }
}

/**
 * Get paginated GCF table data.
 * Uses the pre-computed `region_genus_count` materialised view instead of the
 * expensive recursive CTE and logs the exact SQL sent to PostgreSQL.
 *
 * @param {Object}  options
 * @param {number}  options.draw   DataTables draw counter
 * @param {number}  options.start  Start index
 * @param {number}  options.length Page size
 * @param {Array}   options.order  [{ column: 0, dir: 'asc' | 'desc' }, …]
 * @returns {Promise<Object>}
 */
async function getGcfTable(options = {}) {
  try {
    const {
      draw = 1,
      start = 0,
      length = 10,
      order = []
    } = options;

    // Validate pagination parameters
    const { start: validatedStart, length: validatedLength } = validatePagination(start, length);

    // Validate draw parameter
    const validatedDraw = Number.parseInt(draw, 10);
    if (Number.isNaN(validatedDraw) || validatedDraw < 0) {
      throw new Error('Invalid draw parameter: must be a non-negative integer');
    }

    // Define allowed columns for ordering
    const selectable = [
      'gcf_id',            // 0
      'num_core_regions',  // 1
      'core_products',     // 2
      'core_biomes',       // 3
      'core_taxa',         // 4
      'num_all_regions',   // 5
      'all_products',      // 6
      'all_biomes',        // 7
      'all_taxa'           // 8
    ];

    // Validate order parameters
    const validatedOrder = validateOrder(order, selectable);

    /* ──────────────────────────────────────────────────────────────
       Base (fast) SQL – no params yet
       ────────────────────────────────────────────────────────────── */
    const baseSQL = `
      SELECT
        g.*,
        core.core_taxa,
        allx.all_taxa
      FROM bigslice_gcf g
      /* core = regions that are NOT from search results */
      LEFT JOIN (
        SELECT
          bigslice_gcf_id,
          STRING_AGG(genus_name || ' (' || cnt || ')', ', ' ORDER BY cnt DESC) AS core_taxa
        FROM region_genus_count
        WHERE gcf_from_search = false
        GROUP BY bigslice_gcf_id
      ) AS core ON core.bigslice_gcf_id = g.gcf_id
      /* all = every region */
      LEFT JOIN (
        SELECT
          bigslice_gcf_id,
          STRING_AGG(genus_name || ' (' || cnt || ')', ', ' ORDER BY cnt DESC) AS all_taxa
        FROM region_genus_count
        GROUP BY bigslice_gcf_id
      ) AS allx ON allx.bigslice_gcf_id = g.gcf_id
    `;

    /* ───────────────
       ORDER BY logic
       ─────────────── */
    let orderByClause = '';
    if (validatedOrder.length) {
      orderByClause =
          'ORDER BY ' +
          validatedOrder
              .map(({ column, dir }) =>
                  `${selectable[column]} ${dir === 'asc' ? 'ASC' : 'DESC'}`
              )
              .join(', ');
    } else {
      orderByClause = 'ORDER BY num_core_regions DESC, gcf_id DESC';
    }

    /* ────────────────────────────────────
       Final SQL with pagination placeholders
       ──────────────────────────────────── */
    const paginatedSQL = `
      ${baseSQL}
      ${orderByClause}
      LIMIT $1 OFFSET $2
    `;

    // Optional: log the SQL *with* actual limit/offset values
    debug(
        'GCF table query:',
        paginatedSQL.replace('$1', validatedLength).replace('$2', validatedStart)
    );

    /* ───────────────
       Execute queries
       ─────────────── */
    const countRes = await pool.query('SELECT COUNT(*) FROM bigslice_gcf;');
    const recordsTotal = Number(countRes.rows[0].count);

    const { rows } = await pool.query(paginatedSQL, [validatedLength, validatedStart]);

    /* ──────────────────────
       Return DataTables shape
       ────────────────────── */
    return {
      draw: validatedDraw,
      recordsTotal,
      recordsFiltered: recordsTotal, // no additional filtering yet
      data: rows
    };
  } catch (err) {
    logger.error('Error getting GCF table:', err);
    throw err;
  }
}


/**
 * Validates search builder criteria
 * @param {Array} criteria - The search builder criteria
 * @param {Array} allowedColumns - The allowed column names
 * @returns {Array} - The validated criteria
 * @throws {Error} - If the criteria are invalid
 */
function validateSearchBuilderCriteria(criteria, allowedColumns) {
  if (!criteria || !Array.isArray(criteria)) {
    return [];
  }

  const allowedConditions = new Set([
    '=', '!=', '<', '>', '<=', '>=',
    'between', 'not between',
    'contains', '!contains',
    'starts', '!starts',
    'ends', '!ends',
    'null', '!null'
  ]);

  const validatedCriteria = [];

  for (const criterion of criteria) {
    const { origData, condition, value, value1 } = criterion;

    // Validate column name
    if (!allowedColumns.includes(origData)) {
      throw new Error(`Invalid column name: ${origData}`);
    }

    // Validate condition
    if (!allowedConditions.has(condition)) {
      throw new Error(`Invalid condition: ${condition}`);
    }

    // Validate values based on condition
    if (['=', '!=', '<', '>', '<=', '>=', 'contains', '!contains', 'starts', '!starts', 'ends', '!ends'].includes(condition)) {
      if (value === undefined || value === null) {
        throw new Error(`Value is required for condition: ${condition}`);
      }

      // For string operations, validate the value is a string and not too long
      if (['contains', '!contains', 'starts', '!starts', 'ends', '!ends'].includes(condition)) {
        if (typeof value !== 'string') {
          throw new Error(`String value is required for condition: ${condition}`);
        }
        if (value.length > 1000) {
          throw new Error(`Value too long for condition: ${condition}`);
        }
      }
    } else if (['between', 'not between'].includes(condition)) {
      if (value === undefined || value === null || value1 === undefined || value1 === null) {
        throw new Error(`Two values are required for condition: ${condition}`);
      }
    }

    validatedCriteria.push({
      origData,
      condition,
      value,
      value1
    });
  }

  return validatedCriteria;
}

/**
 * Get BGC table data with filtering and pagination
 * @param {Object} options - Options for filtering and pagination
 * @returns {Promise<Object>} - Object containing BGC table data and metadata
 */
async function getBgcTable(options) {
  try {
    const {
      gcf,
      samples,
      showCoreMembers,
      showNonPutativeMembers,
      draw,
      start,
      length,
      searchValue,
      order,
      searchBuilder
    } = options;

    // Define allowed columns
    const columns = ['region_id', 'assembly', 'taxon_name', 'product_categories', 'products', 'longest_biome', 'start', 'bigslice_gcf_id', 'membership_value',
      'contig_edge', 'contig_name', 'region_num'];

    // Validate inputs
    const validatedGcfId = validateGcfId(gcf);
    const validatedSamples = validateSamples(samples);
    const { start: validatedStart, length: validatedLength } = validatePagination(start || 0, length || 10);

    // Validate draw parameter
    const validatedDraw = Number.parseInt(draw, 10);
    if (Number.isNaN(validatedDraw) || validatedDraw < 0) {
      throw new Error('Invalid draw parameter: must be a non-negative integer');
    }

    // Validate order parameters
    const validatedOrder = validateOrder(order, columns);

    // Build order by clause
    let orderByClause = '';
    if (validatedOrder && validatedOrder.length > 0) {
      const orderByConditions = validatedOrder.map((orderItem) => {
        let columnName = columns[orderItem.column];
        let dir = orderItem.dir === 'asc' ? 'ASC' : 'DESC';
        return columnName + ' ' + dir;
      });
      orderByClause = 'ORDER BY ' + orderByConditions.join(', ');
    }

    // Validate boolean flags
    const validatedShowCoreMembers = !!showCoreMembers;
    const validatedShowNonPutativeMembers = !!showNonPutativeMembers;

    // Validate search builder criteria
    const validatedCriteria = searchBuilder && searchBuilder.criteria ? 
      validateSearchBuilderCriteria(searchBuilder.criteria, columns) : [];

    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    // Process search builder criteria
    for (const criteria of validatedCriteria) {
      const { origData, condition, value, value1 } = criteria;

      switch (condition) {
        case '=':
        case '!=':
        case '<':
        case '>':
        case '<=':
        case '>=':
          whereClauses.push(`${origData} ${condition} $${paramIndex}`);
          params.push(value);
          paramIndex++;
          break;
        case 'between':
        case 'not between':
          whereClauses.push(`${origData} ${condition.toUpperCase()} $${paramIndex} AND $${paramIndex + 1}`);
          params.push(value, value1);
          paramIndex += 2;
          break;
        case 'contains':
          whereClauses.push(`${origData} LIKE $${paramIndex}`);
          params.push(`%${value}%`);
          paramIndex++;
          break;
        case '!contains':
          whereClauses.push(`${origData} NOT LIKE $${paramIndex}`);
          params.push(`%${value}%`);
          paramIndex++;
          break;
        case 'starts':
          whereClauses.push(`${origData} LIKE $${paramIndex}`);
          params.push(`${value}%`);
          paramIndex++;
          break;
        case '!starts':
          whereClauses.push(`${origData} NOT LIKE $${paramIndex}`);
          params.push(`${value}%`);
          paramIndex++;
          break;
        case 'ends':
          whereClauses.push(`${origData} LIKE $${paramIndex}`);
          params.push(`%${value}`);
          paramIndex++;
          break;
        case '!ends':
          whereClauses.push(`${origData} NOT LIKE $${paramIndex}`);
          params.push(`%${value}`);
          paramIndex++;
          break;
        case 'null':
          whereClauses.push(`${origData} IS NULL`);
          break;
        case '!null':
          whereClauses.push(`${origData} IS NOT NULL`);
          break;
      }
    }

    // Add GCF filter
    if (validatedGcfId) {
      whereClauses.push(`regions.bigslice_gcf_id = $${paramIndex}`);
      params.push(validatedGcfId);
      paramIndex++;
    }

    // Add samples filter
    if (validatedSamples && validatedSamples.length > 0) {
      let placeholders = validatedSamples.map((_, idx) => `$${paramIndex + idx}`).join(', ');
      whereClauses.push(`assembly IN (${placeholders})`);
      params.push(...validatedSamples);
      paramIndex += validatedSamples.length;
    }

    // Add core members filter
    if (validatedShowCoreMembers) {
      whereClauses.push('gcf_from_search = false');
    }

    // Add non-putative members filter
    if (validatedShowNonPutativeMembers) {
      whereClauses.push('membership_value < 0.405');
    }

    // Build where clause
    let whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    // Define join clause
    const joinClause = 'FROM regions LEFT JOIN regions_taxonomy USING (region_id) LEFT JOIN taxdump_map ON regions_taxonomy.tax_id = taxdump_map.tax_id';

    // Count queries
    let totalCountQuery = `SELECT COUNT(*) ${joinClause}`;
    let filterCountQuery = `SELECT COUNT(*) ${joinClause} ${whereClause}`;

    // Execute count queries
    const totalCountResult = await pool.query(totalCountQuery);
    const filterCountResult = await pool.query(filterCountQuery, params);

    // Build data query with pagination
    let dataParams = params.slice();
    const limitPlaceholder = `$${dataParams.length + 1}`;
    dataParams.push(validatedLength);
    const offsetPlaceholder = `$${dataParams.length + 1}`;
    dataParams.push(validatedStart);

    const sql = `SELECT regions.*, taxdump_map.name AS taxon_name
      FROM regions
      LEFT JOIN regions_taxonomy USING (region_id)
      LEFT JOIN taxdump_map ON regions_taxonomy.tax_id = taxdump_map.tax_id
      ${whereClause} ${orderByClause} LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder};`;

    // Execute data query
    const { rows } = await pool.query(sql, dataParams);

    // Return results in DataTables format
    return {
      draw: validatedDraw,
      recordsTotal: totalCountResult.rows[0].count,
      recordsFiltered: filterCountResult.rows[0].count,
      data: rows
    };
  } catch (error) {
    logger.error('Error getting BGC table:', error);
    throw error;
  }
}

/**
 * Get taxonomic counts for the top 15 genera and "Others"
 * @param {number|null} gcfId - The GCF ID to filter by (optional)
 * @param {string[]|null} samples - Array of sample IDs to filter by (optional)
 * @returns {Promise<Array>} - Array of taxonomic counts
 */
async function getTaxonomicCounts(gcfId = null, samples = null) {
  try {
    // Validate inputs
    const validatedGcfId = validateGcfId(gcfId);
    const validatedSamples = validateSamples(samples);

    const params = [];
    const where = [];                 // filters applied to region_genus

    /* 1. optional GCF filter --------------------------------------- */
    if (validatedGcfId !== null) {
      where.push(`bigslice_gcf_id = $${params.length + 1}`);
      params.push(validatedGcfId);
    }

    /* 2. optional assembly filter ---------------------------------- */
    if (validatedSamples && validatedSamples.length) {
      const ph = validatedSamples.map((_, i) => `$${params.length + i + 1}`).join(', ');
      where.push(`assembly IN (${ph})`);
      params.push(...validatedSamples);
    }

    const wc = where.length ? `WHERE ${where.join(' AND ')}` : '';

    /* 3. fast genus count using materialised view ------------------ */
    const sql = `
      WITH ranked AS (
        SELECT
          genus_name                             AS taxon,
          COUNT(*)                               AS count,
        ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) AS rn
      FROM region_genus
        ${wc}
      GROUP BY genus_name
        ),
        top_15 AS (
      SELECT taxon, count, 0 AS is_others      -- flag = 0
      FROM   ranked
      WHERE  rn <= 15
        ),
        others AS (
      SELECT 'Others' AS taxon,
        COALESCE(SUM(count), 0) AS count,
        1 AS is_others          -- flag = 1
      FROM   ranked
      WHERE  rn > 15
        )
      SELECT taxon, count
      FROM (
             SELECT * FROM top_15
             UNION ALL
             SELECT * FROM others
           ) AS final
      ORDER BY is_others, count DESC;
    `;

    const { rows } = await pool.query(sql, params);
    return rows;
  } catch (err) {
    logger.error('Error getting taxonomic counts:', err);
    throw err;
  }
}

module.exports = {
  getBgcInfo,
  getProductCategoryCounts,
  getGcfCategoryCounts,
  getProductCounts,
  getGcfCountHistogram,
  getGcfTableSunburst,
  getGcfTable,
  getBgcTable,
  getTaxonomicCounts
};
