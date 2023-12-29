export const SQLiteTypes: Readonly<
  Record<string, "text" | "real" | "integer">
> = {
  Boolean: "text",
  DateTime: "text",
  Decimal: "real",
  Integer: "integer",
  String: "text",
  BigInt: "integer",
  Json: "text",
};
