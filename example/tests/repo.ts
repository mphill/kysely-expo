import { useKysely } from "kysely-expo";
import { Database } from "../screens/main";
import { Kysely } from "kysely";

const getBrands = async (database: Kysely<Database>) => {
  const brands = await database
    .selectFrom("brands")
    .select(["brands.name"])
    .orderBy("name")
    .execute();

  return brands;
};

export { getBrands };
