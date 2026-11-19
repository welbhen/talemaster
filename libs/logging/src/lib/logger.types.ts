/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

export type LogLevel = "DEBUG" | "LOG" | "WARN" | "ERROR";

export type LogMetadata = Readonly<Record<string, unknown>>;

export interface SerializedError {
    name: string;
    message: string;
    stack?: string;
    cause?: unknown;
    errors?: unknown[];
}

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    context: string;
    message: string;
    metadata?: Record<string, unknown>;
    error?: SerializedError;
}

export interface Logger {
    log(message: string, metadata?: LogMetadata): void;
    warn(message: string, metadata?: LogMetadata): void;
    debug(message: string, metadata?: LogMetadata): void;
    error(message: string, error?: unknown, metadata?: LogMetadata): void;
}

export interface LoggerOptions {
    context: string;
    minLevel: LogLevel;
    transports: readonly import("./transports/log-transport").LogTransport[];
    onTransportError?: (error: unknown) => void;
}
