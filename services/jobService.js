const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Create a new search job
 * @param {string|null} userId - User ID (null for anonymous users)
 * @param {string} uploadDir - Directory where files are uploaded
 * @param {number} fileCount - Number of files uploaded
 * @param {string[]} fileNames - Original file names
 * @returns {Promise<string>} - Job ID
 */
async function createJob(userId, uploadDir, fileCount, fileNames) {
  const jobId = uuidv4();
  const status = 'queued';

  try {
    await pool.query(
      `INSERT INTO search_jobs 
       (job_id, user_id, status, upload_dir, file_count, file_names) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [jobId, userId, status, uploadDir, fileCount, fileNames]
    );

    logger.info(`Created job ${jobId} for user ${userId || 'anonymous'}`);
    return jobId;
  } catch (error) {
    logger.error(`Error creating job: ${error.message}`);
    throw error;
  }
}

/**
 * Update job status
 * @param {string} jobId - Job ID
 * @param {string} status - New status ('queued', 'running', 'completed', 'failed')
 * @returns {Promise<void>}
 */
async function updateJobStatus(jobId, status) {
  try {
    await pool.query(
      `UPDATE search_jobs SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE job_id = $2`,
      [status, jobId]
    );

    logger.info(`Updated job ${jobId} status to ${status}`);
  } catch (error) {
    logger.error(`Error updating job status: ${error.message}`);
    throw error;
  }
}

/**
 * Store search results
 * @param {string} jobId - Job ID
 * @param {Array} results - Array of search results
 * @returns {Promise<void>}
 */
async function storeResults(jobId, results) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const result of results) {
      await client.query(
        `INSERT INTO search_results 
         (job_id, bgc_name, gcf_id, membership_value) 
         VALUES ($1, $2, $3, $4)`,
        [jobId, result.bgc_name, result.gcf_id, result.membership_value]
      );
    }

    await client.query('COMMIT');
    logger.info(`Stored ${results.length} results for job ${jobId}`);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Error storing results: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get job by ID
 * @param {string} jobId - Job ID
 * @returns {Promise<Object|null>} - Job object or null if not found
 */
async function getJob(jobId) {
  try {
    const result = await pool.query(
      'SELECT * FROM search_jobs WHERE job_id = $1',
      [jobId]
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error(`Error getting job: ${error.message}`);
    throw error;
  }
}

/**
 * Get results for a job
 * @param {string} jobId - Job ID
 * @returns {Promise<Array>} - Array of search results
 */
async function getJobResults(jobId) {
  try {
    const result = await pool.query(
      'SELECT * FROM search_results WHERE job_id = $1 ORDER BY membership_value DESC',
      [jobId]
    );

    return result.rows;
  } catch (error) {
    logger.error(`Error getting job results: ${error.message}`);
    throw error;
  }
}

/**
 * Get jobs for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of jobs
 */
async function getUserJobs(userId) {
  try {
    const result = await pool.query(
      'SELECT * FROM search_jobs WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return result.rows;
  } catch (error) {
    logger.error(`Error getting user jobs: ${error.message}`);
    throw error;
  }
}

/**
 * Get next queued job
 * @returns {Promise<Object|null>} - Next queued job or null if none
 */
async function getNextQueuedJob() {
  try {
    const result = await pool.query(
      'SELECT * FROM search_jobs WHERE status = $1 ORDER BY created_at ASC LIMIT 1',
      ['queued']
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error(`Error getting next queued job: ${error.message}`);
    throw error;
  }
}

/**
 * Get all queued jobs
 * @returns {Promise<Array>} - Array of queued jobs
 */
async function getQueuedJobs() {
  try {
    const result = await pool.query(
      'SELECT * FROM search_jobs WHERE status = $1 ORDER BY created_at ASC',
      ['queued']
    );

    return result.rows;
  } catch (error) {
    logger.error(`Error getting queued jobs: ${error.message}`);
    throw error;
  }
}

/**
 * Get all running jobs
 * @returns {Promise<Array>} - Array of running jobs
 */
async function getRunningJobs() {
  try {
    const result = await pool.query(
      'SELECT * FROM search_jobs WHERE status = $1 ORDER BY created_at ASC',
      ['running']
    );

    return result.rows;
  } catch (error) {
    logger.error(`Error getting running jobs: ${error.message}`);
    throw error;
  }
}

/**
 * Get count of completed jobs
 * @returns {Promise<number>} - Count of completed jobs
 */
async function getCompletedJobsCount() {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM search_jobs WHERE status = $1',
      ['completed']
    );

    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    logger.error(`Error getting completed jobs count: ${error.message}`);
    throw error;
  }
}

module.exports = {
  createJob,
  updateJobStatus,
  storeResults,
  getJob,
  getJobResults,
  getUserJobs,
  getNextQueuedJob,
  getQueuedJobs,
  getRunningJobs,
  getCompletedJobsCount
};
