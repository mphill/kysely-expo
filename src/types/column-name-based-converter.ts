import { ValidTypes } from "../converters/introspection";

// Manage the type of a SQLite column by its name.
export type ColumnNameBasedConverter = {
  type: Exclude<ValidTypes, "datetime" | "boolean" | "object" | "blob">;
  match: (value: string) => boolean;
};
