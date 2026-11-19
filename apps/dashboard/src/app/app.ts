/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component } from "@angular/core";
import { RouterModule } from "@angular/router";

@Component({
    imports: [RouterModule],
    selector: "app-root",
    templateUrl: "./app.html",
    styleUrl: "./app.scss",
})
export class App {
    protected title = "dashboard";
}
