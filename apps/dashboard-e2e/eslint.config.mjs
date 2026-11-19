/**
 * Copyright 2026 Welberth Marques
 * github.com/welbhen/talemaster
 * SPDX-License-Identifier: Apache-2.0
 */

import playwright from "eslint-plugin-playwright";
import baseConfig from "../../eslint.config.mjs";

export default [
    playwright.configs["flat/recommended"],
    ...baseConfig,
    {
        files: ["**/*.ts", "**/*.js"],
        // Override or add rules here
        rules: {},
    },
];
