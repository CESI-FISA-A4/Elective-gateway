const fs = require('fs');
const winston = require('winston');
const { combine, timestamp, printf } = winston.format;
const DailyRotateFile = require('winston-daily-rotate-file');

const logger = winston.createLogger({
    format: combine(
        timestamp(),
        printf(({ level, message, timestamp }) => {
            return `${timestamp} - ${level}: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new DailyRotateFile({
            filename: 'logs/%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d' // Keep logs for 14 days
        })
    ]
});

// Function to log API requests
function logRequest(level, statusCode, service, url, message = "") {
    const logMessage = `(${statusCode}) [${service}] - ${url} ${message}`;

    switch (level) {
        case "info":
            logger.info(logMessage);
            break;
        case "warning":
            logger.warning(logMessage);
            break;
        case "error":
            logger.error(logMessage);
            break;
    }
}

module.exports = { logRequest }