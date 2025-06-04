var express = require('express');
var router = express.Router();
const client = require('./db');
const pug = require('pug');
const bodyParser = require('body-parser');
const multer = require('multer'); // For handling file uploads
const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('child_process');
var sitemap = require('express-sitemap');

require('dotenv').config();
const { Pool } = require('pg');


const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  // ssl: process.env.NODE_ENV === 'production' ? true : {
  //   rejectUnauthorized: false
  // },
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('map', { title: 'BGC-Atlas' });
});

router.get('/map', (req, res) => {
  res.render('map', );
});

router.get('/samples', (req, res) => {
  res.render('samples', );
});

router.get('/bgcs', (req, res) => {
  res.render('bgcs', );
});

router.get('/gcfs', (req, res) => {
  res.render('gcfs', );
});

router.get('/search-old', (req, res) => {
  res.render('search', );
});

router.get('/search', (req, res) => {
  res.render('search2', );
});

router.get('/imprint', (req, res) => {
  res.render('imprint', );
});

router.get('/privacy', (req, res) => {
  res.render('privacy', );
});

router.get('/antismash', (req, res) => {
  console.log("dataset:" + req.query.dataset);
  res.render('antismash', {dataset: req.query.dataset, anchor:req.query.anchor});
});

router.get('/downloads', (req, res) => {
  res.render('downloads', );
});

router.get('/about', (req, res) => {
  res.render('about', );
});

var map = sitemap({
  generate: router,
  http: 'https',
  url: process.env.APP_URL
});


// Middleware to parse JSON and URL-encoded form data
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

// // Middleware to handle file uploads (adjust the storage options as needed)
// const storage = multer.memoryStorage(); // Store files in memory
// const upload = multer({ storage: storage });

function createTimestampedDirectory(basePath) {
  const timestamp = Date.now();
  const dirPath = path.join(basePath, timestamp.toString());
  fs.ensureDirSync(dirPath);
  return dirPath;
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create the upload directory once per request
    if (!req.uploadDir) {
      const baseUploadPath = '/ceph/ibmi/tgm/bgc-atlas/search/uploads';
      req.uploadDir = createTimestampedDirectory(baseUploadPath);
    }
    cb(null, req.uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original filename
  }
});

const upload = multer({ storage: storage }).array('file', 20); // Limit to 20 files

let clients = [];

// SSE route
router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res
  };
  clients.push(newClient);

  req.on('close', () => {
    clients = clients.filter(client => client.id !== clientId);
  });
});

// Function to send events to clients
function sendEvent(message) {
  clients.forEach(client => client.res.write(`data: ${JSON.stringify(message)}\n\n`));
}


router.post('/upload', (req, res) => {
  sendEvent({ status: 'Uploading' });

  upload(req, res, (err) => {
    if (err) {
      sendEvent({ status: 'Error', message: err.message });
      return res.status(500).json({ error: err.message });
    }

    sendEvent({ status: 'Running' });

    // Process files and generate results here
    const files = req.files.map(file => ({
      name: file.originalname,
      id: file.filename,
      value: 'Sample Value', // Replace with actual logic
      path: path.relative('/ceph/ibmi/tgm/bgc-atlas/search/uploads', file.path) // Relative path to the file
    }));

    const uploadDir = req.uploadDir;

    // Execute the script
    const scriptPath = '/ceph/ibmi/tgm/bgc-atlas/search/bigslice.sh';
    const scriptArgs = [uploadDir];

    console.log('Running script:', scriptPath, scriptArgs);

    const scriptProcess = spawn('bash', [scriptPath, ...scriptArgs]);

    let scriptOutput = '';

    scriptProcess.stdout.on('data', (data) => {
      scriptOutput += data.toString();
    });

    scriptProcess.stderr.on('data', (data) => {
      console.error(`Script stderr: ${data}`);
      scriptOutput += data.toString();
    });

    scriptProcess.on('close', (code) => {
      console.log("close, sriptOutput: ", scriptOutput);
      if (code !== 0) {
        sendEvent({ status: 'Error', message: `Script exited with code ${code}`, output: scriptOutput });
        return res.status(500).json({ error: `Script exited with code ${code}`, output: scriptOutput });
      }

      const regex = /^gcf_membership.*/gm;
      const matches = scriptOutput.match(regex);

      if (!matches) {
        sendEvent({ status: 'Error', message: 'No membership lines found' });
        return res.status(500).json({ error: 'No membership lines found' });
      }

      console.log(matches);

      const records = [];

      matches.forEach((line) => {
        const splitArray = line.substring(line.indexOf("\t") + 1).trim().split("|");

        const record = {
          bgc_name: splitArray[6],
          gcf_id: splitArray[7],
          membership_value: splitArray[8]
        };

        records.push(record);
      });

      console.log(records);
      sendEvent({ status: 'Complete', records: records });
      res.json(records);
    });
  });
});

