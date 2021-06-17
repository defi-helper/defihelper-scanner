import { Process } from "@models/Queue/Entity";
import container from "@container";
import dayjs from "dayjs";

export interface Params {
  id: string;
}

export default async (process: Process) => {
  const { id } = process.task.params as Params;
  const stakingBalanceService = container.model.stakingBalanceService();
  const stakingBalance = await stakingBalanceService
    .table()
    .where("id", id)
    .first();
  if (!stakingBalance) {
    throw new Error(`Staking balance "${id}" not found`);
  }

  const contractService = container.model.contractService();
  const contract = await contractService
    .table()
    .where({ id: stakingBalance.contract })
    .first();
  if (!contract) {
    throw new Error(`Contract "${stakingBalance.contract}" not found`);
  }
  if (contract.abi === null) {
    return process.later(dayjs().add(1, "minutes").toDate());
  }

  const provider = container.blockchain.providerByNetwork(contract.network);
  const contractProvider = container.blockchain.contract(
    contract.address,
    contract.abi,
    provider
  );
  const balance = await contractProvider.balanceOf(stakingBalance.address);

  await stakingBalanceService.update({
    ...stakingBalance,
    balance: balance.toString(),
  });

  return process.done();
};
