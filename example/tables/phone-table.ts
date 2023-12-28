import { Generated } from "kysely";

export interface PhoneTable {
  id: Generated<number>;
  brand_id: number;
  name: string;
  is_active: boolean;
  created_at: Generated<Date>;
}
