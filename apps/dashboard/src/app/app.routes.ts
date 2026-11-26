/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { Route } from "@angular/router";
import { ProfileManagementComponent } from "./core/profiles/profile-management.component";

export const appRoutes: Route[] = [
    { path: "", component: ProfileManagementComponent },
    { path: "profiles", component: ProfileManagementComponent },
    { path: "**", redirectTo: "" },
];
