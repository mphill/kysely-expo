export type TypeConverter = {
  boolean?: (columnName: string) => boolean;
  date?: (columnName: string) => boolean;
  json?: (columnName: string) => boolean;
};
