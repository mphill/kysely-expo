# Kysely Expo
Support for Kysely with Expo SQLite https://docs.expo.dev/versions/latest/sdk/sqlite/

Kysely is a type-safe SQL query builder that conveniently generates and executes SQL. Visit https://github.com/kysely-org/kysely for more information.


## Requirements
* SDK 50+

# Supported Platforms
* iOS
* Android

## Getting Started
- Install kysely-expo

`yarn add https://github.com/mphill/kysely-expo`

or 

`npm i https://github.com/mphill/kysely-expo`


## ExpoDialect Features

### STRICT Table Support

Kysely does not support `STRICT` mode for SQLite officially.  Kysely Expo automatically creates tables with `STRICT` mode enabled by default.  This can be disabled by setting the `disableStrictMode` option to `true`.

`STRICT` tables offer many advantages to keep your data consistent, portable and clean.

The biggest advantage is enforcing and limiting the types you can use to store data to actual SQLite supported types. For example, if you try to create at `DATETIME` column with `STRICT` mode on, the database will throw an error. This is a huge advantage over SQLite's default behavior of silently ignoring types, potentially producing unexpected results.

Supported types in STRICT mode:

- `INT`
- `INTEGER`
- `REAL`
- `TEXT`
- `BLOB`
- `ANY`

For more information, see https://www.sqlite.org/stricttables.html

### Auto Affinity Converter

SQLite only has support for 3 basic types: string, number and real (you can consider blob).  SQLite doesn't support Date or booleans, its actually a string or integer for dates and an 0 or 1 for boolean (typically).  It would be annoying to have to convert all your dates to strings and booleans to 0 or 1 and vice versa.

if you set autoAffinityConversion to true, Expo Kysely will automatically attempt to convert your date automatically so you don't have to worry about doing the conversion yourself.

## Usage

```ts
import { ExpoDialect } from "kysely-expo";
import { Generated } from "kysely";

interface LogTable {
  id: Generated<number>;
  message: string;
  created_at: Generated<Date>
}

interface Database {
  logs: LogTable;
}

const database = new Kysely<Database>({
  dialect: new ExpoDialect({
    database: "expo-sqlite.db", // Name of the database file, will be created if it doesn't exist.
    debug: true, // Show SQL statements in console
    disableStrictMode: false, // Disable STRICT mode for tables
    autoAffinityConversion: true, // Automatically convert SQLite types to JS types
  }),
});

await database
  .insertInto("logs")
  .values({
    message: "Important log message",
    created_at: new Date(),
  })
  .execute();
```

## Migration Support

Normally migrations would be placed in a migrations folder and the Node.js fs module reads the files. With React Native and Expo, file system access must be done through a special library https://docs.expo.dev/versions/latest/sdk/filesystem/

Libraries that use the Node.js fs modules don't work with Expo or React Native and require modifications or extension.

It may be possible to bundle the migration in the assets folder, but currently they must be included in your main application's source code.

**Migration Example:**


```ts
const migrator = new Migrator({
  db: data.database,
  provider: new ExpoMigrationProvider({
    migrations: {
      "1": {
        up: async (db: Kysely<Database>) => {
          console.log("running migration 1");
          const result = await db.schema
            .createTable("logs")
            .addColumn("id", "integer", (col) =>
              col.primaryKey().autoIncrement()
            )
            .addColumn("message", "text", (col) => col.notNull())
            .addColumn("created_at", "text", (col) => col.notNull())
            .execute();
        },
      },
    },
  }),
});


const result = await migrator.migrateToLatest();

```

## Todo

- [ ] Transaction support