import type { IpcMainRegistrar } from "@talemaster/ipc-bridge";
import type { Logger } from "@talemaster/logging";
import type { RendererLogRequest, TaleMasterIpcChannels } from "../ipc-contracts";
import { IPC_CHANNELS } from "../ipc-contracts";

const MAX_MESSAGE_LENGTH = 8_000;
const MAX_CONTEXT_LENGTH = 200;
const MAX_METADATA_ENTRIES = 40;
const MAX_METADATA_STRING_LENGTH = 2_000;
const MAX_ERROR_MESSAGE_LENGTH = 4_000;
const MAX_ERROR_STACK_LENGTH = 12_000;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateLogRequest(value: unknown): RendererLogRequest {
    if (!isRecord(value)) {
        throw new TypeError("Invalid logging payload.");
    }

    const { level, message, context, metadata, error } = value;

    if (level !== "LOG" && level !== "WARN" && level !== "DEBUG" && level !== "ERROR") {
        throw new TypeError("Invalid log level.");
    }

    if (
        typeof message !== "string" ||
        message.trim().length === 0 ||
        message.length > MAX_MESSAGE_LENGTH
    ) {
        throw new TypeError("Invalid log message.");
    }

    if (
        context !== undefined &&
        (typeof context !== "string" || context.length > MAX_CONTEXT_LENGTH)
    ) {
        throw new TypeError("Invalid log context.");
    }

    let validatedMetadata: RendererLogRequest["metadata"];

    if (metadata !== undefined) {
        if (!isRecord(metadata) || Object.keys(metadata).length > MAX_METADATA_ENTRIES) {
            throw new TypeError("Invalid log metadata.");
        }

        for (const item of Object.values(metadata)) {
            if (
                item !== null &&
                typeof item !== "string" &&
                typeof item !== "number" &&
                typeof item !== "boolean"
            ) {
                throw new TypeError("Log metadata must contain primitive values.");
            }

            if (typeof item === "string" && item.length > MAX_METADATA_STRING_LENGTH) {
                throw new TypeError("Log metadata value is too long.");
            }

            if (typeof item === "number" && !Number.isFinite(item)) {
                throw new TypeError("Log metadata numbers must be finite.");
            }
        }

        validatedMetadata = metadata as RendererLogRequest["metadata"];
    }

    let validatedError: RendererLogRequest["error"];

    if (error !== undefined) {
        if (
            !isRecord(error) ||
            typeof error.name !== "string" ||
            typeof error.message !== "string" ||
            error.name.length > 200 ||
            error.message.length > MAX_ERROR_MESSAGE_LENGTH ||
            (error.stack !== undefined &&
                (typeof error.stack !== "string" || error.stack.length > MAX_ERROR_STACK_LENGTH))
        ) {
            throw new TypeError("Invalid serialized error.");
        }

        validatedError = {
            name: error.name,
            message: error.message,
            ...(typeof error.stack === "string" ? { stack: error.stack } : {}),
        };
    }

    return {
        level,
        message,
        ...(typeof context === "string" ? { context } : {}),
        ...(validatedMetadata !== undefined ? { metadata: validatedMetadata } : {}),
        ...(validatedError !== undefined ? { error: validatedError } : {}),
    };
}

export function createLoggingIpcAdapter(logger: Logger) {
    return {
        register(registrar: IpcMainRegistrar<TaleMasterIpcChannels>): void {
            registrar.handle(IPC_CHANNELS.loggingWrite, (input) => {
                const request = validateLogRequest(input);

                const metadata =
                    request.metadata !== undefined || request.context !== undefined
                        ? {
                              ...request.metadata,
                              ...(request.context !== undefined
                                  ? { context: request.context }
                                  : {}),
                          }
                        : undefined;

                const error = request.error
                    ? Object.assign(new Error(request.error.message), {
                          name: request.error.name,
                          stack: request.error.stack,
                      })
                    : undefined;

                switch (request.level) {
                    case "LOG":
                        logger.log(request.message, metadata);
                        break;
                    case "WARN":
                        logger.warn(request.message, metadata);
                        break;
                    case "DEBUG":
                        logger.debug(request.message, metadata);
                        break;
                    case "ERROR":
                        logger.error(request.message, error, metadata);
                        break;
                }

                return { accepted: true } as const;
            });
        },
    };
}
