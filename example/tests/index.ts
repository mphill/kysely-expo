import { Kysely } from "kysely";
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

  // get all brands with created_at > avg
  const brands = await database
    .selectFrom("brands")
    .select(["brands.name", "brands.created_at"])
    .where("created_at", ">", new Date("2010-06-01 00:00:00"))
    .execute();

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

  results.push({
    description: "Verify min created_at is 2000-01-01 00:00:00",
    passed:
      minCreatedAt.created_at.getTime() ==
      new Date("2000-01-01 00:00:00").getTime(),
  });

  // update brand 1 name to null
  try {
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

  // Test for transaction rollback
  try {
    await database.transaction().execute(async (trx) => {
      // Insert a test record
      await trx
        .insertInto("brands")
        .values({
          name: "Transaction Test Brand",
          is_active: true,
          created_at: new Date(),
        })
        .execute();

      // Force an error to trigger rollback
      throw new Error("Intentional error to test transaction rollback");
    });

    results.push({
      description: "Verify transaction rollback works correctly",
      passed: false,
      message: "Transaction should have rolled back but didn't throw an error",
    });
  } catch (e) {
    // Check if the record was not inserted (rollback worked)
    const transactionBrand = await database
      .selectFrom("brands")
      .select("name")
      .where("name", "=", "Transaction Test Brand")
      .executeTakeFirst();

    results.push({
      description: "Verify transaction rollback works correctly",
      passed: transactionBrand === undefined,
      message: transactionBrand
        ? "Transaction didn't roll back properly"
        : "Transaction rolled back successfully",
    });
  }

  // Test for JOIN operations
  try {
    // Insert a test product linked to brand 1
    await database
      .insertInto("phones")
      .values({
        name: "Test Join Product",
        brand_id: 1,
        created_at: new Date(),
        is_active: true,
        meta_json: {
          foo: "bar",
          bar: 123,
        },
      })
      .execute();

    // Test JOIN query
    const joinResult = await database
      .selectFrom("phones")
      .innerJoin("brands", "brands.id", "phones.brand_id")
      .select(["phones.name as product_name", "brands.name as brand_name"])
      .where("phones.name", "=", "Test Join Product")
      .executeTakeFirst();

    results.push({
      description: "Verify JOIN operations work correctly",
      passed:
        joinResult !== undefined &&
        joinResult.product_name === "Test Join Product" &&
        joinResult.brand_name !== undefined,
      message: joinResult
        ? "JOIN operation successful"
        : "JOIN operation failed",
    });

    await database
      .deleteFrom("phones")
      .where("name", "=", "Test Join Product")
      .execute();
  } catch (e) {
    results.push({
      description: "Verify JOIN operations work correctly",
      passed: false,
      message: `JOIN test failed with error: ${e}`,
    });
  }

  // Test for LIKE operator
  try {
    const likeResults = await database
      .selectFrom("brands")
      .select("name")
      .where("name", "like", "%apple%")
      .execute();

    results.push({
      description: "Verify LIKE operator works correctly",
      passed: likeResults.length > 0,
      message:
        likeResults.length > 0
          ? "LIKE operator returned expected results"
          : "LIKE operator failed to return results",
    });
  } catch (e) {
    results.push({
      description: "Verify LIKE operator works correctly",
      passed: false,
      message: `LIKE test failed with error: ${e}`,
    });
  }

  // Test for RETURNING clause
  try {
    // Insert a record with RETURNING clause
    const insertResult = await database
      .insertInto("phones")
      .values({
        name: "Returning Test Phone",
        brand_id: 1,
        created_at: new Date(),
        is_active: true,
        meta_json: {
          foo: "returning test",
          bar: 456,
        },
      })
      .returning(["id", "name", "brand_id"])
      .executeTakeFirst();

    results.push({
      description: "Verify INSERT with RETURNING clause works correctly",
      passed:
        insertResult !== undefined &&
        insertResult.id !== undefined &&
        insertResult.name === "Returning Test Phone" &&
        insertResult.brand_id === 1,
      message: insertResult
        ? "INSERT with RETURNING clause successful"
        : "INSERT with RETURNING clause failed",
    });

    // Update a record with RETURNING clause
    const updateResult = await database
      .updateTable("phones")
      .set({ name: "Updated Returning Test Phone" })
      .where("name", "=", "Returning Test Phone")
      .returning(["id", "name"])
      .executeTakeFirst();

    results.push({
      description: "Verify UPDATE with RETURNING clause works correctly",
      passed:
        updateResult !== undefined &&
        updateResult.id !== undefined &&
        updateResult.name === "Updated Returning Test Phone",
      message: updateResult
        ? "UPDATE with RETURNING clause successful"
        : "UPDATE with RETURNING clause failed",
    });

    // Delete a record with RETURNING clause
    const deleteResult = await database
      .deleteFrom("phones")
      .where("name", "=", "Updated Returning Test Phone")
      .returning(["id", "name"])
      .executeTakeFirst();

    results.push({
      description: "Verify DELETE with RETURNING clause works correctly",
      passed:
        deleteResult !== undefined &&
        deleteResult.id !== undefined &&
        deleteResult.name === "Updated Returning Test Phone",
      message: deleteResult
        ? "DELETE with RETURNING clause successful"
        : "DELETE with RETURNING clause failed",
    });
  } catch (e) {
    console.error("Error in RETURNING clause tests:", e);
    results.push({
      description: "Verify RETURNING clause operations",
      passed: false,
      message: `Error in RETURNING clause tests: ${e}`,
    });
  }

  return results;
};

export default runner;
