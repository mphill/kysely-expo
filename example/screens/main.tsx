import { StatusBar } from "expo-status-bar";
import { useKysely } from "kysely-expo";
import { useState } from "react";
import { Button, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { BrandTable } from "../tables/brand-table";
import { PhoneTable } from "../tables/phone-table";

import runner from "../tests";
import { sql } from "kysely";
import { FileTable } from "../tables/file-table";

import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { base64ToBlob } from "../utils";
import { TypeTestsTable } from "../tables/type-tests-tables";

export interface Database {
  type_tests: TypeTestsTable;
  brands: BrandTable;
  phones: PhoneTable;
  files: FileTable;
}

export default function MainScreen() {
  const database = useKysely<Database>();
  const [consoleText, setConsoleText] = useState("");

  const getRandomNumberBetween = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1) + min);

  const handleInsert = async () => {
    const values = {
      name: "iPhone " + getRandomNumberBetween(3, 8),
      brand_id: 1,
      created_at: new Date(),
      is_active: false,
      meta_json: {
        foo: "bar",
        bar: 1,
      },
    };

    database
      .insertInto("phones")
      .values(values)
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
        "phones.id",
        "phones.meta_json",
        sql<string>`upper(brands.name)`.as("brand"),
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

  const handleSelectStream = async () => {
    const stream = await database
      .selectFrom("phones")
      .innerJoin("brands", "phones.brand_id", "brands.id")
      .select([
        "phones.meta_json",
        sql<string>`upper(brands.name)`.as("brand"),
        "phones.name",
        "phones.created_at",
        "phones.is_active",
      ])
      .orderBy("phones.name", "asc")
      .stream();

    for await (const phone of stream) {
      console.log(phone);
    }
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

  const handleSelectFiles = async () => {
    const files = await database
      .selectFrom("files")
      .select(["contents", "mime_type", "name", "id"])
      .execute();

    console.log(files);
  };

  const handlePickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    const asset = result.assets[0];

    console.log("Reading path", asset.uri);

    const binary = base64ToBlob(
      await FileSystem.readAsStringAsync(asset.uri, {
        encoding: "base64",
      }),
    );

    await database
      .insertInto("files")
      .values({
        contents: binary,
        mime_type: asset.mimeType ?? "unknown",
        name: asset.fileName ?? "unknown.ext",
      })
      .execute();

    // if (!result.canceled) {
    //   setImage(result.assets[0].uri);
    // }
  };

  const handleTransaction = async () => {
    // remove all phones with the name "iPhone Transaction"
    await database
      .deleteFrom("phones")
      .where("name", "=", "iPhone Transaction")
      .execute();

    await database.transaction().execute(async (trx) => {
      await trx
        .insertInto("phones")
        .values({
          name: "iPhone Transaction",
          brand_id: 1,
          created_at: new Date(),
          is_active: false,
          meta_json: {
            foo: "bar",
            bar: 1,
          },
        })
        .execute();

      await trx
        .insertInto("phones")
        .values({
          name: "iPhone Transaction",
          brand_id: 1,
          created_at: new Date(),
          is_active: false,
          meta_json: {
            foo: "bar",
            bar: 1,
          },
        })
        .execute();
    });
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
        <Button title="Transaction" onPress={handleTransaction} />
        <Button title="Store File" onPress={handlePickImage} />
        <Button title="Select Files" onPress={handleSelectFiles} />
        <Button title="Select Stream" onPress={handleSelectStream} />
        <Button title="Test" onPress={handleTest} />
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
