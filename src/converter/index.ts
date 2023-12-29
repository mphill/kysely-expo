import { QueryResult } from "kysely";

import { isStringBoolean, isStringIso8601, isStringJson } from "../helpers";

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
const typeIntrospection = (map: object): any[] => {
  const typeMapping: string[] = [];

  if (map === null) {
    return [];
  }

  console.log("map", map);

  Object.keys(map).forEach((key) => {
    const value = map[key];

    console.log("process key", key, "value", value);
    if (typeof value === "string") {
      if (isStringIso8601(value)) {
        typeMapping.push("date");
      } else if (isStringBoolean(value)) {
        typeMapping.push("boolean");
      } else if (isStringJson(value)) {
        typeMapping.push("object");
      } else {
        typeMapping.push("string");
      }
    } else {
      typeMapping.push(typeof value);
    }
  });

  const numKeys = Object.keys(map).length;
  if (numKeys !== typeMapping.length) {
    throw new Error("numKeys != typeMapping.length");
  }

  return typeMapping;
};

export { serialize, deserialize };
