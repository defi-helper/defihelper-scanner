import { Process } from "@models/Queue/Entity";
import container from "@container";
import dayjs from "dayjs";

export interface Params {
  id: string;
}

export default async (process: Process) => {
  const { id } = process.task.params as Params;
  const contractService = container.model.contractService();
  const contract = await contractService.table().where({ id }).first();
  if (!contract) {
    throw new Error(`Contract "${id}" not found`);
  }
  const scan = container.blockchain.scanByNetwork(contract.network);

  try {
    const abi = await scan.getContractAbi(contract.address);
    await contractService.update({
      ...contract,
      abi,
    });
  } catch (e) {
    if (e.message === "RATE_LIMIT") {
      return process.later(dayjs().add(5, "seconds").toDate());
    }
    throw e;
  }

  return process.done();
};
