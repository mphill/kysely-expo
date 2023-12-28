import { StatusBar } from "expo-status-bar";
import { Kysely, Migrator, sql } from "kysely";
import { ExpoDialect, ExpoMigrationProvider } from "kysely-expo";
import { useEffect, useMemo, useState } from "react";
import { Button, ScrollView, StyleSheet, TextInput, View } from "react-native";
import * as FileSystem from "expo-file-system";
import { BrandTable } from "./tables/brand-table";
import { PhoneTable } from "./tables/phone-table";

interface Database {
  brands: BrandTable;
  phones: PhoneTable;
}

const dialect = new ExpoDialect({
  database: "cars-sqlite3.db",
  debug: true,
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
            .createTable("brands")
            .modifyEnd(sql`STRICT`)
            .addColumn("id", "integer", (col) =>
              col.primaryKey().autoIncrement(),
            )
            .addColumn("name", "text", (col) => col.notNull().unique())
            .addColumn("created_at", "text", (col) => col.notNull())
            .ifNotExists()
            .execute();

          // Seed brands

          const brands = [
            { name: "Apple", created_at: new Date() },
            { name: "Samsung", created_at: new Date() },
            { name: "Google", created_at: new Date() },
          ];

          await db.insertInto("brands").values(brands).execute();

          await db.schema
            .createTable("phones")
            .addColumn("id", "integer", (col) =>
              col.primaryKey().autoIncrement(),
            )
            .addColumn("brand_id", "integer", (col) =>
              col.notNull().references("brands.id"),
            )
            .addColumn("name", "text", (col) => col.notNull().unique())
            .ifNotExists()
            .execute();

          // Seed phones

          const phones = [
            { brand_id: 1, name: "iPhone 12" },
            { brand_id: 1, name: "iPhone 12 Pro" },
            { brand_id: 1, name: "iPhone 12 Pro Max" },
            { brand_id: 2, name: "Galaxy S21" },
            { brand_id: 2, name: "Galaxy S21+" },
            { brand_id: 2, name: "Galaxy S21 Ultra" },
            { brand_id: 3, name: "Pixel 5" },
            { brand_id: 3, name: "Pixel 4a" },
            { brand_id: 3, name: "Pixel 4a 5G" },
          ];

          await db.insertInto("phones").values(phones).execute();
        },
      },
    },
  }),
});
export default function App() {
  const [consoleText, setConsoleText] = useState("");

  useMemo(
    () =>
      migrator.migrateToLatest().then((result) => {
        console.log("migration result", result);
      }),
    [],
  );

  useEffect(() => {
    console.debug(
      `Database path: ${decodeURIComponent(FileSystem.documentDirectory)}`,
    );

    dialect
      .createDriver()
      .getDatabaseRuntimeVersion()
      .then((version) => {
        console.log("database version", version);
      }, console.error);
  }, []);

  const getRandomNumberBetween = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1) + min);

  const handleInsert = async () => {
    console.log("inserting");

    database
      .insertInto("phones")
      .values({
        name: "iPhone " + getRandomNumberBetween(10, 15),
        brand_id: 1,
      })
      .execute()
      .then((result) => {
        console.log("insert result", result);
        setConsoleText(
          `Inserted record with primary key: ${result[0].insertId}`,
        );
      }, console.error);
  };

  const handleSelect = async () => {
    const phones = await database
      .selectFrom("phones")
      .innerJoin("brands", "phones.brand_id", "brands.id")
      .select(["brands.name as brand", "phones.name"])
      .orderBy("phones.name", "asc")
      .execute();

    console.log(phones);
    const text = phones
      .map((phone) => `${phone.name} ${phone.brand}`)
      .join("\n");

    setConsoleText(text);
  };

  const handleDelete = async () => {
    const record = await database
      .selectFrom("phones")
      .select(["id"])
      .limit(1)
      .executeTakeFirst();

    if (record !== undefined) {
      await database.deleteFrom("phones").where("id", "=", record.id).execute();

      setConsoleText(`Deleted record with primary key: ${record.id}`);
    } else {
      setConsoleText("No records to delete");
    }
  };

  const handleUpdate = async () => {
    const record = await database
      .updateTable("phones")
      .set({ created_at: new Date() })
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
        ></View>

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

  consoleText: {
    paddingHorizontal: 5,
    color: "#39FF14",
  },
});
