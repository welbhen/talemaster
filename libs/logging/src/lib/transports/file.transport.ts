/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    closeSync,
    existsSync,
    mkdirSync,
    openSync,
    renameSync,
    statSync,
    unlinkSync,
    writeSync,
} from "node:fs";
import { dirname, join } from "node:path";

import type { LogEntry } from "../logger.types";
import type { LogTransport } from "./log-transport";

export interface FileTransportOptions {
    directory: string;
    fileName?: string;
    maxFileSizeBytes?: number;
    maxFiles?: number;
}

export class FileTransport implements LogTransport {
    private readonly filePath: string;
    private readonly maxFileSizeBytes: number;
    private readonly maxFiles: number;

    constructor(options: FileTransportOptions) {
        this.filePath = join(options.directory, options.fileName ?? "talemaster.log");

        this.maxFileSizeBytes = options.maxFileSizeBytes ?? 5 * 1024 * 1024;

        this.maxFiles = options.maxFiles ?? 5;

        if (!Number.isSafeInteger(this.maxFileSizeBytes) || this.maxFileSizeBytes <= 0) {
            throw new RangeError("maxFileSizeBytes must be a positive integer");
        }

        if (!Number.isSafeInteger(this.maxFiles) || this.maxFiles < 1) {
            throw new RangeError("maxFiles must be a positive integer");
        }
    }

    write(entry: LogEntry): void {
        const line = `${JSON.stringify(entry)}\n`;
        const content = Buffer.from(line, "utf8");

        mkdirSync(dirname(this.filePath), { recursive: true });
        this.rotateIfNeeded(content.byteLength);

        const descriptor = openSync(this.filePath, "a");

        try {
            writeSync(descriptor, content);
        } finally {
            closeSync(descriptor);
        }
    }

    private rotateIfNeeded(incomingBytes: number): void {
        if (!existsSync(this.filePath)) {
            return;
        }

        const currentSize = statSync(this.filePath).size;

        if (currentSize === 0 || currentSize + incomingBytes <= this.maxFileSizeBytes) {
            return;
        }

        if (this.maxFiles === 1) {
            unlinkSync(this.filePath);
            return;
        }

        this.removeOldestFile();

        for (let index = this.maxFiles - 2; index >= 1; index--) {
            const source = this.archivePath(index);
            const destination = this.archivePath(index + 1);

            if (existsSync(source)) {
                renameSync(source, destination);
            }
        }

        renameSync(this.filePath, this.archivePath(1));
    }

    private removeOldestFile(): void {
        const oldest = this.archivePath(this.maxFiles - 1);

        if (existsSync(oldest)) {
            unlinkSync(oldest);
        }
    }

    private archivePath(index: number): string {
        const extension = ".log";
        const baseName = this.filePath.endsWith(extension)
            ? this.filePath.slice(0, -extension.length)
            : this.filePath;

        return `${baseName}.${index}${extension}`;
    }
}
