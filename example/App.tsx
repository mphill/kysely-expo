import { StatusBar } from "expo-status-bar";
import { Kysely, Migrator, sql } from "kysely";
import { ExpoDialect, ExpoMigrationProvider } from "kysely-expo";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, ScrollView, StyleSheet, TextInput, View } from "react-native";
import * as FileSystem from "expo-file-system";
import { BrandTable } from "./tables/brand-table";
import { PhoneTable } from "./tables/phone-table";
import runner from "./tests";
import { getMigrator } from "./migrations";

export interface Database {
  brands: BrandTable;
  phones: PhoneTable;
}

const databaseName = "cars246.db";

const dialect = new ExpoDialect({
  disableStrictModeCreateTable: false,
  database: databaseName,
  debug: true,
  autoAffinityConversion: true,
});

const database = new Kysely<Database>({
  dialect,
});

export default function App() {
  const [consoleText, setConsoleText] = useState("");

  getMigrator(database).migrateToLatest().then(console.log, console.error);

  useEffect(() => {
    console.debug(
      `Database path: ${decodeURIComponent(
        FileSystem.documentDirectory,
      )}${databaseName}`,
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
    database
      .insertInto("phones")
      .values({
        name: "iPhone " + getRandomNumberBetween(3, 8),
        brand_id: 1,
        created_at: new Date(),
        is_active: false,
        meta_json: {
          foo: "bar",
          bar: 1,
        },
      })
      .execute()
      .then((result) => {
        setConsoleText(
          `Inserted record with primary key: ${result[0].insertId}`,
        );
      }, console.error);
  };

  const handleSelect = async () => {
    const phones = await database
      .selectFrom("phones")
      .innerJoin("brands", "phones.brand_id", "brands.id")
      .select([
        "phones.meta_json",
        "brands.name as brand",
        "phones.name",
        "phones.created_at",
        "phones.is_active",
      ])
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

  const handleTest = async () => {
    const result = await runner(database);

    setConsoleText(
      result
        .map(
          (result) =>
            `- ${result.description}: ${result.passed ? "passed" : "failed"}`,
        )
        .join("\n"),
    );
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
        <Button title="Test" onPress={handleTest} />
        {/* <Button
          title="Transaction Failure"
          onPress={() => handleTransactedInsert()}
        /> */}
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
