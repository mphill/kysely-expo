import { Generated } from "kysely";

export interface PhoneTable {
  id: Generated<number>;
  brand_id: number;
  name: string;
  meta_json: {
    foo: string;
    bar: number;
  };
  is_active: boolean;
  created_at: Generated<Date>;
}
