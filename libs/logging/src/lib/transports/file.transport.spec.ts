/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { FileTransport } from "./file.transport";
import type { LogEntry } from "../logger.types";

describe("FileTransport", () => {
    let directory: string;

    const entry = (message: string): LogEntry => ({
        timestamp: new Date().toISOString(),
        level: "LOG",
        context: "Test",
        message,
    });

    beforeEach(() => {
        directory = mkdtempSync(join(tmpdir(), "talemaster-logs-"));
    });

    afterEach(() => {
        rmSync(directory, { recursive: true, force: true });
    });

    it("writes JSONL entries", () => {
        const transport = new FileTransport({ directory });

        transport.write(entry("First"));
        transport.write(entry("Second"));

        const lines = readFileSync(join(directory, "talemaster.log"), "utf8").trim().split("\n");

        expect(lines).toHaveLength(2);
        expect(JSON.parse(lines[0]).message).toBe("First");
        expect(JSON.parse(lines[1]).message).toBe("Second");
    });

    it("rotates files when the active file exceeds its limit", () => {
        const transport = new FileTransport({
            directory,
            maxFileSizeBytes: 100,
            maxFiles: 3,
        });

        transport.write(entry("A".repeat(60)));
        transport.write(entry("B".repeat(60)));

        expect(readdirSync(directory)).toContain("talemaster.1.log");
        expect(readdirSync(directory)).toContain("talemaster.log");
    });

    it("retains no more than the configured number of files", () => {
        const transport = new FileTransport({
            directory,
            maxFileSizeBytes: 100,
            maxFiles: 3,
        });

        for (let index = 0; index < 8; index++) {
            transport.write(entry(`${index}-${"x".repeat(60)}`));
        }

        expect(readdirSync(directory).length).toBeLessThanOrEqual(3);
    });

    it("keeps each active file within its size limit for ordinary entries", () => {
        const transport = new FileTransport({
            directory,
            maxFileSizeBytes: 150,
            maxFiles: 3,
        });

        transport.write(entry("A".repeat(60)));
        transport.write(entry("B".repeat(60)));

        expect(statSync(join(directory, "talemaster.log")).size).toBeLessThanOrEqual(150);
    });
});
