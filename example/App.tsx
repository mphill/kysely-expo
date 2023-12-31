import { Kysely } from "kysely";
import MainScreen, { Database } from "./screens/main";
import { KyselyProvider, useKysely } from "kysely-expo";
import React from "react";
import { Text } from "react-native";

export default function App() {
  return (
    <KyselyProvider<Database> database="cars-db.sqlite">
      <TestSomething />
    </KyselyProvider>
  );
}

function TestSomething() {
  const database = useKysely<Database>();

  console.log(
    database
      .selectFrom("brands")
      .select("brands.name")
      .execute()
      .then(
        (result) => {
          console.log(result);
        },
        (error) => {
          console.error(error);
        },
      ),
  );

  return <Text>Got here!</Text>;
}
