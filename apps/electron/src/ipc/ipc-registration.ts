/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcMain, type IpcMainInvokeEvent } from "electron";
import type { IpcMainRegistrar } from "@talemaster/ipc-bridge";
import type { TaleMasterIpcChannels } from "./ipc-contracts";
import { IPC_CHANNELS } from "./ipc-contracts";

export interface IpcAdapter {
    register(registrar: IpcMainRegistrar<TaleMasterIpcChannels>): void;
}

export interface IpcRegistrationOptions {
    readonly assertTrustedSender: (event: IpcMainInvokeEvent) => void;
    readonly adapters: readonly IpcAdapter[];
}

const REGISTERED_CHANNELS = Object.values(IPC_CHANNELS);

export interface IpcRegistration {
    dispose(): void;
}

/**
 * Registers all application IPC adapters behind one authorization boundary.
 * The renderer never receives access to ipcMain or arbitrary channel names.
 */
export function registerIpc(options: IpcRegistrationOptions): IpcRegistration {
    const registrar: IpcMainRegistrar<TaleMasterIpcChannels> = {
        handle(channel, handler): void {
            ipcMain.handle(channel, async (event, request: unknown) => {
                options.assertTrustedSender(event);
                return handler(request as never);
            });
        },
    };

    try {
        for (const adapter of options.adapters) {
            adapter.register(registrar);
        }
    } catch (registrationError) {
        for (const channel of REGISTERED_CHANNELS) {
            ipcMain.removeHandler(channel);
        }
        throw registrationError;
    }

    let disposed = false;

    return {
        dispose(): void {
            if (disposed) return;

            for (const channel of REGISTERED_CHANNELS) {
                ipcMain.removeHandler(channel);
            }
            disposed = true;
        },
    };
}
