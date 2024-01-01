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
      autoAffinityConversion
      debug
      onInit={(database) =>
        getMigrator(database).migrateToLatest().then(console.log, console.error)
      }
    >
      <MainScreen />
    </KyselyProvider>
  );
}
