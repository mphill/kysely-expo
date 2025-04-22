import {
  isStringBoolean,
  isStringIso8601,
  isStringJson,
  isUint8Array,
  safeParse,
} from "../helpers";
import { OnError } from "../types/error-type";
import { ValidTypes } from "./introspection";

const deserialize = <T>(rows: any[], onError?: OnError): any[] => {
  const typeMapping = typeIntrospection(rows);

  const processed = rows.map((row) => {
    for (const key in row) {
      const value = row[key];

      if (value === null || value === undefined) {
        continue;
      }

      const type = typeMapping.get(key);

      if (type === "datetime") {
        row[key] = new Date(value);
      } else if (type === "boolean") {
        row[key] = value === "true" ? true : false;
      } else if (type === "null") {
        row[key] = null;
      } else if (type === "object") {
        row[key] = safeParse(value, onError);
      } else if (type === "number") {
        row[key] = Number(value);
      } else if (type === "string") {
        row[key] = String(value);
      } else if (type === "blob") {
        row[key] = value as Uint8Array;
      } else {
        throw new Error("unknown type: " + type);
      }
    }

    return row;
  });

  return processed;
};

// Reverse SQLite affinity mapping.
// https://www.sqlite.org/datatype3.html#affinity_name_examples
const typeIntrospection = (rows: any[]): Map<string, ValidTypes> => {
  const typeMapping = new Map<string, ValidTypes>();

  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (typeMapping.has(key)) continue;

      if (value === null || value === undefined) {
        continue; // wait for a non-null value to determine type
      }

      const valueType = typeof value;

      switch (valueType) {
        case "string":
          if (isStringIso8601(value as string)) {
            typeMapping.set(key, "datetime");
          } else if (isStringBoolean(value as string)) {
            typeMapping.set(key, "boolean");
          } else if (isStringJson(value as string)) {
            typeMapping.set(key, "object");
          } else {
            typeMapping.set(key, "string");
          }
          break;
        case "number":
          typeMapping.set(key, "number");
          break;
        case "boolean":
          typeMapping.set(key, "boolean");
          break;
        case "object":
          if (isUint8Array(value)) {
            typeMapping.set(key, "blob");
          } else {
            typeMapping.set(key, "object");
          }
          break;
        default:
          throw new Error(`Unknown type: ${valueType}`);
      }
    }
  }

  return typeMapping;
};

export { deserialize };
