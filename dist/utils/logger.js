const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
export class Logger {
    level;
    format;
    context;
    constructor(config, context = {}) {
        this.level = config.level;
        this.format = config.format;
        this.context = context;
    }
    child(context) {
        const childLogger = new Logger({ level: this.level, format: this.format }, { ...this.context, ...context });
        return childLogger;
    }
    debug(message, context) {
        this.log('debug', message, context);
    }
    info(message, context) {
        this.log('info', message, context);
    }
    warn(message, context) {
        this.log('warn', message, context);
    }
    error(message, context) {
        this.log('error', message, context);
    }
    log(level, message, context) {
        if (LOG_LEVELS[level] < LOG_LEVELS[this.level]) {
            return;
        }
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context: { ...this.context, ...context },
        };
        const output = this.format === 'json' ? this.formatJson(entry) : this.formatText(entry);
        if (level === 'error') {
            console.error(output);
        }
        else {
            console.error(output); // Use stderr for all logging to not interfere with stdio transport
        }
    }
    formatJson(entry) {
        return JSON.stringify(entry);
    }
    formatText(entry) {
        const contextStr = entry.context && Object.keys(entry.context).length > 0
            ? ` ${JSON.stringify(entry.context)}`
            : '';
        return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${contextStr}`;
    }
}
let globalLogger;
export function initLogger(config) {
    globalLogger = new Logger(config);
    return globalLogger;
}
export function getLogger() {
    if (!globalLogger) {
        globalLogger = new Logger({ level: 'info', format: 'json' });
    }
    return globalLogger;
}
//# sourceMappingURL=logger.js.map