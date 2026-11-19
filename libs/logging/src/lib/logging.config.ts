/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConsoleTransport } from "./transports/console.transport";
import { FileTransport } from "./transports/file.transport";
import { createLogger } from "./logger";
import type { Logger } from "./logger.types";

export interface LoggingConfig {
    directory: string;
    isDevelopment: boolean;
}

export function createApplicationLogger(config: LoggingConfig, context: string): Logger {
    return createLogger({
        context,
        minLevel: config.isDevelopment ? "DEBUG" : "LOG",
        transports: [
            new ConsoleTransport(),
            new FileTransport({
                directory: config.directory,
                fileName: "talemaster.log",
                maxFileSizeBytes: 5 * 1024 * 1024,
                maxFiles: 5,
            }),
        ],
    });
}
