
# Kysely Expo

Support for Kysely with Expo SQLite https://docs.expo.dev/versions/latest/sdk/sqlite/

Kysely is a type-safe SQL query builder that conveintly generates and executes SQL. Visit https://github.com/kysely-org/kysely for more information.


## Getting Started

`npx expo install expo-file-system kysely expo-sqlite`

```ts
import { ExpoDialect } from "kysely-expo";

interface LogTable {
  id: Generated<number>;
  message: string;
  created_at: string;
}

export type Database = {
  logs: LogTable;
};

const database = new Kysely<Database>({
  dialect: new ExpoDialect({
    database: "expo-sqlite.db",
  }),
});

```
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

- [ ] Transaction Support
- [ ] Sample application with tests
- [ ] Date helpers
