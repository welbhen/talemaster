/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

jest.mock("electron", () => ({
    ipcMain: {
        handle: jest.fn(),
        removeHandler: jest.fn(),
    },
}));

import { ipcMain } from "electron";
import { registerIpc } from "./ipc-registration";

describe("registerIpc", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("authorizes every request before dispatching to its adapter", async () => {
        const assertTrustedSender = jest.fn();
        const adapterHandler = jest.fn().mockResolvedValue({ accepted: true });
        const adapter = {
            register: (registrar: {
                handle: (
                    channel: string,
                    handler: (event: unknown, request: unknown) => unknown,
                ) => void;
            }) => {
                registrar.handle("logging:write", adapterHandler as never);
            },
        };

        registerIpc({
            assertTrustedSender,
            adapters: [adapter as never],
        });

        const registeredHandler = (ipcMain.handle as jest.Mock).mock.calls[0][1];
        const event = { sender: "trusted" };
        await expect(registeredHandler(event, { message: "hello" })).resolves.toEqual({
            accepted: true,
        });

        expect(assertTrustedSender).toHaveBeenCalledWith(event);
        expect(adapterHandler).toHaveBeenCalledWith({ message: "hello" });
    });

    it("does not dispatch when sender authorization fails", async () => {
        const authorizationError = new Error("untrusted sender");
        const adapterHandler = jest.fn();
        const adapter = {
            register: (registrar: {
                handle: (
                    channel: string,
                    handler: (event: unknown, request: unknown) => unknown,
                ) => void;
            }) => {
                registrar.handle("logging:write", adapterHandler as never);
            },
        };

        const registration = registerIpc({
            assertTrustedSender: () => {
                throw authorizationError;
            },
            adapters: [adapter as never],
        });

        const registeredHandler = (ipcMain.handle as jest.Mock).mock.calls[0][1];
        await expect(registeredHandler({}, {})).rejects.toBe(authorizationError);
        expect(adapterHandler).not.toHaveBeenCalled();

        registration.dispose();
        expect(ipcMain.removeHandler).toHaveBeenCalledWith("logging:write");
    });

    it("removes all registered application channels when disposed", () => {
        const registration = registerIpc({ assertTrustedSender: jest.fn(), adapters: [] });

        registration.dispose();
        registration.dispose();

        expect(ipcMain.removeHandler).toHaveBeenCalledTimes(2);
        expect(ipcMain.removeHandler).toHaveBeenCalledWith("logging:write");
        expect(ipcMain.removeHandler).toHaveBeenCalledWith("database:request");
    });
});
