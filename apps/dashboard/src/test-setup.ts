/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { setupZonelessTestEnv } from "jest-preset-angular/setup-env/zoneless";

setupZonelessTestEnv({
    errorOnUnknownElements: true,
    errorOnUnknownProperties: true,
});
