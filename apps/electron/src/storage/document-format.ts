/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

export const DOCUMENT_FORMAT_VERSION = 1 as const;

export interface RichTextDocument {
    readonly type: "doc";
    readonly content?: readonly unknown[];
    readonly [key: string]: unknown;
}

export interface StoredDocument {
    readonly formatVersion: typeof DOCUMENT_FORMAT_VERSION;
    readonly content: RichTextDocument;
}

export function parseStoredDocument(value: unknown): StoredDocument {
    if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(value) ||
        !("formatVersion" in value) ||
        !("content" in value)
    ) {
        throw new TypeError("Invalid document envelope.");
    }

    const envelope = value as Record<string, unknown>;

    if (envelope.formatVersion !== DOCUMENT_FORMAT_VERSION) {
        throw new Error(`Unsupported document format version: ${String(envelope.formatVersion)}`);
    }

    const content = envelope.content;
    if (
        typeof content !== "object" ||
        content === null ||
        Array.isArray(content) ||
        (content as Record<string, unknown>).type !== "doc"
    ) {
        throw new TypeError("Document content must be a structured editor document.");
    }

    return {
        formatVersion: DOCUMENT_FORMAT_VERSION,
        content: content as RichTextDocument,
    };
}

export function serializeStoredDocument(document: StoredDocument): string {
    const validated = parseStoredDocument(document);
    return `${JSON.stringify(validated, null, 2)}\n`;
}

export function deserializeStoredDocument(serialized: string): StoredDocument {
    let parsed: unknown;

    try {
        parsed = JSON.parse(serialized);
    } catch {
        throw new TypeError("Document file contains invalid JSON.");
    }

    return parseStoredDocument(parsed);
}
