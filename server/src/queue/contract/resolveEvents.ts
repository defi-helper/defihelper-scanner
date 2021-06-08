import { Process } from "@models/Queue/Entity";
import container from "@container";
import dayjs from "dayjs";

export interface Params {
  id: string;
  step: number;
}

export default async (process: Process) => {
  const { id, step = 1000 } = process.task.params as Params;
  const eventListenerService = container.model.contractEventListenerService();
  const eventListener = await eventListenerService
    .table()
    .where("id", id)
    .first();
  if (!eventListener) {
    throw new Error(`Event listener "${id}" not found`);
  }

  const contractService = container.model.contractService();
  const contract = await contractService
    .table()
    .where({ id: eventListener.contract })
    .first();
  if (!contract) {
    throw new Error(`Contract "${eventListener.contract}" not found`);
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
  if (!contractProvider.filters[eventListener.name]) {
    throw new Error(`Invalid event "${eventListener.name}"`);
  }

  const currentBlockNumber = await provider.getBlockNumber();
  if (currentBlockNumber <= eventListener.syncHeight) {
    return process.later(dayjs().add(1, "minutes").toDate());
  }

  const toHeight =
    eventListener.syncHeight + step <= currentBlockNumber
      ? eventListener.syncHeight + step
      : currentBlockNumber;
  const eventService = container.model.contractEventService();
  const events = await contractProvider.queryFilter(
    contractProvider.filters[eventListener.name](),
    eventListener.syncHeight,
    toHeight
  );
  const duplicates = await eventService
    .table()
    .columns("transactionHash", "logIndex")
    .where("eventListener", eventListener.id)
    .andWhere("blockNumber", ">=", eventListener.syncHeight)
    .andWhere("blockNumber", "<=", toHeight);
  const duplicateSet = new Set(
    duplicates.map(
      ({ transactionHash, logIndex }) => `${transactionHash}:${logIndex}`
    )
  );

  await Promise.all(
    events.map((event) => {
      if (duplicateSet.has(`${event.transactionHash}:${event.logIndex}`)) {
        return null;
      }

      return eventService.create(eventListener, event);
    })
  );

  const currentEventListener = await eventListenerService
    .table()
    .where("id", eventListener.id)
    .first();
  if (!currentEventListener) {
    return process.info("Target event listener not found").done();
  }
  const isStateUpdated = dayjs(currentEventListener.updatedAt).isAfter(
    eventListener.updatedAt
  );

  await eventListenerService.update({
    ...currentEventListener,
    syncHeight: isStateUpdated ? currentEventListener.syncHeight : toHeight,
  });

  return process.later(dayjs().toDate());
};
