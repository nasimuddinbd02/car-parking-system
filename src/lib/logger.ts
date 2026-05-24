import fs from "fs";
import path from "path";

type LogLevel = "info" | "warn" | "error" | "debug";

const LOGS_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOGS_DIR, "server.log");

// Ensure logs directory exists (Only on server-side)
if (typeof window === "undefined") {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

function getTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: LogLevel, message: string, meta?: unknown): string {
  const timestamp = getTimestamp();
  const levelUpper = level.toUpperCase();
  const metaString = meta ? ` | Metadata: ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${levelUpper}] ${message}${metaString}\n`;
}

function writeToLogFile(level: LogLevel, message: string, meta?: unknown) {
  if (typeof window !== "undefined") {
    // Gracefully handle client-side calls
    return;
  }

  const logLine = formatMessage(level, message, meta);

  fs.appendFile(LOG_FILE, logLine, (err) => {
    if (err) {
      console.error("[Logger Error] Failed to write to server log file:", err);
    }
  });
}

export const logger = {
  info(message: string, meta?: unknown) {
    const formatted = formatMessage("info", message, meta).trim();
    console.log(`\x1b[32m${formatted}\x1b[0m`); // green
    writeToLogFile("info", message, meta);
  },
  warn(message: string, meta?: unknown) {
    const formatted = formatMessage("warn", message, meta).trim();
    console.warn(`\x1b[33m${formatted}\x1b[0m`); // yellow
    writeToLogFile("warn", message, meta);
  },
  error(message: string, error?: unknown) {
    const errorMeta = error instanceof Error 
      ? { message: error.message, stack: error.stack } 
      : error;
    const formatted = formatMessage("error", message, errorMeta).trim();
    console.error(`\x1b[31m${formatted}\x1b[0m`); // red
    writeToLogFile("error", message, errorMeta);
  },
  debug(message: string, meta?: unknown) {
    if (process.env.NODE_ENV !== "production") {
      const formatted = formatMessage("debug", message, meta).trim();
      console.log(`\x1b[36m${formatted}\x1b[0m`); // cyan
    }
    writeToLogFile("debug", message, meta);
  }
};
