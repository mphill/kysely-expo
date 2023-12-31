import { Kysely } from "kysely";
import React, {
  PropsWithChildren,
  createContext,
  useContext,
  useState,
} from "react";
import { ExpoDialect } from "./driver";
import { ExpoDialectConfig } from "./types/expo-dialect-config";

// @todo figure out how to make this a generic context that works everywhere - if that is possible.
const KyselyContext = createContext<Kysely<any> | null>(null);

// Create the provider component
export default function KyselyProvider<T>({
  children,
  database,
  onInit,
  disableForeignKeys,
  disableStrictModeCreateTable,
  autoAffinityConversion,
  debug,
}: PropsWithChildren &
  ExpoDialectConfig & { onInit?: (kysely: Kysely<T>) => void }) {
  const [kyselyContext, setKyselyContext] = useState<Kysely<T>>();

  if (!database) throw new Error("database is required");

  const dialect = new ExpoDialect({
    disableStrictModeCreateTable,
    database,
    debug,
    autoAffinityConversion,
    disableForeignKeys,
  });

  if (!kyselyContext) {
    const database = new Kysely<T>({
      dialect,
    });

    if (onInit) {
      onInit(database);
    }

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