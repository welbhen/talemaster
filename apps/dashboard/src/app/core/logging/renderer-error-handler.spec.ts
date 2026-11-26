/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { TestBed } from "@angular/core/testing";
import { LoggerService } from "./logger.service";
import { RendererErrorHandler } from "./renderer-error-handler";

describe("RendererErrorHandler", () => {
    it("forwards framework errors to the renderer logger", () => {
        const logger = { error: jest.fn() };
        TestBed.configureTestingModule({
            providers: [RendererErrorHandler, { provide: LoggerService, useValue: logger }],
        });

        const error = new Error("component failed");
        TestBed.inject(RendererErrorHandler).handleError(error);

        expect(logger.error).toHaveBeenCalledWith("Unhandled Angular renderer error", error);
    });
});
