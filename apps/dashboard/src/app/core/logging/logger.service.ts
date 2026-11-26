/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from "@angular/core";
import type { RendererLogRequest } from "./electron-api";

export type RendererLogMetadata = Readonly<Record<string, unknown>>;

@Injectable({ providedIn: "root" })
export class LoggerService {
    private readonly context = "Renderer";

    debug(message: string, metadata?: RendererLogMetadata): void {
        this.write("DEBUG", message, metadata);
    }

    info(message: string, metadata?: RendererLogMetadata): void {
        this.write("LOG", message, metadata);
    }

    warn(message: string, metadata?: RendererLogMetadata): void {
        this.write("WARN", message, metadata);
    }

    error(message: string, error?: unknown, metadata?: RendererLogMetadata): void {
        this.write("ERROR", message, metadata, error);
    }

    private write(
        level: RendererLogRequest["level"],
        message: string,
        metadata?: RendererLogMetadata,
        error?: unknown,
    ): void {
        const request: RendererLogRequest = {
            level,
            message: this.normalizeMessage(message),
            context: this.context,
            ...(this.normalizeMetadata(metadata) ? { metadata: this.normalizeMetadata(metadata) } : {}),
            ...(error !== undefined ? { error: this.serializeError(error) } : {}),
        };

        try {
            const logging = window.electronAPI?.logging;

            if (!logging) {
                this.fallback(level, request.message, error, request.metadata);
                return;
            }

            void logging.write(request).catch(() => {
                this.fallback(level, request.message, error, request.metadata);
            });
        } catch {
            this.fallback(level, request.message, error, request.metadata);
        }
    }

    private normalizeMessage(message: string): string {
        const normalized = typeof message === "string" ? message.trim() : String(message);
        return normalized.slice(0, 8_000) || "Empty log message";
    }

    private normalizeMetadata(
        metadata?: RendererLogMetadata,
    ): RendererLogRequest["metadata"] | undefined {
        if (!metadata) return undefined;

        try {
            const result: Record<string, string | number | boolean | null> = {};
            for (const [key, value] of Object.entries(metadata).slice(0, 40)) {
                if (
                    value === null ||
                    typeof value === "boolean" ||
                    (typeof value === "number" && Number.isFinite(value))
                ) {
                    result[key.slice(0, 200)] = value;
                } else if (typeof value === "string") {
                    result[key.slice(0, 200)] = value.slice(0, 2_000);
                } else if (typeof value === "bigint") {
                    result[key.slice(0, 200)] = value.toString().slice(0, 2_000);
                } else if (value instanceof Error) {
                    result[key.slice(0, 200)] = `${value.name}: ${value.message}`.slice(0, 2_000);
                } else if (value !== undefined) {
                    try {
                        result[key.slice(0, 200)] = JSON.stringify(value).slice(0, 2_000);
                    } catch {
                        result[key.slice(0, 200)] = "[Unserializable value]";
                    }
                }
            }
            return result;
        } catch {
            return { serializationWarning: "Metadata could not be inspected" };
        }
    }

    private serializeError(error: unknown): NonNullable<RendererLogRequest["error"]> {
        if (error instanceof Error) {
            return {
                name: error.name.slice(0, 200),
                message: error.message.slice(0, 4_000),
                ...(error.stack ? { stack: error.stack.slice(0, 12_000) } : {}),
            };
        }

        let message: string;
        try {
            message = typeof error === "string" ? error : JSON.stringify(error);
        } catch {
            message = String(error);
        }

        return {
            name: "UnknownError",
            message: (message || String(error)).slice(0, 4_000),
        };
    }

    private fallback(
        level: RendererLogRequest["level"],
        message: string,
        error?: unknown,
        metadata?: RendererLogRequest["metadata"],
    ): void {
        try {
            const method =
                level === "ERROR"
                    ? console.error
                    : level === "WARN"
                      ? console.warn
                      : level === "DEBUG"
                        ? console.debug
                        : console.info;

            method.call(console, `[TaleMaster Renderer] ${message}`, {
                ...(metadata ?? {}),
                ...(error !== undefined ? { error } : {}),
            });
        } catch {
            // Logging must never throw into application code.
        }
    }
}
