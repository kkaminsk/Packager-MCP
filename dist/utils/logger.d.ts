import type { LoggingConfig } from '../types/config.js';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export declare class Logger {
    private level;
    private format;
    private context;
    constructor(config: LoggingConfig, context?: Record<string, unknown>);
    child(context: Record<string, unknown>): Logger;
    debug(message: string, context?: Record<string, unknown>): void;
    info(message: string, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
    error(message: string, context?: Record<string, unknown>): void;
    private log;
    private formatJson;
    private formatText;
}
export declare function initLogger(config: LoggingConfig): Logger;
export declare function getLogger(): Logger;
//# sourceMappingURL=logger.d.ts.map