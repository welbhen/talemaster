/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

export type {
    IpcChannelMap,
    IpcHandler,
    IpcMainRegistrar,
    IpcRendererInvoker,
    IpcRequestChannel,
    IpcRequestOf,
    IpcResponseOf,
} from "./lib/ipc.types";

export { createIpcInvoker } from "./lib/ipc-invoker";
