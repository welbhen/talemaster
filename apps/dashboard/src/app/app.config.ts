/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { provideHttpClient } from "@angular/common/http";
import {
    ApplicationConfig,
    ErrorHandler,
    isDevMode,
    provideBrowserGlobalErrorListeners,
} from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideTransloco } from "@jsverse/transloco";
import { provideOptimus } from "@openng/optimus-ui/config";
import Material from "@openng/optimus-ui-themes/material";
import { appRoutes } from "./app.routes";
import { RendererErrorHandler } from "./core/logging/renderer-error-handler";
import { TranslocoHttpLoader } from "./transloco-loader";

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        { provide: ErrorHandler, useClass: RendererErrorHandler },
        provideRouter(appRoutes),
        provideHttpClient(),
        provideTransloco({
            config: {
                availableLangs: ["en-US", "pt-BR"],
                defaultLang: "en-US",
                fallbackLang: "en-US",
                reRenderOnLangChange: true,
                prodMode: !isDevMode(),
            },
            loader: TranslocoHttpLoader,
        }),
        provideOptimus({
            theme: {
                preset: Material,
            },
        }),
    ],
};
