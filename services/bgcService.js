const { pool } = require('../config/database');
const cacheService = require('./cacheService');
const debug = require('debug')('bgc-atlas:bgcService');

/**
 * Get BGC information including counts of BGCs, success runs, GCFs, etc.
 * @param {number|null} gcfId - The GCF ID to filter by (optional)
 * @param {string[]|null} samples - Array of sample IDs to filter by (optional)
 * @returns {Promise<Array>} - Array of BGC information
 */
async function getBgcInfo(gcfId = null, samples = null) {
  const cacheKey = `bgcInfo_${gcfId || 'null'}_${samples ? (Array.isArray(samples) ? samples.join(',') : samples) : 'null'}`;

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
      if (gcfId) {
        const id = Number.parseInt(gcfId, 10);
        if (Number.isNaN(id)) throw new Error('Invalid gcf parameter');
        where.push(`regions.bigslice_gcf_id = $${params.length + 1}`);
        params.push(id);
      }

      /* ────────────
         3. samples filter
         ──────────── */
      if (samples && samples.length) {
        const sampleArr = Array.isArray(samples)
            ? samples
            : samples.split(',').map(s => s.trim());

        const placeholders = sampleArr
            .map((_, idx) => `$${params.length + idx + 1}`)
            .join(', ');

        where.push(`assembly IN (${placeholders})`);
        params.push(...sampleArr);
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
      console.error('Error getting BGC info:', err);
      throw err;
    }
  }, 3600); // cache 1 h
}

/**
 * Get product category counts
 * @param {number|null} gcfId - The GCF ID to filter by (optional)
 * @param {string[]|null} samples - Array of sample IDs to filter by (optional)
 * @returns {Promise<Array>} - Array of product category counts
 */
