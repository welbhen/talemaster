/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { createLogEntry } from "./log-formatter";
import type { LogLevel, Logger, LoggerOptions, LogMetadata } from "./logger.types";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
    DEBUG: 10,
    LOG: 20,
    WARN: 30,
    ERROR: 40,
};

function isEnabled(level: LogLevel, minimum: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[minimum];
}

export function createLogger(options: LoggerOptions): Logger {
    const { context, minLevel, transports, onTransportError } = options;

    function write(
        level: LogLevel,
        message: string,
        metadata?: LogMetadata,
        error?: unknown,
    ): void {
        if (!isEnabled(level, minLevel)) {
            return;
        }

        let entry;

        try {
            entry = createLogEntry(level, context, message, metadata, error);
        } catch (formatError) {
            reportFailure(formatError);
            return;
        }

        for (const transport of transports) {
            try {
                transport.write(entry);
            } catch (transportError) {
                reportFailure(transportError);
            }
        }
    }

    function reportFailure(error: unknown): void {
        try {
            onTransportError?.(error);
        } catch {
            // The fallback below handles this failure.
        }

        try {
            process.stderr.write(`[TaleMaster Logger] Transport failure: ${String(error)}\n`);
        } catch {
            // Logging failures must never escape.
        }
    }

    return {
        log: (message, metadata) => write("LOG", message, metadata),

        warn: (message, metadata) => write("WARN", message, metadata),

        debug: (message, metadata) => write("DEBUG", message, metadata),

        error: (message, error, metadata) => write("ERROR", message, metadata, error),
    };
}
