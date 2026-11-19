import type { IpcMainEvent, IpcMainInvokeEvent, WebContents, WebFrameMain } from "electron";
import { BrowserWindow } from "electron";

type IpcSenderEvent = IpcMainEvent | IpcMainInvokeEvent;

export interface IpcSecurityOptions {
    readonly getMainWindow: () => BrowserWindow | null;
    /**
     * In development, compare the sender's origin to this exact origin,
     * e.g. http://localhost:4200.
     */
    readonly developmentOrigin?: string;
    /**
     * In production, compare the sender's complete URL to the expected
     * packaged renderer file URL.
     */
    readonly productionUrl: string;
}

function getFrameUrl(frame: WebFrameMain | null): URL {
    if (!frame) {
        throw new Error("IPC request rejected: sender frame is unavailable.");
    }

    try {
        return new URL(frame.url);
    } catch {
        throw new Error("IPC request rejected: sender URL is invalid.");
    }
}

export function createIpcSecurity(options: IpcSecurityOptions) {
    const expectedDevelopmentOrigin = options.developmentOrigin
        ? new URL(options.developmentOrigin).origin
        : undefined;
    const expectedProductionUrl = new URL(options.productionUrl).href;

    return {
        assertTrustedSender(event: IpcSenderEvent): void {
            const mainWindow = options.getMainWindow();

            if (!mainWindow || mainWindow.isDestroyed()) {
                throw new Error("IPC request rejected: application window is unavailable.");
            }

            const sender = event.sender;
            const senderFrame = event.senderFrame;

            if (
                sender.isDestroyed() ||
                sender !== mainWindow.webContents ||
                !senderFrame ||
                senderFrame !== sender.mainFrame
            ) {
                throw new Error("IPC request rejected: untrusted sender.");
            }

            const senderUrl = getFrameUrl(senderFrame);

            if (expectedDevelopmentOrigin) {
                if (senderUrl.origin !== expectedDevelopmentOrigin) {
                    throw new Error("IPC request rejected: untrusted renderer origin.");
                }
                return;
            }

            if (senderUrl.href !== expectedProductionUrl) {
                throw new Error("IPC request rejected: unexpected packaged renderer URL.");
            }
        },
    };
}
