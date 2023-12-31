import MainScreen, { Database } from "./screens/main";
import { KyselyProvider, useKysely } from "kysely-expo";
import React from "react";
import { getMigrator } from "./migrations";

export default function App() {
  return (
    <KyselyProvider<Database>
      database="cars-db2.sqlite"
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
