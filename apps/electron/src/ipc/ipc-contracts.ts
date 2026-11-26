/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IpcRequestChannel } from "@talemaster/ipc-bridge";
import type { LogLevel } from "@talemaster/logging";
import type { ProfileIpcChannels } from "./profile-ipc.types";

/**
 * Wire DTOs owned by the Electron composition layer.
 *
 * These are deliberately narrower than the feature libraries' domain types:
 * only structured-clone-safe data crosses the renderer/main boundary.
 */
export interface RendererLogRequest {
    readonly level: LogLevel;
    readonly message: string;
    readonly context?: string;
    readonly metadata?: Readonly<Record<string, string | number | boolean | null>>;
    readonly error?: {
        readonly name: string;
        readonly message: string;
        readonly stack?: string;
    };
}

export interface RendererLogResponse {
    readonly accepted: true;
}

export interface DatabaseHealthRequest {
    readonly operation: "health";
}

export interface DatabaseHealthResponse {
    readonly status: "ok";
    readonly path: string;
    readonly open: boolean;
}

export interface TaleMasterIpcChannels extends ProfileIpcChannels {
    "logging:write": IpcRequestChannel<RendererLogRequest, RendererLogResponse>;
    "database:request": IpcRequestChannel<DatabaseHealthRequest, DatabaseHealthResponse>;
}

export const IPC_CHANNELS = {
    loggingWrite: "logging:write",
    databaseRequest: "database:request",
    profilesRequest: "profiles:request",
} as const satisfies Record<string, keyof TaleMasterIpcChannels>;
