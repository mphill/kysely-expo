import { QueryResult } from "kysely";
import { TypeConverter } from "../types/type-converter";

const serialize = (parameters: unknown[]) => {
  return parameters.map((parameter) => {
    if (parameter instanceof Date) {
      return parameter.toISOString();
    } else if (typeof parameter === "object") {
      return JSON.stringify(parameter);
    } else if (typeof parameter === "boolean") {
      return parameter ? 1 : 0;
    } else {
      return parameter;
    }
  });
};

const deserialize = <T>(
  rows: any[],
  typeConverter: TypeConverter,
): QueryResult<T> => {
  const processed = rows.map((row) => {
    for (const key in row) {
      if (typeConverter.boolean?.(key)) {
        row[key] = !!row[key];
      }

      if (typeConverter.date?.(key)) {
        row[key] = new Date(row[key]);
      }

      if (typeConverter.json?.(key)) {
        row[key] = JSON.parse(row[key]);
      }
    }

    return row;
  });

  return {
    rows: processed,
  };
};

const defaultTypeConverter: TypeConverter = {
  boolean: (columnName) =>
    columnName.startsWith("is_") ||
    columnName.startsWith("has_") ||
    columnName.endsWith("_flag"),
  date: (columnName) => columnName.endsWith("_at"),
  json: (columnName) => columnName.endsWith("_json"),
};

export { serialize, deserialize, defaultTypeConverter };
