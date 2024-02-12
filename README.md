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

## SQLite Type Converters

SQLite has support for four basic types: `string`, `number` (integer), `real` (decimal), and `blob` (binary).  SQLite doesn't support `Date`, `boolean`, `object`, etc... 

Using a `boolean` as an example, SQLite will store it as a `1` / 0 or `"true"` / "false".  When you read data out, you will see a number or string - not a boolean.  

Kysely Expo offers two converters to help make this conversion transparent.

### Auto Affinity Conversion (Experimental)

Setting `autoAffinityConversion` to `true` will automatically attempt to manage these conversions for you. 

Limitations:** Booleans are stored as `"true"` or `"false"`.  If you control all your inputs and prohibit `"true"` or "false" for string fields, this is generally completely safe.

### Column Name-Based Conversion

Setting `columnNameBasedConversion` to `ColumnNameBasedConverter[]` will automatically map columns based on a naming convention to the types you specify. 

For instance, if all of your columns that end with `_at` are dates, you can add this:

```ts
{
  type: "datetime",
  match: (column) => column.endsWith("_at"),
},
```

Columns named "`created_at`", "`updated_at`", "`deleted_at`" etc will all be converted to a `Date` type.  Rules are processed in the order they are defined.

**Only one converter can be used at a time, specifying both will result in an exception being thrown.**

### Type Conversion Matrix

| Typescript   | SQLite Type                           | Kysely Expo Type                            |
| ------------ | ------------------------------------- | ------------------------------------------- |
| `boolean`    | `TEXT` "true" \| "false"              | `SQLiteType.Boolean`                        |
| `string`     | `TEXT`                                | `SQLiteType.String`                         |
| `Date`       | `TEXT` ISO-8601 (YYYY-MM-DD HH:MM:SS) | `SQLiteType.DateTime`                       |
| `number`     | `INTEGER` or `REAL`                   | `SQLiteType.Integer` or `SQLiteType.Number` |
| `any`        | `any`                                 | `SQLiteType.Any`                            |
| `Uint8Array` | `BLOB`                                | `SQLiteType.Blob`                           |
| `object`     | `TEXT`                                | `SQLiteType.Json`                           |



## Blob Support

Using the `blob` type is it possible to store binary data in your SQLite instance.  If you are planning to store files, this is not recommended.  It's better to store the files in the [documents directory](https://docs.expo.dev/versions/latest/sdk/filesystem/) and store a path reference in your SQLite database.


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
- [ ] Better BigInt support