export type ExpoDialectConfig = {
  // Name of the database file.
  database: string;
  // Disable foreign key constraints. i.e. insert a row with a non-existing foreign key.
  disableForeignKeys?: boolean;
  // Disable STRICT mode when creating tables.
  disableStrictModeCreateTable?: boolean;
  debug?: boolean;
  autoAffinityConversion?: boolean;
};
