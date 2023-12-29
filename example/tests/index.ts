import { Kysely } from "kysely";
import { Database } from "../App";

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
    passed: inactiveBrands.length == 1,
  });

  // get min created_at and verify it's 2000-01-01 00:00:00
  const minCreatedAt = await database
    .selectFrom("brands")
    .select(min("created_at").as("min"))
    .executeTakeFirst();

  results.push({
    description: "Verify min created_at is 2000-01-01 00:00:00",
    passed:
      minCreatedAt.min.getTime() == new Date("2000-01-01 00:00:00").getTime(),
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

  return results;
};

export default runner;
