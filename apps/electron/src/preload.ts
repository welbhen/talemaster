/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { contextBridge, ipcRenderer } from "electron";
import { createIpcInvoker } from "@talemaster/ipc-bridge";
import type { TaleMasterIpcChannels } from "./ipc/ipc-contracts";

const ipc = createIpcInvoker<TaleMasterIpcChannels>((channel, request) =>
    ipcRenderer.invoke(channel, request),
);

/**
 * Explicit capability API. Do not expose ipcRenderer, channel names,
 * send(), or invoke() directly to the renderer.
 */
const electronAPI = {
    platform: process.platform,
    logging: {
        write: (request: {
            readonly level: "LOG" | "WARN" | "DEBUG" | "ERROR";
            readonly message: string;
            readonly context?: string;
            readonly metadata?: Readonly<Record<string, string | number | boolean | null>>;
            readonly error?: {
                readonly name: string;
                readonly message: string;
                readonly stack?: string;
            };
        }) => ipc.invoke("logging:write", request),
    },
    database: {
        health: () => ipc.invoke("database:request", { operation: "health" }),
    },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
