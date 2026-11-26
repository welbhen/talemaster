/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Logger } from "@talemaster/logging";

/**
 * Handles a fatal application-boundary failure. Logging is best-effort; quitting
 * is guaranteed even if a logger implementation unexpectedly throws.
 */
export function handleApplicationError(
    context: string,
    error: unknown,
    logger: Logger | undefined,
    quit: () => void,
): void {
    try {
        if (logger) {
            logger.error(context, error);
        } else {
            console.error(context, error);
        }
    } catch (loggingError) {
        try {
            console.error("Failed to report an application error:", loggingError, error);
        } catch {
            // The process must still reach the shutdown action.
        }
    } finally {
        quit();
    }
}
