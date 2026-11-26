/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { ErrorHandler, Injectable, inject } from "@angular/core";
import { LoggerService } from "./logger.service";

@Injectable()
export class RendererErrorHandler implements ErrorHandler {
    private readonly logger = inject(LoggerService);

    handleError(error: unknown): void {
        this.logger.error("Unhandled Angular renderer error", error);
    }
}