async function getProductCategoryCounts(gcfId = null, samples = null) {
  try {
    let sql = `
        SELECT ARRAY_TO_STRING(product_categories, '|') AS categories, COUNT(*) AS count
        FROM regions
        GROUP BY categories
        ORDER BY count DESC
    `;

    let params = [];
    let filters = [];

    // If the gcf query parameter is provided, modify the SQL query
    if (gcfId) {
      let bigslice_gcf_id = parseInt(gcfId, 10);
      if (isNaN(bigslice_gcf_id)) {
        throw new Error('Invalid gcf parameter');
      }
      filters.push(`bigslice_gcf_id = $${params.length + 1}`);
      params.push(bigslice_gcf_id);
    }

    // Handle the samples query parameter
    if (samples && samples.length > 0) {
      let samplesArray = Array.isArray(samples) ? samples : samples.split(',').map(sample => sample.trim());
      filters.push(`assembly IN (${samplesArray.map((_, idx) => `$${params.length + idx + 1}`).join(', ')})`);
      params.push(...samplesArray);
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
    console.error('Error getting product category counts:', error);
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
      console.error('Error getting GCF category counts:', error);
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
    if (gcfId) {
      let bigslice_gcf_id = parseInt(gcfId, 10);
      if (isNaN(bigslice_gcf_id)) {
        throw new Error('Invalid gcf parameter');
      }
      filters.push(`bigslice_gcf_id = $${params.length + 1}`);
      params.push(bigslice_gcf_id);
    }

    // Handle the samples query parameter
    if (samples && samples.length > 0) {
      let samplesArray = Array.isArray(samples) ? samples : samples.split(',').map(sample => sample.trim());
      filters.push(`assembly IN (${samplesArray.map((_, idx) => `$${params.length + idx + 1}`).join(', ')})`);
      params.push(...samplesArray);
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
    console.error('Error getting product counts:', error);
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
      console.error('Error getting GCF count histogram:', error);
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
    let sql = `
      SELECT longest_biome, COUNT(longest_biome)
      FROM regions
      WHERE longest_biome IS NOT NULL
    `;

    let params = [];
    let filters = [];

    // Handle the gcf query parameter
    if (gcfId) {
      let bigslice_gcf_id = parseInt(gcfId, 10);
      if (isNaN(bigslice_gcf_id)) {
        throw new Error('Invalid gcf parameter');
      }
      filters.push(`bigslice_gcf_id = $${params.length + 1}`);
      params.push(bigslice_gcf_id);
    }

    // Handle the samples query parameter
    if (samples && samples.length > 0) {
      let samplesArray = Array.isArray(samples) ? samples : samples.split(',').map(sample => sample.trim());
      filters.push(`assembly IN (${samplesArray.map((_, idx) => `$${params.length + idx + 1}`).join(', ')})`);
      params.push(...samplesArray);
    }

    // If there are filters, append them to the SQL query
    if (filters.length > 0) {
      sql += ` AND ${filters.join(' AND ')}`;
    }

    sql += ` GROUP BY longest_biome`;

    const result = await pool.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Error getting GCF table sunburst:', error);
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
      draw   = 1,
      start  = 0,
      length = 10,
      order  = []
    } = options;

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
    if (order.length) {
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
      orderByClause =
          'ORDER BY ' +
          order
              .map(({ column, dir }) =>
                  `${selectable[Number(column)]} ${dir === 'asc' ? 'ASC' : 'DESC'}`
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
        paginatedSQL.replace('$1', length).replace('$2', start)
    );

    /* ───────────────
       Execute queries
       ─────────────── */
    const countRes = await pool.query('SELECT COUNT(*) FROM bigslice_gcf;');
    const recordsTotal = Number(countRes.rows[0].count);

    const { rows } = await pool.query(paginatedSQL, [length, start]);

    /* ──────────────────────
       Return DataTables shape
       ────────────────────── */
    return {
      draw: Number(draw),
      recordsTotal,
      recordsFiltered: recordsTotal, // no additional filtering yet
      data: rows
    };
  } catch (err) {
    console.error('Error getting GCF table:', err);
    throw err;
  }
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

    const columns = ['region_id', 'assembly', 'taxon_name', 'product_categories', 'products', 'longest_biome', 'start', 'bigslice_gcf_id', 'membership_value',
      'contig_edge', 'contig_name', 'region_num'];

    let orderByClause = '';
    if (order && order.length > 0) {
      const orderByConditions = order.map((order) => {
        let columnName = columns[parseInt(order.column)];
        let dir = order.dir === 'asc' ? 'ASC' : 'DESC';
        return columnName + ' ' + dir;
      });
      orderByClause = 'ORDER BY ' + orderByConditions.join(', ');
    }

    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    if (searchBuilder && searchBuilder.criteria) {
      const allowedConditions = new Set([
        '=', '!=', '<', '>', '<=', '>=',
        'between', 'not between',
        'contains', '!contains',
        'starts', '!starts',
        'ends', '!ends',
        'null', '!null'
      ]);

      searchBuilder.criteria.forEach((criteria) => {
        const data = criteria.origData;
        const condition = criteria.condition;
        const value = criteria.value;
        const value1 = criteria.value1;

        if (!columns.includes(data) || !allowedConditions.has(condition)) {
          return;
        }

        switch (condition) {
          case '=':
          case '!=':
          case '<':
          case '>':
          case '<=':
          case '>=':
            whereClauses.push(`${data} ${condition} $${paramIndex}`);
            params.push(value);
            paramIndex++;
            break;
          case 'between':
          case 'not between':
            whereClauses.push(`${data} ${condition.toUpperCase()} $${paramIndex} AND $${paramIndex + 1}`);
            params.push(value, value1);
            paramIndex += 2;
            break;
          case 'contains':
            whereClauses.push(`${data} LIKE $${paramIndex}`);
            params.push(`%${value}%`);
            paramIndex++;
            break;
          case '!contains':
            whereClauses.push(`${data} NOT LIKE $${paramIndex}`);
            params.push(`%${value}%`);
            paramIndex++;
            break;
          case 'starts':
            whereClauses.push(`${data} LIKE $${paramIndex}`);
            params.push(`${value}%`);
            paramIndex++;
            break;
          case '!starts':
            whereClauses.push(`${data} NOT LIKE $${paramIndex}`);
            params.push(`${value}%`);
            paramIndex++;
            break;
          case 'ends':
            whereClauses.push(`${data} LIKE $${paramIndex}`);
            params.push(`%${value}`);
            paramIndex++;
            break;
          case '!ends':
            whereClauses.push(`${data} NOT LIKE $${paramIndex}`);
            params.push(`%${value}`);
            paramIndex++;
            break;
          case 'null':
            whereClauses.push(`${data} IS NULL`);
            break;
          case '!null':
            whereClauses.push(`${data} IS NOT NULL`);
            break;
        }
      });
    }

    if (gcf) {
      let gcfIdNum = parseInt(gcf, 10);
      if (isNaN(gcfIdNum)) {
        throw new Error('Invalid gcf parameter');
      }
      whereClauses.push(`regions.bigslice_gcf_id = $${paramIndex}`);
      params.push(gcfIdNum);
      paramIndex++;
    }

    if (samples) {
      let samplesArray = Array.isArray(samples) ? samples : samples.split(',').map(sample => sample.trim());
      let placeholders = samplesArray.map((_, idx) => `$${paramIndex + idx}`).join(', ');
      whereClauses.push(`assembly IN (${placeholders})`);
      params.push(...samplesArray);
      paramIndex += samplesArray.length;
    }

    if (showCoreMembers) {
      whereClauses.push('gcf_from_search = false');
    }

    if (showNonPutativeMembers) {
      whereClauses.push('membership_value < 0.405');
    }

    let whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const joinClause = 'FROM regions LEFT JOIN regions_taxonomy USING (region_id) LEFT JOIN taxdump_map ON regions_taxonomy.tax_id = taxdump_map.tax_id';

    let totalCountQuery = `SELECT COUNT(*) ${joinClause}`;
    let filterCountQuery = `SELECT COUNT(*) ${joinClause} ${whereClause}`;

    const totalCountResult = await pool.query(totalCountQuery);
    const filterCountResult = await pool.query(filterCountQuery, params);

    let dataParams = params.slice();
    const limitPlaceholder = `$${dataParams.length + 1}`;
    dataParams.push(length);
    const offsetPlaceholder = `$${dataParams.length + 1}`;
    dataParams.push(start);
    const sql = `SELECT regions.*, taxdump_map.name AS taxon_name
      FROM regions
      LEFT JOIN regions_taxonomy USING (region_id)
      LEFT JOIN taxdump_map ON regions_taxonomy.tax_id = taxdump_map.tax_id
      ${whereClause} ${orderByClause} LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder};`;
    const { rows } = await pool.query(sql, dataParams);

    return {
      draw: draw,
      recordsTotal: totalCountResult.rows[0].count,
      recordsFiltered: filterCountResult.rows[0].count,
      data: rows
    };
  } catch (error) {
    console.error('Error getting BGC table:', error);
    throw error;
  }
}

/**
 * Get taxonomic counts for the top 15 genera and "Others"
 * @param gcfId
 * @param samples
 * @returns {Promise<*>}
 */
async function getTaxonomicCounts(gcfId = null, samples = null) {
  try {
    const params = [];
    const where  = [];                 // filters applied to region_genus

    /* 1. optional GCF filter --------------------------------------- */
    if (gcfId !== null && gcfId !== undefined) {
      const id = Number.parseInt(gcfId, 10);
      if (Number.isNaN(id)) throw new Error('Invalid gcf parameter');
      where.push(`bigslice_gcf_id = $${params.length + 1}`);
      params.push(id);
    }

    /* 2. optional assembly filter ---------------------------------- */
    if (samples && samples.length) {
      const list = Array.isArray(samples)
          ? samples
          : samples.split(',').map(s => s.trim());

      const ph = list.map((_, i) => `$${params.length + i + 1}`).join(', ');
      where.push(`assembly IN (${ph})`);
      params.push(...list);
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

    console.debug('Genus-count SQL:', sql, params);
    const { rows } = await pool.query(sql, params);
    return rows;
  } catch (err) {
    console.error('Error getting taxonomic counts:', err);
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
