import { Kysely, sql } from "kysely";
import { Database } from "../screens/main";

type TestCase = {
  description: string;
  passed: boolean;
  message?: string;
};

const runner = async (database: Kysely<Database>) => {
  const results: TestCase[] = [];
  // set brand 1 created_at to 2000-01-01 00:00:00
  await database
    .updateTable("brands")
    .set({ created_at: new Date("2000-01-01 00:00:00") })
    .where("id", "=", 1)
    .execute();

  // set brand 2 created to 2020-01-01 00:00:00
  await database
    .updateTable("brands")
    .set({ created_at: new Date("2010-06-01 00:00:00") })
    .where("id", "=", 2)
    .execute();

  // get the average of the created_at column on brands 1 and 2
  const { sum, avg, max, min, coalesce } = database.fn;

  const result = await database
    .selectFrom("brands")
    .select(avg("created_at").as("avg"))
    .where("id", "in", [1, 2])
    .executeTakeFirst();

  console.log(result);

  // get all brands with created_at > avg
  const brands = await database
    .selectFrom("brands")
    .select(["brands.name", "brands.created_at"])
    .where("created_at", ">", new Date("2010-06-01 00:00:00"))
    .execute();

  console.log(brands);

  // set brand 1 is_active to false
  await database
    .updateTable("brands")
    .set({ is_active: false })
    .where("id", "=", 1)
    .execute();

  // get all brands with is_active = false
  const inactiveBrands = await database
    .selectFrom("brands")
    .select(["brands.name", "brands.is_active"])
    .where("is_active", "=", false)
    .execute();

  results.push({
    description: "Verify filtering on brand.is_active = false returns 1 row",
    passed: inactiveBrands.length == 1 && inactiveBrands[0].is_active === false,
  });

  // get min created_at and verify it's 2000-01-01 00:00:00
  const minCreatedAt = await database
    .selectFrom("brands")
    .select(min("created_at").as("created_at"))
    .executeTakeFirst();

  console.log(minCreatedAt, minCreatedAt);

  results.push({
    description: "Verify min created_at is 2000-01-01 00:00:00",
    passed:
      minCreatedAt.created_at.getTime() ==
      new Date("2000-01-01 00:00:00").getTime(),
  });

  // update brand 1 name to null

  try {
    console.log("update brand 1 name to null");
    await database
      .updateTable("brands")
      .set({ name: null })
      .where("id", "=", 1)
      .execute();
    results.push({
      description: "Verify null constraint is enforced",
      passed: false,
    });
  } catch (e) {
    results.push({
      description: "Verify null constraint is enforced",
      passed: true,
    });
  }

  // Remove all records from type_tests
  await database.deleteFrom("type_tests").execute();

  // get the row count from type_tests

  const rowCount = await database
    .selectFrom("type_tests")
    .select([database.fn.countAll().as("count")])
    .executeTakeFirst();

  if (rowCount.count !== 0) {
    results.push({
      description: "Verify type_tests is empty",
      passed: false,
    });
  } else {
    results.push({
      description: "Verify type_tests is empty",
      passed: true,
    });
  }

  const typeResult = await database
    .insertInto("type_tests")
    .values({
      array_type: ["a", "b", "c"],
      record_type: { a: "a", b: "b" },
      object_type: { name: "name", age: 20 },
    })
    .executeTakeFirst();

  // select 1 row from type_tests
  const typeTests = await database
    .selectFrom("type_tests")
    .select(["array_type", "record_type", "object_type", "id"])
    .where("id", "=", Number(typeResult.insertId))
    .executeTakeFirstOrThrow();

  if (typeTests.array_type.length !== 3) {
    results.push({
      description: "Verify array type is stored correctly",
      passed: false,
    });
  } else {
    results.push({
      description: "Verify array type is stored correctly",
      passed: true,
    });
  }

  if (typeTests.record_type.a !== "a" || typeTests.record_type.b !== "b") {
    results.push({
      description: "Verify record type is stored correctly",
      passed: false,
    });
  } else {
    results.push({
      description: "Verify record type is stored correctly",
      passed: true,
    });
  }

  if (
    typeTests.object_type.name !== "name" ||
    typeTests.object_type.age !== 20
  ) {
    results.push({
      description: "Verify object type is stored correctly",
      passed: false,
    });
  } else {
    results.push({
      description: "Verify object type is stored correctly",
      passed: true,
    });
  }

  return results;
};

export default runner;
