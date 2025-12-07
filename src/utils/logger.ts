import type { LoggingConfig } from '../types/config.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private level: LogLevel;
  private format: 'json' | 'text';
  private context: Record<string, unknown>;

  constructor(config: LoggingConfig, context: Record<string, unknown> = {}) {
    this.level = config.level;
    this.format = config.format;
    this.context = context;
  }

  child(context: Record<string, unknown>): Logger {
    const childLogger = new Logger(
      { level: this.level, format: this.format },
      { ...this.context, ...context }
    );
    return childLogger;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.level]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...context },
    };

    const output = this.format === 'json' ? this.formatJson(entry) : this.formatText(entry);

    if (level === 'error') {
      console.error(output);
    } else {
      console.error(output); // Use stderr for all logging to not interfere with stdio transport
    }
  }

  private formatJson(entry: LogEntry): string {
    return JSON.stringify(entry);
  }

  private formatText(entry: LogEntry): string {
    const contextStr =
      entry.context && Object.keys(entry.context).length > 0
        ? ` ${JSON.stringify(entry.context)}`
        : '';
    return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${contextStr}`;
  }
}

let globalLogger: Logger | undefined;

export function initLogger(config: LoggingConfig): Logger {
  globalLogger = new Logger(config);
  return globalLogger;
}

export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new Logger({ level: 'info', format: 'json' });
  }
  return globalLogger;
}
