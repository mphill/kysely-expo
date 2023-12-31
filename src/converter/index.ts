import { QueryResult } from "kysely";

import { isStringBoolean, isStringIso8601, isStringJson } from "../helpers";
import { RealSQLiteTypes, SQLiteTypes } from "../types/sqlite-types";

const serialize = (parameters: unknown[]) => {
  return parameters.map((parameter) => {
    if (parameter instanceof Date) {
      return parameter.toISOString();
    } else if (parameter === null || parameter === undefined) {
      return null;
    } else if (typeof parameter === "object") {
      return JSON.stringify(parameter);
    } else if (typeof parameter === "boolean") {
      return parameter ? "true" : "false"; // SQLite booleans must be stored a strings.
    } else {
      return parameter;
    }
  });
};

const deserialize = <T>(rows: any[]): QueryResult<T> => {
  const typeMapping = typeIntrospection(rows[0]);

  console.log("typeMapping", typeMapping);

  const processed = rows.map((row) => {
    for (const key in row) {
      if (isStringIso8601(row[key])) {
        row[key] = new Date(row[key]);
      } else if (isStringBoolean(row[key])) {
        row[key] = row[key] === "true";
      }
      //   else if (isStringJson(row[key])) {
      //     row[key] = JSON.parse(row[key]);
      //   }
    }

    return row;
  });

  return {
    rows: processed,
  };
};

// Reverse SQLite affinity mapping.
const typeIntrospection = (map: object): Map<string, RealSQLiteTypes> => {
  if (map === null || map === undefined) {
    return new Map();
  }

  const typeMapping = new Map<string, RealSQLiteTypes>();

  Object.keys(map).forEach((key) => {
    const value = map[key];

    // console.log("process key", key, "value", value);

    if (typeof value === "string") {
      if (isStringIso8601(value)) {
        typeMapping.set(key, SQLiteTypes.DateTime);
      } else if (isStringBoolean(value)) {
        typeMapping.set(key, SQLiteTypes.Boolean);
      } else if (isStringJson(value)) {
        typeMapping.set(key, SQLiteTypes.Json);
      } else {
        typeMapping.set(key, SQLiteTypes.String);
      }
    } else {
      typeMapping.set(key, SQLiteTypes.Any);
    }
  });

  const numKeys = Object.keys(map).length;
  if (numKeys !== typeMapping.size) {
    throw new Error("numKeys != typeMapping.length");
  }

  return typeMapping;
};

export { serialize, deserialize };