router.get('/sitemap.xml', function (req,res) {
  map.XMLtoWeb(res);
}).get('/robots.txt', function (req, res) {
  map.TXTtoWeb(res);
});

//EXPERIMENTAL

router.get('/body', (req, res) => {
  res.render('body', );
  // map.XMLtoWeb(res);
});

router.get('/test', (req, res) => {
  res.render('test', );
});

router.get('/map-data-gcf', (req, res) => {
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
  if (req.query.gcf) {
    let bigslice_gcf_id = parseInt(req.query.gcf, 10);
    if (isNaN(bigslice_gcf_id)) {
      return res.status(400).json({ error: 'Invalid gcf parameter' });
    }

    filters.push(`ma.assembly IN (
            SELECT
                assembly
            FROM
                regions
            WHERE
                bigslice_gcf_id = ${bigslice_gcf_id}
        )`);
  }

  // Handle the samples query parameter
  if (req.query.samples) {
    let samples = req.query.samples.split(',').map(sample => `'${sample.trim()}'`).join(', ');
    filters.push(`ma.assembly IN (${samples})`);
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

  // Log the query to debug if needed
  console.log(sql);

  // Execute the query
  client.query(sql, (err, result) => {
    if (err) {
      console.log(sql);
      console.log(err);
      res.status(500).json({ error: 'Database query error' });
    } else {
      res.json(result.rows);
    }
  });
});

router.get('/getBgcId', (req, res) => {
  console.log("getBgcId " + req.query.dataset + " " + req.query.anchor);

  const { dataset, anchor } = req.query;

  // Correct query for PostgreSQL using $1, $2 placeholders
  const query = 'SELECT region_id FROM regions WHERE assembly = $1 AND anchor = $2';

  // Use the correct client.query syntax for PostgreSQL
  client.query(query, [dataset, anchor], (err, result) => {
    if (err) {
      console.log("error:" + err);
      res.status(500).json({ error: "Database query failed" });
      return;
    }

    // Assuming the result.rows is an array with objects that contain the BGC ID
    console.log("result: " + JSON.stringify(result.rows));

    if (result.rows.length > 0) {
      res.json({ bgcId: result.rows[0].region_id });
    } else {
      res.json({ bgcId: 'Not Found' });
    }
  });
});

router.get('/map-data', (req, res) => {
  client.query('WITH geo_data AS (\n' +
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
      '    gd.latitude;', (err, result) => {

    var rows = JSON.parse(JSON.stringify(result.rows));
    console.log("rows length: " + rows.length);
    res.json(rows);
  });
});

router.get('/body-map-data', (req, res) => {
  console.log("querying body map data");
  client.query('SELECT sample, meta_value\n' +
      'FROM sample_metadata\n' +
      'WHERE meta_key = \'body site\'\n' +
      'GROUP BY sample, meta_value;', (err, result) => {

    var rows = JSON.parse(JSON.stringify(result.rows));
    res.json(rows);
  });
});

router.get('/filter/:column', (req, res) => {
  client.query('SELECT \n' +
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
      '    AND sm3.meta_key = \'' + req.params.column +'\' AND sm3.meta_value IS NOT NULL;\n', (err, result) => {

    var rows = JSON.parse(JSON.stringify(result.rows));
    res.json(rows);
  })
});

router.get('/column-values/:column', (req, res) => {
  const column = req.params.column;

  client.query('SELECT DISTINCT meta_value\n' +
      'FROM sample_metadata\n' +
      'WHERE meta_key = \''+ column + '\'' +
      'ORDER BY meta_value ASC', (err, result) => {
    if(err) {
      console.log(err);
    }
    var possibleValues = JSON.parse(JSON.stringify(result.rows));
    res.json(possibleValues);
  });
});

router.get('/sample-info', (req, res) => {
  client.query('SELECT\n' +
      '    (SELECT COUNT(*) FROM mgnify_asms) AS "sample_count",\n' +
      '    (SELECT COUNT(*) FROM antismash_runs WHERE status = \'success\') AS "success",\n' +
      '    (SELECT COUNT(*) FROM antismash_runs WHERE status = \'runningAS\') AS "running",\n' +
      '    (SELECT COUNT(*) FROM protoclusters) AS protoclusters,\n' +
      '    (SELECT COUNT(*) FROM protoclusters WHERE contig_edge = \'False\') AS complbgcscount', (err, result) => {
    if(err){
      console.log(err);
    }
    var sampleInfo = JSON.parse(JSON.stringify(result.rows));
    res.json(sampleInfo);
  });
});

router.get('/sample-data', async (req, res) => {
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
    res.json({ data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/sample-data-2', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT ar.status, ma.sampleacc, ma.assembly, ma.submittedseqs, COUNT(pc.assembly) AS protocluster_count,\n' +
        '       ma.longitude, ma.latitude, ma.envbiome, ma.envfeat, ma.collectdate, ma.biosample, ma.species, ma.hosttaxid\n' +
        'FROM atlas.public.antismash_runs ar\n' +
        '         INNER JOIN atlas.public.mgnify_asms ma ON ar.assembly = ma.assembly\n' +
        '         LEFT JOIN atlas.public.protoclusters pc ON ma.assembly = pc.assembly\n' +
        'GROUP BY ar.status, ma.sampleacc, ma.assembly, ma.submittedseqs, ma.longitude, ma.latitude, ma.envbiome,\n' +
        '         ma.envfeat, ma.collectdate, ma.biosample, ma.species, ma.hosttaxid\n' +
        'ORDER BY ar.status;');
    res.json({ data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/bgc-info', (req, res) => {
  let sql = `
    SELECT
        (SELECT COUNT(*) FROM regions) AS bgc_count,
        (SELECT COUNT(*) FROM antismash_runs WHERE status = 'success') AS success_count,
        (SELECT COUNT(DISTINCT gcf_id) FROM bigslice_gcf_membership) AS gcf_count,
        ROUND(
            CAST((SELECT COUNT(*) FROM regions) AS NUMERIC) /
            (SELECT COUNT(*) FROM antismash_runs WHERE status = 'success'),
            2
        ) AS meanbgcsamples,
        ROUND(
            (SELECT COUNT(*) FROM bigslice_gcf_membership) /
            CAST((SELECT COUNT(DISTINCT gcf_id) FROM bigslice_gcf_membership) AS NUMERIC),
            2
        ) AS meanbgc,
        (SELECT COUNT(*) FROM regions WHERE gcf_from_search = false) AS core_count,
        (SELECT COUNT(*) FROM regions WHERE membership_value < 0.405) AS non_putative_count
  `;

  let params = [];
  let whereClause = [];

  // Handle the gcf query parameter
  if (req.query.gcf) {
    let bigslice_gcf_id = parseInt(req.query.gcf, 10);
    if (isNaN(bigslice_gcf_id)) {
      return res.status(400).json({ error: 'Invalid gcf parameter' });
    }

    whereClause.push(`bigslice_gcf_id = $1`);
    params.push(bigslice_gcf_id);
  }

  // Handle the samples query parameter
  if (req.query.samples) {
    let samples = req.query.samples.split(',').map(sample => sample.trim());
    whereClause.push(`assembly IN (${samples.map((_, idx) => `$${params.length + idx + 1}`).join(', ')})`);
    params.push(...samples);
  }

  // Adjust the SQL query if filters are applied
  if (whereClause.length > 0) {
    sql = `
      WITH
        bgc AS (
          SELECT COUNT(*) AS count
          FROM regions
          WHERE ${whereClause.join(' AND ')}
        ),
        success AS (
          SELECT COUNT(*) AS count
          FROM antismash_runs
          WHERE status = 'success'
          AND assembly IN (
            SELECT assembly
            FROM regions
            WHERE ${whereClause.join(' AND ')}
          )
        ),
        gcf AS (
          SELECT COUNT(DISTINCT gcf_id) AS count
          FROM bigslice_gcf_membership
          WHERE gcf_id IN (
            SELECT bigslice_gcf_id
            FROM regions
            WHERE ${whereClause.join(' AND ')}
          )
        ),
        core AS (
          SELECT COUNT(*) AS count
          FROM regions
          WHERE gcf_from_search = false
          AND ${whereClause.join(' AND ')}
        ),
        non_putative AS (
          SELECT COUNT(*) AS count
          FROM regions
          WHERE membership_value < 0.405
          AND ${whereClause.join(' AND ')}
        )
      SELECT
        bgc.count AS bgc_count,
        success.count AS success_count,
        gcf.count AS gcf_count,
        ROUND(bgc.count::NUMERIC / NULLIF(success.count, 0), 2) AS meanbgcsamples,
        ROUND(bgc.count / NULLIF(gcf.count::NUMERIC, 0), 2) AS meanbgc,
        core.count AS core_count,
        non_putative.count AS non_putative_count
      FROM bgc, success, gcf, core, non_putative;
    `;
  }

  // Execute the query
  client.query(sql, params, (err, result) => {
    if (err) {
      console.log(sql);
      console.log(err);
      res.status(500).json({ error: 'Database query error' });
    } else {
      const catInfo = JSON.parse(JSON.stringify(result.rows));
      res.json(catInfo);
    }
  });
});

router.get('/pc-category-count', (req, res) => {
  let sql = `
      SELECT ARRAY_TO_STRING(product_categories, '|') AS categories, COUNT(*) AS count
      FROM regions
      GROUP BY categories
      ORDER BY count DESC
  `;

  let params = [];
  let filters = [];

  // If the gcf query parameter is provided, modify the SQL query
  if (req.query.gcf) {
    let bigslice_gcf_id = parseInt(req.query.gcf, 10);
    if (isNaN(bigslice_gcf_id)) {
      return res.status(400).json({ error: 'Invalid gcf parameter' });
    }
    filters.push(`bigslice_gcf_id = $${params.length + 1}`);
    params.push(bigslice_gcf_id);
  }

  // Handle the samples query parameter
  if (req.query.samples) {
    let samples = req.query.samples.split(',').map(sample => sample.trim());
    filters.push(`assembly IN (${samples.map((_, idx) => `$${params.length + idx + 1}`).join(', ')})`);
    params.push(...samples);
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

  client.query(sql, params, (err, result) => {
    if (err) {
      console.log(sql);
      console.log(err);
      res.status(500).json({ error: 'Database query error' });
    } else {
      res.json(result.rows);
    }
  });
});
router.get('/gcf-category-count', (req, res) => {
  client.query('SELECT bgc_type, COUNT(DISTINCT family_number) as unique_families\n' +
      'FROM atlas.public.bigscape_clustering\n' +
      'WHERE clustering_threshold = 0.3\n' +
      'GROUP BY bgc_type\n' +
      'ORDER BY unique_families DESC;;', (err, result) => {
    if(err){
      console.log(err);
    }
    var catInfo = JSON.parse(JSON.stringify(result.rows));
    res.json(catInfo);
  });
});

router.get('/pc-product-count', (req, res) => {
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
  if (req.query.gcf) {
    let bigslice_gcf_id = parseInt(req.query.gcf, 10);
    if (isNaN(bigslice_gcf_id)) {
      return res.status(400).json({ error: 'Invalid gcf parameter' });
    }
    filters.push(`bigslice_gcf_id = $${params.length + 1}`);
    params.push(bigslice_gcf_id);
  }

  // Handle the samples query parameter
  if (req.query.samples) {
    let samples = req.query.samples.split(',').map(sample => sample.trim());
    filters.push(`assembly IN (${samples.map((_, idx) => `$${params.length + idx + 1}`).join(', ')})`);
    params.push(...samples);
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

  // Execute the query
  client.query(sql, params, (err, result) => {
    if (err) {
      console.log(sql);
      console.log(err);
      res.status(500).json({ error: 'Database query error' });
    } else {
      res.json(result.rows);
    }
  });
});

router.get('/gcf-count-hist', (req, res) => {
  let sql = 'WITH max_row_count AS (\n' +
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
  client.query(sql, (err, result) => {
    if(err){
      console.log(sql);
      console.log(err);
    }
    var bgcInfo = JSON.parse(JSON.stringify(result.rows));
    res.json(bgcInfo);
  });
});

router.get('/gcf-table-sunburst', (req, res) => {
  let sql = `
    SELECT longest_biome, COUNT(longest_biome)
    FROM regions
    WHERE longest_biome IS NOT NULL
  `;

  let params = [];
  let filters = [];

  // Handle the gcf query parameter
  if (req.query.gcf) {
    let bigslice_gcf_id = parseInt(req.query.gcf, 10);
    if (isNaN(bigslice_gcf_id)) {
      return res.status(400).json({ error: 'Invalid gcf parameter' });
    }
    filters.push(`bigslice_gcf_id = $${params.length + 1}`);
    params.push(bigslice_gcf_id);
  }

  // Handle the samples query parameter
  if (req.query.samples) {
    let samples = req.query.samples.split(',').map(sample => `'${sample.trim()}'`).join(', ');
    filters.push(`assembly IN (${samples})`);
  }

  // If there are filters, append them to the SQL query
  if (filters.length > 0) {
    sql += ` AND ${filters.join(' AND ')}`;
  }

  sql += ` GROUP BY longest_biome`;

  // Log the query for debugging
  console.log(sql);

  client.query(sql, params, (err, result) => {
    if (err) {
      console.log(sql);
      console.log(err);
      res.status(500).json({ error: 'Database query error' });
    } else {
      res.json(result.rows);
    }
  });
});

router.get('/gcf-table', async (req, res) => {
  try {
    const sql = 'SELECT * FROM bigslice_gcf';
    const { rows } = await pool.query(sql);
    console.log(sql);
    res.json({ data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


router.get('/bgc-table', async (req, res) => {
  const gcf = req.query.gcf;
  const samples = req.query.samples;
  const showCoreMembers = req.query.showCoreMembers === 'true'; // Check if "showCoreMembers" is true
  const showNonPutativeMembers = req.query.showNonPutativeMembers === 'true';
  const draw = req.query.draw;
  const start = parseInt(req.query.start);
  const length = parseInt(req.query.length);
  const searchValue = req.query.search.value;
  console.log("search: " + searchValue);


  const order = req.query.order || [];
  const columns = ['region_id', 'assembly', 'product_categories', 'products', 'longest_biome', 'start', 'bigslice_gcf_id', 'membership_value',
    'contig_edge', 'contig_name', 'region_num'];
  let orderByClause = '';
  if(order.length > 0) {
    const orderByConditions = order.map((order) => {
      let columnName = columns[parseInt(order.column)];
      let dir = order.dir === 'asc' ? 'ASC' : 'DESC';
      return columnName + ' ' + dir;
    });
    orderByClause = 'ORDER BY ' + orderByConditions.join(', ');
  }

  // Log the structure of searchBuilderParams
  console.log('Search Builder Params:', req.query.searchBuilder);


  let whereClauses = [];

  if(req.query.searchBuilder) {
    console.log("Criteria: " + JSON.stringify(req.query.searchBuilder.criteria))
    req.query.searchBuilder.criteria.forEach((criteria) => {
      let data = criteria.origData;
      let condition = criteria.condition;
      let value = criteria.value;
      let value1 = criteria.value1;

      if(condition == '=') {
        whereClauses.push(data + ' = \'' + value + '\'');
      } else if (condition == '!=') {
        whereClauses.push(data + ' != \'' + value + '\'');
      } else if (condition == '<') {
        whereClauses.push(data + ' < \'' + value + '\'');
      } else if (condition == '>') {
        whereClauses.push(data + ' > \'' + value + '\'');
      } else if (condition == '<=') {
        whereClauses.push(data + ' <= \'' + value + '\'');
      } else if (condition == '>=') {
        whereClauses.push(data + ' >= \'' + value + '\'');
      } else if (condition == 'between') {
        whereClauses.push(data + ' BETWEEN \'' + value + '\' AND \'' + value1 + '\'');
      } else if (condition == 'not between') {
        whereClauses.push(data + ' NOT BETWEEN \'' + value + '\' AND \'' + value1 + '\'');
      } else if (condition == 'contains') {
        whereClauses.push(data + ' LIKE \'%' + value + '%\'');
      } else if (condition == '!contains') {
        whereClauses.push(data + ' NOT LIKE \'%' + value + '%\'');
      } else if (condition == 'starts') {
        whereClauses.push(data + ' LIKE \'' + value + '%\'');
      } else if (condition == '!starts') {
        whereClauses.push(data + ' NOT LIKE \'' + value + '%\'');
      } else if (condition == 'ends') {
        whereClauses.push(data + ' LIKE \'%' + value + '\'');
      } else if (condition == '!ends') {
        whereClauses.push(data + ' NOT LIKE \'%' + value + '\'');
      } else if (condition == 'null') {
        whereClauses.push(data + ' IS NULL');
      } else if (condition == '!null') {
        whereClauses.push(data + ' IS NOT NULL');
      }
    });
  }

  console.log("gcf: " + gcf);
  if(gcf) {
    whereClauses.push('bigslice_gcf_id = ' + gcf);
  }
  if (samples) {
    // Split the samples string into an array, and wrap each sample in single quotes
    let sampleList = samples.split(',').map(sample => `'${sample.trim()}'`).join(', ');

    // Add the clause with the correctly formatted sample list
    whereClauses.push(`assembly IN (${sampleList})`);
  }

  if(showCoreMembers) {
    whereClauses.push('gcf_from_search = false');
  }

  if(showNonPutativeMembers) {
    whereClauses.push('membership_value < 0.405');
  }

  console.log("where clauses: " + whereClauses);

  let whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

  let totalCountQuery = 'SELECT COUNT(*) FROM regions ' + whereClause;
  let filterCountQuery = 'SELECT COUNT(*) FROM regions ' + whereClause;

  console.log(totalCountQuery + "\t" + filterCountQuery);

  try {

    const totalCountResult = await pool.query(totalCountQuery);
    const filterCountResult = await pool.query(filterCountQuery);

    console.log("total count: " + totalCountResult.rows[0].count);
    console.log("filter count: " + filterCountResult.rows[0].count);

    const sql = 'SELECT * FROM regions ' + whereClause + ' ' + orderByClause + ' LIMIT ' + length + ' OFFSET ' + start + ';';
    console.log("query: " + sql);
    const { rows } = await pool.query(sql);

    res.json({
      draw: draw,
      recordsTotal: totalCountResult.rows[0].count,
      recordsFiltered: filterCountResult.rows[0].count,
      data: rows
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }

});

function getMembership(reportId, callback) {
  const { spawn } = require('child_process');

  const query = `SELECT * FROM gcf_membership;`;

  console.log("query: " + query);

  const getReportIdProc = spawn('sqlite3', [
    '/vol/compl_bgcs_bigslice_def_t300/reports/' + reportId + '/data.db',
    query
  ]);

  let membershipString = '';

  getReportIdProc.stderr.on('data', function(data) {
    console.log(data.toString());
  });

  getReportIdProc.stdout.on('data', function(data) {
    console.log('membership string: ' + data.toString());
    membershipString = data.toString();
  });

  getReportIdProc.on('close', function(code) {
    if (code === 0) {
      console.log('SQLite process exited successfully.');
      console.log("membership: " + membershipString);
      callback(null, membershipString);
    } else {
      console.error(`SQLite process exited with code ${code}.`);
      callback(`SQLite process exited with code ${code}`, null);
    }
  });
}

module.exports = router;
