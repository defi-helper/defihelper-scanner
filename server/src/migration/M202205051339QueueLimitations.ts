import { SchemaBuilder } from "knex";
import { tableName as queueTableName } from "@models/Queue/Entity";

export default (schema: SchemaBuilder) => {
  return schema.alterTable(queueTableName, (table) => {
    table.integer("timeout", 6).nullable();
    table.integer("retires", 3).defaultTo(0).notNullable();
  });
};
