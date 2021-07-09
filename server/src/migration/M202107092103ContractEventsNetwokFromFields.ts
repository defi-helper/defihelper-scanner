import { SchemaBuilder } from "knex";
import { eventTableName} from "@models/Contract/Entity";

export default (schema: SchemaBuilder) => {
  return schema.alterTable(eventTableName, (table) => {
    table.string("from", 42).defaultTo('')
    table.string("network", 32).defaultTo('1');
  }).raw(`ALTER TABLE ${eventTableName} ALTER COLUMN "from" DROP DEFAULT;`)
      .raw(`ALTER TABLE ${eventTableName} ALTER COLUMN "network" DROP DEFAULT;`)
};
