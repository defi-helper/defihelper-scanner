import { v4 as uuid } from "uuid";
import { Factory } from "@services/Container";
import { Contract } from "@models/Contract/Entity";
import { StakingBalance, StakingBalanceTable } from "./Entity";

export class StakingService {
  constructor(readonly table: Factory<StakingBalanceTable> = table) {}

  async create(contract: Contract, address: string, balance: string) {
    const created = {
      id: uuid(),
      contract: contract.id,
      address,
      balance,
      updatedAt: new Date(),
    };
    await this.table().insert(created);

    return created;
  }

  async update(stakingBalance: StakingBalance) {
    const updated = {
      ...stakingBalance,
      updatedAt: new Date(),
    };
    await this.table()
      .where({
        id: stakingBalance.id,
      })
      .update(updated);

    return updated;
  }
}
