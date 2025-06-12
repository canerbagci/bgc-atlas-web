const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const jobService = require('../services/jobService');
const schedulerService = require('../services/schedulerService');
const logger = require('../utils/logger');
const os = require('os');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);

// Admin password - in a real application, this should be stored securely
// and not hardcoded in the source code
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.cookies.adminAuthenticated === 'true') {
    return next();
  }
  res.redirect('/admin/login');
};

// Login page
router.get('/login', (req, res) => {
  res.render('admin/login', { 
    title: 'Admin Login',
    error: req.query.error === 'true' ? 'Invalid password' : null
  });
});

// Login form submission
router.post('/login', (req, res) => {
  const { password } = req.body;

  if (password === ADMIN_PASSWORD) {
    res.cookie('adminAuthenticated', 'true', { 
      httpOnly: true,
      maxAge: 3600000, // 1 hour
      sameSite: 'strict'
    });
    res.redirect('/admin/dashboard');
  } else {
    res.redirect('/admin/login?error=true');
  }
});

// Logout
router.get('/logout', (req, res) => {
  res.clearCookie('adminAuthenticated');
  res.redirect('/admin/login');
});

// Admin dashboard
router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    // Get job queue information
    const queuedJobs = await schedulerService.getQueuedJobs();
    const runningJobs = await jobService.getRunningJobs();
    const completedJobsCount = await jobService.getCompletedJobsCount();

    // Get system performance metrics
    const performanceMetrics = {
      uptime: Math.floor(process.uptime()),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      systemMemory: {
        total: os.totalmem(),
        free: os.freemem()
      },
      loadAverage: os.loadavg()
    };

    // Read error logs
    const logDir = path.join(__dirname, '..', 'logs');
    let recentErrors = [];

    try {
      const errorLogPath = path.join(logDir, 'error.log');
      if (fs.existsSync(errorLogPath)) {
        const errorLogContent = await readFileAsync(errorLogPath, 'utf8');
        // Parse the last 20 error log entries
        recentErrors = errorLogContent
          .split('\n')
          .filter(line => line.trim())
          .map(line => {
            try {
              return JSON.parse(line);
            } catch (e) {
              return { message: line, timestamp: new Date().toISOString() };
            }
          })
          .slice(-20)
          .reverse();
      }
    } catch (error) {
      logger.error('Error reading error logs:', error);
      recentErrors = [{ message: 'Error reading error logs', timestamp: new Date().toISOString() }];
    }

    // Get unique visitors from access logs
    let uniqueVisitors = [];

    try {
      const combinedLogPath = path.join(logDir, 'combined.log');
      if (fs.existsSync(combinedLogPath)) {
        const combinedLogContent = await readFileAsync(combinedLogPath, 'utf8');

        // Extract IP addresses and count unique ones
        const ipAddresses = new Set();
        const visitorsByIP = {};
        const visitCountByIP = {};

        combinedLogContent.split('\n').forEach(line => {
          if (!line.trim()) return;

          try {
            const logEntry = JSON.parse(line);
            if (logEntry.message && typeof logEntry.message === 'string') {
              // Extract IP address from log message
              const ipMatch = logEntry.message.match(/^(\d+\.\d+\.\d+\.\d+)/);
              if (ipMatch && ipMatch[1]) {
                const ip = ipMatch[1];
                ipAddresses.add(ip);

                // Count visits for each IP
                visitCountByIP[ip] = (visitCountByIP[ip] || 0) + 1;

                // Extract country from geolocation info at the end of the log entry
                // The geolocation is the last part of the log entry after the user-agent
                const parts = logEntry.message.split('"');
                if (parts.length >= 3) {
                  // The geolocation should be after the last quote
                  const geoInfo = parts[parts.length - 1].trim();
                  if (geoInfo && geoInfo !== '') {
                    const country = geoInfo.split(',')[0].trim();

                    // Store country with IP
                    if (!visitorsByIP[ip]) {
                      visitorsByIP[ip] = { country };
                    }
                  }
                }
              }
            }
          } catch (e) {
            // Skip non-JSON lines
          }
        });

        // Create array of unique visitors by IP
        const uniqueIPsList = Array.from(ipAddresses).map(ip => ({
          ip,
          country: visitorsByIP[ip] ? visitorsByIP[ip].country : 'Unknown',
          visits: visitCountByIP[ip] || 1
        }));

        // Group IPs by country for backward compatibility
        const ipsByCountry = {};
        uniqueIPsList.forEach(visitor => {
          if (!ipsByCountry[visitor.country]) {
            ipsByCountry[visitor.country] = [];
          }
          ipsByCountry[visitor.country].push(visitor.ip);
        });

        uniqueVisitors = {
          total: ipAddresses.size,
          byIP: uniqueIPsList,
          byCountry: Object.entries(ipsByCountry)
            .map(([country, ips]) => ({ 
              country, 
              count: ips.length,
              ips: ips
            }))
            .sort((a, b) => b.count - a.count)
        };
      }
    } catch (error) {
      logger.error('Error analyzing visitor logs:', error);
      uniqueVisitors = { 
        total: 0, 
        byIP: [], 
        byCountry: [] 
      };
    }

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      queueStatus: {
        queuedJobs: queuedJobs.length,
        runningJobs: runningJobs.length,
        completedJobs: completedJobsCount,
        isProcessing: runningJobs.length > 0,
        queuedJobsList: queuedJobs,
        runningJobsList: runningJobs
      },
      performanceMetrics,
      recentErrors,
      uniqueVisitors
    });
  } catch (error) {
    logger.error('Error in admin dashboard:', error);
    res.status(500).render('error', { 
      message: 'Error loading admin dashboard',
      error: req.app.get('env') === 'development' ? error : {}
    });
  }
});

module.exports = router;
