const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/**
 * Log Rotation Script
 *
 * Rotates and compresses log files to prevent disk space issues
 * Can be run manually or scheduled via cron
 *
 * Usage:
 *   node scripts/rotate-logs.js              # Rotate all logs
 *   node scripts/rotate-logs.js --dry-run    # Show what would be rotated
 *   node scripts/rotate-logs.js --compress   # Force compression
 */

const CONFIG = {
  logsDir: path.join(__dirname, '..', 'logs'),
  maxAge: 30, // days - keep logs for 30 days
  maxSize: 100 * 1024 * 1024, // 100MB - max size before rotation
  compressAge: 1, // days - compress logs older than this
  archiveDir: 'archived', // subdirectory for archived logs
  dryRun: process.argv.includes('--dry-run'),
  forceCompress: process.argv.includes('--compress')
};

/**
 * Get all log files in the logs directory
 */
function getLogFiles() {
  const logsDir = CONFIG.logsDir;

  if (!fs.existsSync(logsDir)) {
    console.log('Logs directory does not exist');
    return [];
  }

  return fs.readdirSync(logsDir)
    .filter(file => file.endsWith('.log'))
    .map(file => {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        path: filePath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        ageInDays: (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)
      };
    });
}

/**
 * Check if a log file needs rotation
 */
function needsRotation(file) {
  // Check size
  if (file.size >= CONFIG.maxSize) {
    return { needed: true, reason: 'size', size: file.size };
  }

  // Check age
  if (file.ageInDays >= CONFIG.maxAge) {
    return { needed: true, reason: 'age', age: file.ageInDays };
  }

  return { needed: false };
}

/**
 * Check if a log file should be compressed
 */
function needsCompression(file) {
  // Skip if already compressed
  if (file.name.endsWith('.gz')) {
    return false;
  }

  // Compress if older than threshold
  if (file.ageInDays >= CONFIG.compressAge || CONFIG.forceCompress) {
    return true;
  }

  return false;
}

/**
 * Rotate a log file
 */
function rotateFile(file) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const rotatedName = `${file.name}.${timestamp}`;
  const rotatedPath = path.join(CONFIG.logsDir, rotatedName);
  const archiveDir = path.join(CONFIG.logsDir, CONFIG.archiveDir);

  console.log(`Rotating: ${file.name}`);

  if (CONFIG.dryRun) {
    console.log(`  Would rename to: ${rotatedName}`);
    return;
  }

  try {
    // Create archive directory if it doesn't exist
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    // Move to archive directory
    const archivePath = path.join(archiveDir, rotatedName);
    fs.renameSync(file.path, archivePath);

    // Create new empty log file
    fs.writeFileSync(file.path, '');

    console.log(`  Archived to: ${archivePath}`);
  } catch (err) {
    console.error(`  Error rotating ${file.name}:`, err.message);
  }
}

/**
 * Compress a log file using gzip
 */
function compressFile(file) {
  const compressedName = `${file.name}.gz`;
  const compressedPath = path.join(CONFIG.logsDir, compressedName);

  console.log(`Compressing: ${file.name}`);

  if (CONFIG.dryRun) {
    console.log(`  Would compress to: ${compressedName}`);
    return;
  }

  try {
    // Use gzip to compress
    return new Promise((resolve, reject) => {
      const gzip = spawn('gzip', ['-c', file.path]);
      const writeStream = fs.createWriteStream(compressedPath);

      gzip.stdout.pipe(writeStream);

      gzip.on('close', (code) => {
        if (code === 0) {
          // Remove original file after successful compression
          fs.unlinkSync(file.path);
          console.log(`  Compressed to: ${compressedName}`);
          resolve();
        } else {
          reject(new Error(`gzip exited with code ${code}`));
        }
      });

      gzip.on('error', reject);
      writeStream.on('error', reject);
    });
  } catch (err) {
    console.error(`  Error compressing ${file.name}:`, err.message);
  }
}

