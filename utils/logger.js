const fs = require('fs');
const path = require('path');

/**
 * Custom logging utility for Campus Market backend
 * Provides structured logging with different levels and output to files
 */

// Log levels with colors for console output
const LOG_LEVELS = {
  error: { color: '\x1b[31m', label: 'ERROR' },    // Red
  warn: { color: '\x1b[33m', label: 'WARN' },      // Yellow
  info: { color: '\x1b[36m', label: 'INFO' },      // Cyan
  success: { color: '\x1b[32m', label: 'SUCCESS' }, // Green
  debug: { color: '\x1b[90m', label: 'DEBUG' }     // Gray
};

const RESET_COLOR = '\x1b[0m';

/**
 * Format timestamp
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Format log entry
 */
function formatLogEntry(level, message, meta = {}) {
  const timestamp = getTimestamp();
  const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
  return `[${timestamp}] [${level}] ${message} ${metaStr}\n`;
}

/**
 * Write to log file
 */
function writeToFile(logType, logEntry) {
  const logsDir = path.join(__dirname, '..', 'logs');

  // Ensure logs directory exists
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const logFile = path.join(logsDir, `${logType}.log`);

  try {
    fs.appendFileSync(logFile, logEntry);
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

/**
 * Core logging function
 */
function log(level, message, meta = {}, logToFile = true) {
  const levelConfig = LOG_LEVELS[level];
  const timestamp = getTimestamp();

  // Console output with colors
  const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : '';
  const consoleMessage = `${levelConfig.color}[${timestamp}] [${levelConfig.label}] ${RESET_COLOR} ${message}`;

  if (metaStr) {
    console.log(consoleMessage, '\n', metaStr);
  } else {
    console.log(consoleMessage);
  }

  // Write to file (only for error and warn levels by default)
  if (logToFile && (level === 'error' || level === 'warn')) {
    const logEntry = formatLogEntry(level.toUpperCase(), message, meta);
    writeToFile(level, logEntry);
  }

  // Also write important events to combined log
  if (logToFile) {
    const logEntry = formatLogEntry(level.toUpperCase(), message, meta);
    writeToFile('combined', logEntry);
  }
}

/**
 * Logger object with methods for different log levels
 */
const logger = {
  /**
   * Log error message
   * @param {string} message - Error message
   * @param {object} meta - Additional metadata
   * @param {Error} error - Error object (optional)
   */
  error(message, meta = {}, error = null) {
    const errorMeta = { ...meta };

    if (error) {
      errorMeta.stack = error.stack;
      errorMeta.name = error.name;
      errorMeta.code = error.code;
    }

    log('error', message, errorMeta);

    // Write to error-specific file
    const timestamp = getTimestamp();
    const errorEntry = formatLogEntry('ERROR', message, errorMeta);
    writeToFile('error', errorEntry);
  },

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {object} meta - Additional metadata
   */
  warn(message, meta = {}) {
    log('warn', message, meta);
  },

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {object} meta - Additional metadata
   */
  info(message, meta = {}) {
    log('info', message, meta);
  },

  /**
   * Log success message
   * @param {string} message - Success message
   * @param {object} meta - Additional metadata
   */
  success(message, meta = {}) {
    log('success', message, meta);
  },

  /**
   * Log debug message (only in development)
   * @param {string} message - Debug message
   * @param {object} meta - Additional metadata
   */
  debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      log('debug', message, meta);
    }
  },

  /**
   * Log authentication attempt
   * @param {string} event - Event type (login, logout, register, etc.)
   * @param {object} data - Auth data
   */
  auth(event, data = {}) {
    const message = `Auth: ${event}`;
    const meta = {
      userId: data.userId || 'N/A',
      email: data.email || 'N/A',
      role: data.role || 'N/A',
      ip: data.ip || 'N/A',
      userAgent: data.userAgent || 'N/A',
      success: data.success !== undefined ? data.success : true,
      timestamp: new Date().toISOString()
    };

    if (data.success === false) {
      this.error(message, meta);
      const authEntry = formatLogEntry('AUTH_FAILED', event, meta);
      writeToFile('auth', authEntry);
    } else {
      this.success(message, meta);
      const authEntry = formatLogEntry('AUTH_SUCCESS', event, meta);
      writeToFile('auth', authEntry);
    }
  },

  /**
   * Log API request
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {number} responseTime - Response time in ms
   */
  apiRequest(req, res, responseTime) {
    const meta = {
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id || 'anonymous',
      requestId: req.id,
      userAgent: req.get('user-agent') || 'N/A',
      contentLength: res.get('content-length') || 0
    };

    // Log based on status code
    if (res.statusCode >= 500) {
      this.error(`API Request Failed`, meta);
      const errorEntry = formatLogEntry('API_ERROR', `${req.method} ${req.originalUrl}`, meta);
      writeToFile('api', errorEntry);
    } else if (res.statusCode >= 400) {
      this.warn(`API Request Warning`, meta);
      const warnEntry = formatLogEntry('API_WARN', `${req.method} ${req.originalUrl}`, meta);
      writeToFile('api', warnEntry);
    } else {
      this.info(`API Request`, meta);
      // Only log successful requests in debug mode or if slow
      if (process.env.NODE_ENV === 'development' || responseTime > 1000) {
        const successEntry = formatLogEntry('API_SUCCESS', `${req.method} ${req.originalUrl}`, meta);
        writeToFile('api', successEntry);
      }
    }
  },

  /**
   * Log API error with full request context
   * @param {object} req - Express request object
   * @param {Error} err - Error object
   */
  apiError(req, err) {
    const meta = {
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id || 'anonymous',
      requestId: req.id,
      userAgent: req.get('user-agent') || 'N/A',
      error: {
        message: err.message,
        name: err.name,
        code: err.code,
        stack: err.stack
      },
      body: this._sanitizeBody(req.body),
      query: req.query
    };

    this.error(`API Error`, meta);
    const errorEntry = formatLogEntry('API_ERROR', `${req.method} ${req.originalUrl}`, meta);
    writeToFile('api-errors', errorEntry);
  },

  /**
   * Sanitize request body for logging (remove sensitive fields)
   * @private
   */
  _sanitizeBody(body) {
    if (!body) return {};

    const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'token', 'cardNumber', 'cvv'];
    const sanitized = { ...body };

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  },

  /**
   * Log database operation
   * @param {string} operation - Operation type (query, insert, update, delete)
   * @param {string} model - Model name
   * @param {object} data - Operation data
   */
  database(operation, model, data = {}) {
    const message = `Database: ${operation} on ${model}`;
    const meta = {
      model,
      operation,
      ...data
    };

    // Log slow queries
    if (data.duration && data.duration > 1000) {
      this.warn(message, { ...meta, slowQuery: true });
    } else {
      this.debug(message, meta);
    }
  },

  /**
   * Log payment event (M-Pesa)
   * @param {string} event - Event type (stk_push, callback, etc.)
   * @param {object} data - Payment data
   */
  payment(event, data = {}) {
    const message = `Payment: ${event}`;
    const meta = {
      eventType: event,
      orderId: data.orderId || 'N/A',
      amount: data.amount || 'N/A',
      phone: data.phone ? data.phone.replace(/(\d{6})\d{4}/, '$1****') : 'N/A', // Mask phone
      mpesaReceipt: data.mpesaReceipt || 'N/A',
      resultDesc: data.resultDesc || 'N/A',
      timestamp: new Date().toISOString()
    };

    // Log based on success
    if (data.success === false || data.resultCode && data.resultCode !== '0') {
      this.error(message, meta);
      const paymentEntry = formatLogEntry('PAYMENT_FAILED', event, meta);
      writeToFile('payment', paymentEntry);
    } else {
      this.success(message, meta);
      const paymentEntry = formatLogEntry('PAYMENT_SUCCESS', event, meta);
      writeToFile('payment', paymentEntry);
    }
  },

  /**
   * Log socket.io event
   * @param {string} event - Event type (connect, disconnect, message, etc.)
   * @param {object} data - Socket data
   */
  socket(event, data = {}) {
    const message = `Socket: ${event}`;
    const meta = {
      socketId: data.socketId || 'N/A',
      userId: data.userId || 'N/A',
      event,
      timestamp: new Date().toISOString()
    };

    this.debug(message, meta);

    // Write to socket log file
    const socketEntry = formatLogEntry('SOCKET', event, meta);
    writeToFile('socket', socketEntry);
  },

  /**
   * Log file upload
   * @param {object} data - Upload data
   */
  fileUpload(data = {}) {
    const message = 'File Upload';
    const meta = {
      fileName: data.fileName || 'N/A',
      fileSize: data.fileSize || 'N/A',
      mimeType: data.mimeType || 'N/A',
      userId: data.userId || 'N/A',
      uploadType: data.uploadType || 'N/A',
      success: data.success !== undefined ? data.success : true,
      timestamp: new Date().toISOString()
    };

    if (data.success === false) {
      this.error(message, meta);
    } else {
      this.success(message, meta);
    }

    const uploadEntry = formatLogEntry('FILE_UPLOAD', message, meta);
    writeToFile('upload', uploadEntry);
  },

  /**
   * Log security event
   * @param {string} event - Event type
   * @param {object} data - Security data
   */
  security(event, data = {}) {
    const message = `Security: ${event}`;
    const meta = {
      eventType: event,
      ip: data.ip || 'N/A',
      userId: data.userId || 'N/A',
      details: data.details || 'N/A',
      timestamp: new Date().toISOString()
    };

    this.warn(message, meta);

    // Write to security log file
    const securityEntry = formatLogEntry('SECURITY', event, meta);
    writeToFile('security', securityEntry);
  }
};

module.exports = logger;
