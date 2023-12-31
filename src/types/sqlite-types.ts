export type RealSQLiteTypes = "text" | "real" | "integer" | "any" | "blob";

export const SQLiteTypes: Readonly<Record<string, RealSQLiteTypes>> = {
  Boolean: "text",
  DateTime: "text",
  Number: "real",
  Integer: "integer",
  String: "text",
  Json: "text",
  Any: "any",
  Blob: "blob",
};