/**
 * Delete old archived logs
 */
function cleanupOldArchives() {
  const archiveDir = path.join(CONFIG.logsDir, CONFIG.archiveDir);

  if (!fs.existsSync(archiveDir)) {
    return;
  }

  console.log('\nCleaning up old archives...');

  const files = fs.readdirSync(archiveDir)
    .map(file => {
      const filePath = path.join(archiveDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        path: filePath,
        ageInDays: (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)
      };
    })
    .filter(file => file.ageInDays > CONFIG.maxAge);

  files.forEach(file => {
    console.log(`Deleting: ${file.name} (${Math.round(file.ageInDays)} days old)`);
    if (!CONFIG.dryRun) {
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        console.error(`  Error deleting ${file.name}:`, err.message);
      }
    }
  });
}

/**
 * Get disk usage statistics
 */
function getDiskUsage() {
  const logsDir = CONFIG.logsDir;
  let totalSize = 0;
  let fileCount = 0;

  function calcSize(dir) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        calcSize(filePath);
      } else {
        totalSize += stats.size;
        fileCount++;
      }
    });
  }

  calcSize(logsDir);

  return {
    totalSize,
    fileCount,
    formattedSize: formatBytes(totalSize)
  };
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Main execution
 */
async function main() {
  console.log('==========================================');
  console.log('Log Rotation Script');
  console.log('==========================================');
  console.log(`Logs directory: ${CONFIG.logsDir}`);
  console.log(`Max age: ${CONFIG.maxAge} days`);
  console.log(`Max size: ${formatBytes(CONFIG.maxSize)}`);
  console.log(`Dry run: ${CONFIG.dryRun}`);
  console.log('==========================================\n');

  // Show current disk usage
  const usage = getDiskUsage();
  console.log('Current disk usage:');
  console.log(`  Total size: ${usage.formattedSize}`);
  console.log(`  File count: ${usage.fileCount}\n`);

  // Get all log files
  const logFiles = getLogFiles();
  console.log(`Found ${logFiles.length} log file(s)\n`);

  // Rotate files that need it
  console.log('Checking for files to rotate...');
  let rotatedCount = 0;
  for (const file of logFiles) {
    const rotationNeeded = needsRotation(file);
    if (rotationNeeded.needed) {
      console.log(`\n${file.name}:`);
      console.log(`  Reason: ${rotationNeeded.reason}`);
      if (rotationNeeded.reason === 'size') {
        console.log(`  Size: ${formatBytes(rotationNeeded.size)} (max: ${formatBytes(CONFIG.maxSize)})`);
      } else if (rotationNeeded.reason === 'age') {
        console.log(`  Age: ${Math.round(rotationNeeded.age)} days (max: ${CONFIG.maxAge} days)`);
      }
      rotateFile(file);
      rotatedCount++;
    }
  }

  if (rotatedCount === 0) {
    console.log('No files need rotation\n');
  }

  // Compress old files
  console.log('\nChecking for files to compress...');
  let compressedCount = 0;
  for (const file of logFiles) {
    if (needsCompression(file)) {
      await compressFile(file);
      compressedCount++;
    }
  }

  if (compressedCount === 0) {
    console.log('No files need compression\n');
  }

  // Cleanup old archives
  cleanupOldArchives();

  // Show final disk usage
  const finalUsage = getDiskUsage();
  console.log('\n==========================================');
  console.log('Final disk usage:');
  console.log(`  Total size: ${finalUsage.formattedSize}`);
  console.log(`  File count: ${finalUsage.fileCount}`);
  console.log(`  Space saved: ${formatBytes(usage.totalSize - finalUsage.totalSize)}`);
  console.log('==========================================');
  console.log('\nLog rotation complete!');
}

// Run the script
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

module.exports = { CONFIG, getLogFiles, rotateFile, compressFile };
