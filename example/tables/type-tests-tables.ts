import { Generated } from "kysely";

export interface TypeTestsTable {
  id: Generated<number>;
  array_type: string[];
  record_type: Record<string, string>;
  object_type: {
    name: string;
    age: number;
  };
}
