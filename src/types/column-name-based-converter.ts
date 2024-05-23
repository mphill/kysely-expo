import { ValidTypes } from "../converters/introspection";

// Manage the type of a SQLite column by its name.
export type ColumnNameBasedConverter = {
  type: ValidTypes;
  match: (value: string) => boolean;
};
