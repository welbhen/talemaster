/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { inspect } from "node:util";

import type { LogEntry } from "../logger.types";
import type { LogTransport } from "./log-transport";

export interface ConsoleWriter {
    log(...data: unknown[]): void;
    warn(...data: unknown[]): void;
    error(...data: unknown[]): void;
}

export class ConsoleTransport implements LogTransport {
    constructor(private readonly output: ConsoleWriter = console) {}

    write(entry: LogEntry): void {
        const prefix = [entry.timestamp, entry.level, entry.context].join("] [");

        const line = `[${prefix}] ${entry.message}`;

        const details = {
            ...(entry.metadata ? { metadata: entry.metadata } : {}),
            ...(entry.error ? { error: entry.error } : {}),
        };

        const hasDetails = Object.keys(details).length > 0;
        const args = hasDetails ? [line, inspect(details, { depth: 5, colors: false })] : [line];

        switch (entry.level) {
            case "WARN":
                this.output.warn(...args);
                break;
            case "ERROR":
                this.output.error(...args);
                break;
            default:
                this.output.log(...args);
        }
    }
}
