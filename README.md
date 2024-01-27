# Kysely Expo
Support for [Kysely](https://github.com/kysely-org/kysely) with [Expo SQLite (Next)](https://docs.expo.dev/versions/v50.0.0/sdk/sqlite-next/)


## Requirements
* Expo SDK 50+
* Android / iOS

## Getting Started
- Install kysely-expo

`yarn add kysely-expo`

or 

`npm i kysely-expo`


## KyselyProvider
Wrap the Expo app in the <KyselyProvider> component.  This component will initialize the database and provide consistent access to the Kysely instance.

## Dialect Features

### STRICT Table Support
By default, this library will automatically create tables with `STRICT` mode enabled.  This can be disabled by setting the `disableStrictMode` option to `true`.

`STRICT` tables offer many advantages to keep data consistent, portable, and clean.

Supported types in STRICT mode:

- `INT`
- `INTEGER`
- `REAL`
- `TEXT`
- `BLOB`
- `ANY`

For more information, see https://www.sqlite.org/stricttables.html

### Auto Affinity Converter (Experimental)

SQLite has support for four basic types: string, number (integer), real (decimal), and blob (binary).  SQLite doesn't support `Date` or `boolean`, it's a string or integer for dates and a 0 or 1 for boolean (typically).  It would be annoying to have to convert all your dates to strings and booleans to 0 or 1 and vice versa.

| Typescript   | SQLite                       | Kysely Expo Type                                    |
| ------------ | ---------------------------- | ------------------------------------------ |
| `boolean`    | `TEXT` "true" \| "false"   | `SQLiteType.Boolean`                      |
| `string`     | `TEXT`                       | `SQLiteType.String`                       |
| `Date`       | `TEXT` ISO-8601 (YYYY-MM-DD HH:MM:SS) | `SQLiteType.DateTime`                     |
| `number`     | `INTEGER` or `REAL`        | `SQLiteType.Integer` or `SQLiteType.Number` |
| `any`        | `any`                        | `SQLiteType.Any`                          |
| `Uint8Array` | `BLOB`                       | `SQLiteType.Blob`                         |
| `object`     | `TEXT`                       | `SQLiteType.Json`                         |

Setting `autoAffinityConversion` to `true` will automatically attempt to manage these conversions for you. 

### File Storage Support

Using the `blob` type is it possible to store binary data in your SQLite instance. 


## Usage Example

```tsx
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

export default function App() {
  return (
    <KyselyProvider<Database>
      database="logs.db"
      autoAffinityConversion
      debug
      onInit={(database) =>
        // run migrations here
      }
    >
      <MainScreen />
    </KyselyProvider>
  );
}


function MainScreen() {
        
  const { database } = useKysely<Database>();
  
  const handleInsert = async () => {
    const result = await database
      .insertInto("logs")
      .values({
        message: "Important log message",
        created_at: new Date(),
      })
      .execute();
  }

  return (
    <View>
      <Button onPress={handleInsert} title="Insert" />
    </View>
  );
}

```

## Migration Support


```ts
const migrator = new Migrator({
  db: data.database,
  provider: new ExpoMigrationProvider({
    migrations: {
      "migration1": {
        up: async (db: Kysely<Database>) => {
          console.log("running migration 1");
          const result = await db.schema
            .createTable("logs")
            .addColumn("id", "integer", (col) =>
              col.primaryKey().autoIncrement()
            )
            .addColumn("message", SQLiteTypes.String, (col) => col.notNull())
            .addColumn("created_at", SQLiteTypes.DateTime, (col) => col.notNull())
            .execute();
        },
      },
    },
  }),
});


const result = await migrator.migrateToLatest();

```

## Sample App

A sample Expo app is included in the `example` folder.  It is a simple app that uses Expo SQLite and Kysely to create a database and perform basic CRUD operations.  React Native applications do not support `npm link` so `yarn setup` will copy the files locally.

To run the example app:

1. Clone the repo: git clone https://github.com/mphill/kysely-expo.git
2. `yarn build`
3. `cd example`
4. `yarn install`
5. `yarn setup`
6. `npx expo start`

## Roadmap

- [ ] Streaming support