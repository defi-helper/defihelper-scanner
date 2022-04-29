import { SchemaBuilder } from "knex";
import {
  eventTableName,
  eventListenerTableName,
} from "@models/Contract/Entity";

export default (schema: SchemaBuilder) => {
  return schema.createTable(eventTableName, (table) => {
    table.string("id", 36).notNullable();
    table.string("eventListener", 36).notNullable().index();
    table.string("address", 42).notNullable().index();
    table.integer("blockNumber").notNullable().index();
    table.string("blockHash", 66).notNullable();
    table.integer("transactionIndex").notNullable();
    table.string("transactionHash", 66).notNullable();
    table.integer("logIndex").notNullable();
    table.jsonb("args").notNullable();
    table.dateTime("createdAt").notNullable();
    table.primary(["id"], `${eventTableName}_pkey`);
    table.unique(["transactionHash", "logIndex"]);
    table
      .foreign("eventListener")
      .references(`${eventListenerTableName}.id`)
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
  });
};
