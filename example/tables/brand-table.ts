import { Generated } from "kysely";

export interface BrandTable {
  id: Generated<number>;
  name: string;
  created_at: Generated<Date>;
  is_active: boolean;
}
