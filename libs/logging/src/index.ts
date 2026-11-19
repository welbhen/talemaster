/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

export { createLogger } from "./lib/logger";
export { createApplicationLogger } from "./lib/logging.config";

export type {
    LogEntry,
    LogLevel,
    Logger,
    LoggerOptions,
    LogMetadata,
    SerializedError,
} from "./lib/logger.types";

export type { LogTransport } from "./lib/transports/log-transport";
export { ConsoleTransport } from "./lib/transports/console.transport";
export { FileTransport } from "./lib/transports/file.transport";
export type { FileTransportOptions } from "./lib/transports/file.transport";
