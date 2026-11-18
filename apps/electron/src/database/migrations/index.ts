import { initialMigration } from "./001-initial";
import type { Migration } from "./migration.types";

export const migrations: readonly Migration[] = [initialMigration];
