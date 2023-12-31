import { Kysely } from "kysely";
import React, {
  PropsWithChildren,
  createContext,
  useContext,
  useState,
} from "react";
import { ExpoDialect } from "./driver";
import { ExpoDialectConfig } from "./types/expo-dialect-config";

// Create the context
const KyselyContext = createContext<Kysely<any> | null>(null);

// Create the provider component
export default function KyselyProvider<T>({
  children,
  database,
}: PropsWithChildren & ExpoDialectConfig) {
  const [kyselyContext, setKyselyContext] = useState<Kysely<T>>();

  if (!database) throw new Error("database is required");

  const dialect = new ExpoDialect({
    disableStrictModeCreateTable: false,
    database: database,
    debug: true,
    autoAffinityConversion: true,
  });

  if (!kyselyContext) {
    const database = new Kysely<T>({
      dialect,
    });

    setKyselyContext(database);

    return null;
  }

  return (
    <KyselyContext.Provider value={kyselyContext}>
      {children}
    </KyselyContext.Provider>
  );
}

// Export the custom hook
function useKysely<T>(): Kysely<T> {
  return useContext(KyselyContext) as Kysely<T>;
}

export { useKysely };

// dialect
// .createDriver()
// .getDatabaseRuntimeVersion()
// .then((version) => {
//   console.log("database version", version);
// }, console.error);
