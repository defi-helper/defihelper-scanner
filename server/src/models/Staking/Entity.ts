import { tableFactory as createTableFactory } from "@services/Database";

export interface StakingBalance {
  id: string;
  contract: string;
  address: string;
  balance: string;
  updatedAt: Date;
}

export const stakingBalanceTableName = "staking_balance";

export const stakingBalanceTableFactory = createTableFactory<StakingBalance>(
  stakingBalanceTableName
);

export type StakingBalanceTable = ReturnType<
  ReturnType<typeof stakingBalanceTableFactory>
>;
