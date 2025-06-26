/**
 * Simple logger utility for structured logging
 * Provides JSON and text output formats
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
}

export class Logger {
  private static instance: Logger;
  private jsonMode: boolean = false;
  private minLevel: LogLevel = LogLevel.INFO;

  private constructor() {
    // Check environment for log settings
    this.jsonMode = process.env.LOG_FORMAT === 'json';

    const envLevel = process.env.LOG_LEVEL?.toLowerCase();
    if (envLevel && Object.values(LogLevel).includes(envLevel as LogLevel)) {
      this.minLevel = envLevel as LogLevel;
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setJsonMode(enabled: boolean): void {
    this.jsonMode = enabled;
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentIndex = levels.indexOf(this.minLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }

  private formatEntry(level: LogLevel, message: string, data?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(data && { data }),
    };
  }

  private output(entry: LogEntry): void {
    if (this.jsonMode) {
      console.log(JSON.stringify(entry));
    } else {
      const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
      const message = `${prefix} ${entry.message}`;

      if (entry.data) {
        console.log(message, entry.data);
      } else {
        console.log(message);
      }
    }
  }

  debug(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.output(this.formatEntry(LogLevel.DEBUG, message, data));
    }
  }

  info(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.output(this.formatEntry(LogLevel.INFO, message, data));
    }
  }

  warn(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.output(this.formatEntry(LogLevel.WARN, message, data));
    }
  }

  error(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      // Always output errors to stderr
      const entry = this.formatEntry(LogLevel.ERROR, message, data);

      if (this.jsonMode) {
        console.error(JSON.stringify(entry));
      } else {
        const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
        const errorMessage = `${prefix} ${entry.message}`;

        if (entry.data) {
          console.error(errorMessage, entry.data);
        } else {
          console.error(errorMessage);
        }
      }
    }
  }

  // Special method for CLI output that should always be shown
  cliOutput(message: string): void {
    console.log(message);
  }

  // Special method for CLI errors that should always be shown
  cliError(message: string): void {
    console.error(message);
  }

  // Special method for table output
  cliTable(data: unknown[]): void {
    console.table(data);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();
