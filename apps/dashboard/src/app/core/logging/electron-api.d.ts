/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RendererLogRequest {
    readonly level: "LOG" | "WARN" | "DEBUG" | "ERROR";
    readonly message: string;
    readonly context?: string;
    readonly metadata?: Readonly<Record<string, string | number | boolean | null>>;
    readonly error?: {
        readonly name: string;
        readonly message: string;
        readonly stack?: string;
    };
}

declare global {
    interface Window {
        readonly electronAPI?: {
            readonly logging: {
                write(request: RendererLogRequest): Promise<{ readonly accepted: true }>;
            };
        };
    }
}

export {};
