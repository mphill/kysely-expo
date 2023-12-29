import { TypeConverter } from "./type-converter";

export type ExpoDialectConfig = {
  // Name of the database file.
  database: string;
  // Disable foreign key constraints. i.e. insert a row with a non-existing foreign key.
  disableForeignKeys?: boolean;
  // Disable naming convention casts. i.e. automatically convert 1 to true and 0 to false.
  disableNamingConventionCasts?: boolean;
  // Disable STRICT mode when creating tables.
  disableStrictModeCreateTable?: boolean;
  debug?: boolean;
  typeConverters?: TypeConverter;
};
