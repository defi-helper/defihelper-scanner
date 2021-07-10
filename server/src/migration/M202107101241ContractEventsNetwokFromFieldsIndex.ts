import { SchemaBuilder } from "knex";
import { eventTableName} from "@models/Contract/Entity";

export default (schema: SchemaBuilder) => {
  return schema.alterTable(eventTableName, (table) => {
    table.index(["from", "network"]);
  });
};
