import { SchemaBuilder } from "knex";
import { callBackTableName } from "@models/Callback/Entity";
import { eventListenerTableName } from "@models/Contract/Entity";

export default (schema: SchemaBuilder) => {
  return schema.createTable(callBackTableName, (table) => {
    table.string("id", 36).notNullable();
    table.string("eventListener", 36).notNullable();
    table.string("callbackUrl").notNullable();
    table.primary(["id"], `${callBackTableName}_pkey`);
    table.unique(["eventListener", "callbackUrl"]);
    table
      .foreign("eventListener")
      .references(`${eventListenerTableName}.id`)
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
  });
};
