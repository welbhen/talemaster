/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import type { LogEntry, LogLevel, LogMetadata, SerializedError } from "./logger.types";

function serializeValue(value: unknown, seen: WeakSet<object>): unknown {
    if (typeof value === "bigint") {
        return value.toString();
    }

    if (value instanceof Error) {
        return serializeError(value, seen);
    }

    if (typeof value !== "object" || value === null) {
        return value;
    }

    if (seen.has(value)) {
        return "[Circular]";
    }

    seen.add(value);

    if (Array.isArray(value)) {
        return value.map((item) => serializeValue(item, seen));
    }

    return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, serializeValue(item, seen)]),
    );
}

export function serializeError(error: Error, seen = new WeakSet<object>()): SerializedError {
    if (seen.has(error)) {
        return {
            name: error.name,
            message: "[Circular error reference]",
        };
    }
    seen.add(error);

    const serialized: SerializedError = {
        name: error.name,
        message: error.message,
    };

    if (error.stack) {
        serialized.stack = error.stack;
    }

    if ("cause" in error && error.cause !== undefined) {
        serialized.cause = serializeValue(error.cause, seen);
    }

    if (error instanceof AggregateError) {
        serialized.errors = Array.from(error.errors, (item) => serializeValue(item, seen));
    }

    return serialized;
}

export function serializeMetadata(metadata?: LogMetadata): Record<string, unknown> | undefined {
    if (!metadata) {
        return undefined;
    }

    return serializeValue(metadata, new WeakSet<object>()) as Record<string, unknown>;
}

export function createLogEntry(
    level: LogLevel,
    context: string,
    message: string,
    metadata?: LogMetadata,
    error?: unknown,
): LogEntry {
    const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        context,
        message,
    };

    const serializedMetadata = serializeMetadata(metadata);

    if (serializedMetadata) {
        entry.metadata = serializedMetadata;
    }

    if (error instanceof Error) {
        entry.error = serializeError(error);
    } else if (error !== undefined) {
        entry.error = {
            name: "UnknownError",
            message: String(error),
        };
    }

    return entry;
}
