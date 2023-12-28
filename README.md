
# Kysely Expo
Support for Kysely with Expo SQLite https://docs.expo.dev/versions/latest/sdk/sqlite/

Kysely is a type-safe SQL query builder that conveintly generates and executes SQL. Visit https://github.com/kysely-org/kysely for more information.


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


### STRICT Table Support:

Kysely does not support `STRICT` mode for SQLite officially. To enable `STRICT` mode, use the following in your migration:

```ts
db.schema
  .createTable("table_name")
  .modifyEnd(sql`STRICT`)
  ...
  .execute();
```

`STRICT` tables offer many advantages to keep your data consistent, portable and clean.

The biggest advantage is enforcing and limiting the types you can use to store data to actual SQLite supported types. For example, if you try to create at `DATETIME` column with `STRICT` mode on, the database will throw an error. This is a huge advantage over SQLite's default behavior of silently ingoring types, potentially producing unexpected results.

Supported types in STRICT mode:

- `INT`
- `INTEGER`
- `REAL`
- `TEXT`
- `BLOB`
- `ANY`

For more information, see https://www.sqlite.org/stricttables.html

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

## Date and Boolean Support

SQLite doesn't support Date or booleans, its actually a string or integer for dates and an 0 or 1 for boolean (typically).  It would be annoying to have to convert all your dates to strings and booleans to 0 or 1 and vice versa.

It's also not practical or possible to try to analyze your result sets to determine the type of data returned. So as a solution this library has adopted a column naming convention that will apply transforms.

Depending on the name of the column it will convert `Date` and `boolean` types to the correct SQLite types if you following the naming conventions below.


This feature can be disabled by setting `disableNameBasedCasts: true` in the ExpoDialect options.


### Dates

Store dates as a `TEXT` type and ensure your column name ends with `_at`.  This library will automatically convert  an ISO8601 string to an Date object.

### Booleans
Store boolean as an `INTEGER` type and ensure your column starts with `is_`, `has_` or ends with `_flag`.  This library will automatically convert the 0 or 1 to a boolean.

These type converts can be overridden by using the `typeConverters` properties.




## Migration Support

Normally migrations would be placed in a migrations folder and the Node.js fs module reads the files. With React Native and Expo, file system access must be done through a special library https://docs.expo.dev/versions/latest/sdk/filesystem/

Libraries that use the Node.js fs modules don't work with Expo or React Native and require modifications or extension.

It may be possilble to bundle the migration in the assets folder, but currently they must be included in your main application's source code.

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
            .modifyEnd(sql`STRICT`)
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
- [ ] Expo 49 support

