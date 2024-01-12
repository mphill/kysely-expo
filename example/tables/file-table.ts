import { Generated } from "kysely";

export interface FileTable {
  id: Generated<number>;
  name: string;
  contents: Uint8Array;
  mime_type: string;
}
