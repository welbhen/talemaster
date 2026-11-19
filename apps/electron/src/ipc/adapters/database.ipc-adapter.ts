import type { IpcMainRegistrar } from "@talemaster/ipc-bridge";
import type { DatabaseContext } from "@talemaster/database";
import type { TaleMasterIpcChannels } from "../ipc-contracts";
import { IPC_CHANNELS } from "../ipc-contracts";

function validateDatabaseRequest(value: unknown): void {
    if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(value) ||
        (value as Record<string, unknown>).operation !== "health" ||
        Object.keys(value).length !== 1
    ) {
        throw new TypeError("Invalid database request.");
    }
}

export function createDatabaseIpcAdapter(database: DatabaseContext) {
    return {
        register(
            registrar: IpcMainRegistrar<TaleMasterIpcChannels>,
        ): void {
            registrar.handle(IPC_CHANNELS.databaseRequest, (input) => {
                validateDatabaseRequest(input);

                return {
                    status: "ok",
                    path: database.path,
                    open: database.connection.open,
                } as const;
            });
        },
    };
}
