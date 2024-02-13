import MainScreen, { Database } from "./screens/main";
import { KyselyProvider, useKysely } from "kysely-expo";
import React, { useEffect } from "react";
import { getMigrator } from "./migrations";
import * as FileSystem from "expo-file-system";

export default function App() {
  useEffect(() => {
    console.log(`${FileSystem.documentDirectory}/SQLite/`);
  }, []);
  return (
    <KyselyProvider<Database>
      database="phones.db"
      autoAffinityConversion={false}
      columnNameBasedConversion={[
        {
          type: "datetime",
          match: (column) => column.endsWith("_at"),
        },
        {
          type: "boolean",
          match: (column) =>
            column.startsWith("is_") || column.startsWith("has_"),
        },
        {
          type: "object",
          match: (column) => {
            const objectTypes = [
              "meta_json",
              "array_type",
              "object_type",
              "record_type",
            ];
            return objectTypes.some((type) => column.includes(type));
          },
        },
      ]}
      debug={false}
      onInit={(database) =>
        getMigrator(database).migrateToLatest().then(console.log, console.error)
      }
    >
      <MainScreen />
    </KyselyProvider>
  );
}
