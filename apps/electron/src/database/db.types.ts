import type Database from "better-sqlite3";

export interface DatabaseOptions {
    readonly directory: string;
}

export interface DatabaseContext {
    readonly connection: Database.Database;
    readonly path: string;
}
