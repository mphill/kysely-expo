import { RawBuilder, sql } from "kysely";

export type RealSQLiteTypes = "text" | "real" | "integer" | "any" | "blob";

export const SQLiteTypes: Readonly<
  Record<
    | "Boolean"
    | "DateTime"
    | "Number"
    | "Integer"
    | "String"
    | "Json"
    | "Blob"
    | "Any",
    RawBuilder<unknown>
  >
> = {
  Boolean: sql`text`,
  DateTime: sql`text`,
  Number: sql`real`,
  Integer: sql`integer`,
  String: sql`text`,
  Json: sql`text`,
  Any: sql`any`,
  Blob: sql`blob`,
} as const;
