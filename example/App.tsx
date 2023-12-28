import { StatusBar } from "expo-status-bar";
import { Generated, Kysely, Migrator, sql } from "kysely";
import { ExpoDialect, ExpoMigrationProvider } from "kysely-expo";
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as FileSystem from "expo-file-system";

interface LogTable {
  id: Generated<number>;
  message: string;
  is_error: boolean;
  created_at: Generated<Date>;
}

interface Database {
  logs: LogTable;
}

export default function App() {
  const [consoleText, setConsoleText] = useState("");
  const [showQuery, setShowQuery] = useState(false);

  const dialect = new ExpoDialect({
    database: "example-sqlite1.db",
    debug: showQuery,
  });

  const database = new Kysely<Database>({
    dialect,
  });

  const migrator = new Migrator({
    db: database,
    provider: new ExpoMigrationProvider({
      migrations: {
        "1": {
          up: async (db: Kysely<Database>) => {
            console.log("running migration 1");

            await db.schema
              .createTable("logs")
              .modifyEnd(sql`STRICT`)
              .addColumn("id", "integer", (col) =>
                col.primaryKey().autoIncrement(),
              )
              .addColumn("message", "text", (col) => col.notNull())
              .addColumn("is_error", "integer", (col) => col.notNull())
              .addColumn("created_at", "text", (col) => col.notNull())
              .execute();
          },
        },
      },
    }),
  });

  useMemo(
    () =>
      migrator.migrateToLatest().then((result) => {
        console.log("migration result", result);
      }),
    [],
  );

  useEffect(() => {
    console.log(
      `Database path: ${decodeURIComponent(FileSystem.documentDirectory)}`,
    );

    dialect
      .createDriver()
      .getDatabaseRuntimeVersion()
      .then((version) => {
        console.log("database version", version);
      });
  }, []);

  const handleInsert = async () => {
    const result = await database
      .insertInto("logs")
      .values({
        message: "Important log message",
        is_error: Math.random() < 0.5 ? true : false, // Randomly true or false
        created_at: new Date(),
      })
      .execute();

    setConsoleText(`Inserted record with primary key: ${result[0].insertId}`);
  };

  const handleSelect = async () => {
    const logs = await database.selectFrom("logs").selectAll().execute();

    console.log(logs);
    const text = logs
      .map(
        (log) =>
          `${log.message} @ ${log.created_at.toDateString()} : error = ${
            log.is_error
          }`,
      )
      .join("\n");

    setConsoleText(text);
  };

  const handleDelete = async () => {
    const record = await database
      .selectFrom("logs")
      .select(["id"])
      .limit(1)
      .executeTakeFirst();

    if (record !== undefined) {
      await database.deleteFrom("logs").where("id", "=", record.id).execute();

      setConsoleText(`Deleted record with primary key: ${record.id}`);
    } else {
      setConsoleText("No records to delete");
    }
  };

  const handleUpdate = async () => {
    const record = await database
      .updateTable("logs")
      .set({ message: `Updated message at ${new Date()}` })
      .executeTakeFirst();

    setConsoleText(`Matching rows ${record?.numUpdatedRows}`);
  };

  return (
    <View style={{ ...styles.container, paddingTop: 50 }}>
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{
            display: "flex",
            borderColor: "white",
            borderWidth: 1,
            borderRadius: 5,
          }}
        >
          <TextInput
            multiline
            value={consoleText}
            style={{ padding: 10, color: "#39FF14", width: "100%" }}
          />
        </ScrollView>
      </View>
      <View style={{ flex: 1 }}>
        <View
          style={{
            justifyContent: "center",
            flexDirection: "row",

            alignItems: "center",
          }}
        >
          <Text style={styles.text}>Show query</Text>
          <Switch value={showQuery} onValueChange={setShowQuery} />
        </View>

        <Button title="Insert" onPress={handleInsert} />
        <Button title="Select" onPress={handleSelect} />
        <Button title="Delete" onPress={handleDelete} />
        <Button title="Update" onPress={handleUpdate} />
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 30,
    backgroundColor: "#000",
  },

  text: {
    paddingHorizontal: 5,
    color: "#fff",
  },
});
