const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Configuration
const LOG_CONFIG = {
  // Paths to exclude from detailed logging
  excludePaths: ['/health', '/health/detailed', '/favicon.ico'],
  // Log levels
  slowRequestThreshold: 1000, // ms
  verySlowRequestThreshold: 3000, // ms
  // Log body for these methods
  logBodyForMethods: ['POST', 'PUT', 'PATCH'],
  // Max body size to log (prevent logging huge payloads)
  maxBodySize: 1024 * 10 // 10KB
};

/**
 * Sanitize request body by removing sensitive fields
 * @param {object} body - Request body
 * @returns {object} Sanitized body
 */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;

  const sensitiveFields = [
    'password',
    'currentPassword',
    'newPassword',
    'confirmPassword',
    'token',
    'accessToken',
    'refreshToken',
    'cardNumber',
    'cvv',
    'secret',
    'apiKey'
  ];

  const sanitized = { ...body };

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  // Truncate large objects
  const bodyStr = JSON.stringify(sanitized);
  if (bodyStr.length > LOG_CONFIG.maxBodySize) {
    return {
      _truncated: true,
      _size: bodyStr.length,
      _preview: bodyStr.substring(0, LOG_CONFIG.maxBodySize) + '...'
    };
  }

  return sanitized;
}

/**
 * Extract user agent information
 * @param {string} userAgent - User-Agent header
 * @returns {object} Parsed user agent info
 */
function parseUserAgent(userAgent) {
  if (!userAgent) return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };

  const info = {
    raw: userAgent,
    browser: 'Unknown',
    os: 'Unknown',
    device: 'Unknown'
  };

  // Detect browser
  if (userAgent.includes('Chrome')) info.browser = 'Chrome';
  else if (userAgent.includes('Firefox')) info.browser = 'Firefox';
  else if (userAgent.includes('Safari')) info.browser = 'Safari';
  else if (userAgent.includes('Edge')) info.browser = 'Edge';

  // Detect OS
  if (userAgent.includes('Windows')) info.os = 'Windows';
  else if (userAgent.includes('Mac')) info.os = 'macOS';
  else if (userAgent.includes('Linux')) info.os = 'Linux';
  else if (userAgent.includes('Android')) info.os = 'Android';
  else if (userAgent.includes('iOS')) info.os = 'iOS';

  // Detect device
  if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
    info.device = 'Mobile';
  } else {
    info.device = 'Desktop';
  }

  return info;
}

/**
 * Should exclude this path from detailed logging
 * @param {string} path - Request path
 * @returns {boolean}
 */
function shouldExcludePath(path) {
  return LOG_CONFIG.excludePaths.some(excludePath =>
    path === excludePath || path.startsWith(excludePath)
  );
}

/**
 * Get IP address from request
 * @param {object} req - Express request
 * @returns {string} IP address
 */
function getClientIP(req) {
  return req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.connection?.socket?.remoteAddress ||
    'unknown';
}

/**
 * Request logging middleware
 * Logs all incoming HTTP requests with comprehensive details
 */
const requestLogger = (req, res, next) => {
  // Capture the start time
  const startTime = Date.now();

  // Skip detailed logging for excluded paths (still log basic info)
  const isExcluded = shouldExcludePath(req.originalUrl || req.url);

  // Capture request details
  const requestDetails = {
    method: req.method,
    url: req.originalUrl || req.url,
    path: req.path,
    query: req.query,
    ip: getClientIP(req),
    requestId: req.id,
    userId: req.user?.id || 'anonymous',
    userRole: req.user?.role || 'none',
    userAgent: parseUserAgent(req.get('user-agent'))
  };

  // Add sanitized body for methods that typically have bodies
  if (LOG_CONFIG.logBodyForMethods.includes(req.method) && req.body) {
    requestDetails.body = sanitizeBody(req.body);
  }

  // Log request start
  if (!isExcluded) {
    logger.debug('Incoming Request', requestDetails);
  }

  // Capture the original res.json to intercept response data
  const originalJson = res.json;
  res.json = function(data) {
    res.responseData = data;
    return originalJson.call(this, data);
  };

  // Capture the original res.send to intercept response data
  const originalSend = res.send;
  res.send = function(data) {
    res.responseData = data;
    return originalSend.call(this, data);
  };

  // Listen for the 'finish' event which fires when response is sent
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;

    // Build response log data
    const responseLog = {
      ...requestDetails,
      status: res.statusCode,
      responseTime: `${responseTime}ms`,
      responseTimeMs: responseTime,
      contentLength: res.get('content-length') || 0,
      contentType: res.get('content-type') || 'none'
    };

    // Determine log level based on status code and response time
    let logLevel = 'info';
    let logMessage = 'Request Completed';

    if (res.statusCode >= 500) {
      logLevel = 'error';
      logMessage = 'Server Error';
    } else if (res.statusCode >= 400) {
      logLevel = 'warn';
      logMessage = 'Client Error';
    } else if (responseTime > LOG_CONFIG.verySlowRequestThreshold) {
      logLevel = 'error';
      logMessage = 'Very Slow Request';
    } else if (responseTime > LOG_CONFIG.slowRequestThreshold) {
      logLevel = 'warn';
      logMessage = 'Slow Request';
    }

    // Log based on level
    if (logLevel === 'error') {
      logger.error(logMessage, responseLog);
    } else if (logLevel === 'warn') {
      logger.warn(logMessage, responseLog);
    } else if (!isExcluded) {
      logger.info(logMessage, responseLog);
    }

    // Use the existing logger.apiRequest for file logging
    if (!isExcluded) {
      logger.apiRequest(req, res, responseTime);
    }

    // Additional specific logging
    if (res.statusCode >= 400) {
      logger.warn('Request completed with error status', {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        responseTime: `${responseTime}ms`,
        userId: req.user?.id || 'anonymous',
        requestId: req.id
      });
    }

    // Log slow requests
    if (responseTime > LOG_CONFIG.slowRequestThreshold) {
      logger.warn('Slow Request Detected', {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        responseTime: `${responseTime}ms`,
        userId: req.user?.id || 'anonymous',
        requestId: req.id
      });
    }

    // Log very slow requests (potential issues)
    if (responseTime > LOG_CONFIG.verySlowRequestThreshold) {
      logger.error('Very Slow Request - Potential Issue', {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        responseTime: `${responseTime}ms`,
        userId: req.user?.id || 'anonymous',
        requestId: req.id,
        body: requestDetails.body,
        query: requestDetails.query
      });
    }
  });

  // Continue to the next middleware
  next();
};

