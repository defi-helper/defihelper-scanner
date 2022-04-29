import { SchemaBuilder } from "knex";
import { contractTableName } from "@models/Contract/Entity";
import { stakingBalanceTableName } from "@models/Staking/Entity";

export default (schema: SchemaBuilder) => {
  return schema.createTable(stakingBalanceTableName, (table) => {
    table.string("id", 36).notNullable();
    table.string("contract", 36).notNullable().index();
    table.string("address", 42).notNullable().index();
    table.string("balance", 64).notNullable();
    table.dateTime("updatedAt").notNullable();
    table.primary(["id"], `${stakingBalanceTableName}_pkey`);
    table.unique(["contract", "address"]);
    table
      .foreign("contract")
      .references(`${contractTableName}.id`)
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
  });
};
