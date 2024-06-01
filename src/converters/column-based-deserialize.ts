import { safeParse } from "../helpers";
import { ColumnNameBasedConverter } from "../types/column-name-based-converter";
import { OnError } from "../types/error-type";
import { ValidTypes } from "./introspection";

const deserialize = <T>(
  rows: any[],
  columnBasedConverter: ColumnNameBasedConverter[],
  onError?: OnError,
) => {
  const introspection = typeIntrospection(rows[0], columnBasedConverter);

  if (introspection.size === 0) {
    return rows;
  }

  return rows.map((row) => {
    introspection.forEach((type, column) => {
      switch (type) {
        case "datetime":
          row[column] = new Date(row[column]);
          break;
        case "boolean":
          row[column] = Boolean(row[column] === 1 || row[column] === "true");
          break;
        case "object":
          row[column] = safeParse(row[column], onError);
          break;
        case "blob":
          row[column] = new Uint8Array(row[column]);
          break;
      }
    });

    return row;
  });
};

const typeIntrospection = (
  row: any,
  nameBasedConverter: ColumnNameBasedConverter[],
): Map<string, ValidTypes> => {
  if (row === null || row === undefined) {
    return new Map();
  }

  const result = new Map<string, ValidTypes>();

  for (const column in row) {
    const value = row[column];

    if (value === null || value === undefined) {
      continue;
    }

    const converter = nameBasedConverter.find((converter) =>
      converter.match(column),
    );

    if (converter) {
      result.set(column, converter.type);
    }
  }

  return result;
};

export { deserialize };