/**
 * Error logging middleware
 * Logs errors with full request context including sanitized body
 */
const errorLogger = (err, req, res, next) => {
  const errorDetails = {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: getClientIP(req),
    requestId: req.id,
    userId: req.user?.id || 'anonymous',
    userAgent: parseUserAgent(req.get('user-agent')),
    error: {
      name: err.name,
      message: err.message,
      code: err.code,
      status: err.status || err.statusCode,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    },
    body: sanitizeBody(req.body),
    query: req.query,
    params: req.params
  };

  // Log based on error type
  if (err.name === 'ValidationError') {
    logger.warn('Validation Error', errorDetails);
  } else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    logger.security('authentication_failed', {
      ip: errorDetails.ip,
      userId: errorDetails.userId,
      details: err.message,
      url: errorDetails.url
    });
    logger.warn('Authentication Error', errorDetails);
  } else if (err.status >= 500) {
    logger.error('Server Error', errorDetails, err);
  } else {
    logger.warn('Request Error', errorDetails);
  }

  // Use the existing logger.apiError for file logging
  logger.apiError(req, err);

  // Pass error to the next error handler
  next(err);
};

/**
 * Request ID middleware
 * Adds a unique request ID to each request for tracing
 */
const requestId = (req, res, next) => {
  // Check for existing request ID from header
  const existingRequestId = req.get('X-Request-ID');

  // Generate new ID if not exists
  req.id = existingRequestId || require('crypto').randomBytes(16).toString('hex');

  // Set response header for tracing
  res.setHeader('X-Request-ID', req.id);

  next();
};

/**
 * Request counter middleware
 * Tracks number of active requests
 */
let activeRequests = 0;
const maxActiveRequests = 1000;

const requestCounter = (req, res, next) => {
  activeRequests++;

  // Log if approaching max concurrent requests
  if (activeRequests > maxActiveRequests * 0.8) {
    logger.warn('High concurrent request count', {
      activeRequests,
      threshold: maxActiveRequests
    });
  }

  res.on('finish', () => {
    activeRequests--;
  });

  next();
};

/**
 * Security event logger middleware
 * Logs suspicious activities
 */
const securityLogger = (req, res, next) => {
  const ip = getClientIP(req);

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\.\./,           // Path traversal
    /<script>/i,      // XSS attempt
    /union.*select/i, // SQL injection
    /eval\(/i,        // Code injection
    /document\.cookie/i // Cookie theft attempt
  ];

  const checkSuspicious = (obj) => {
    if (!obj) return false;
    const str = JSON.stringify(obj);
    return suspiciousPatterns.some(pattern => pattern.test(str));
  };

  // Log suspicious requests
  if (checkSuspicious(req.query) || checkSuspicious(req.body) || checkSuspicious(req.params)) {
    logger.security('suspicious_request', {
      ip,
      url: req.originalUrl,
      method: req.method,
      userId: req.user?.id || 'anonymous',
      requestId: req.id,
      userAgent: req.get('user-agent')
    });
  }

  // Log requests without user agent (likely bots or scripts)
  if (!req.get('user-agent') && !req.get('X-Request-ID')) {
    logger.security('request_no_user_agent', {
      ip,
      url: req.originalUrl,
      method: req.method,
      requestId: req.id
    });
  }

  next();
};

/**
 * Get request statistics
 * @returns {object} Request stats
 */
function getRequestStats() {
  return {
    activeRequests,
    maxActiveRequests
  };
}

module.exports = {
  requestLogger,
  errorLogger,
  requestId,
  requestCounter,
  securityLogger,
  getRequestStats,
  sanitizeBody,
  parseUserAgent,
  getClientIP
};
