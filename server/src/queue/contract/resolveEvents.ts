import { Process } from "@models/Queue/Entity";
import container from "@container";
import dayjs from "dayjs";
import { ethers } from "ethers";

export interface Params {
  id: string;
  step: number;
}

export default async (process: Process) => {
  const { id, step = 1000 } = process.task.params as Params;
  const eventListener = await container.model
    .contractEventListenerTable()
    .where("id", id)
    .first();
  if (!eventListener) {
    throw new Error(`Event listener "${id}" not found`);
  }

  const contractService = container.model.contractService();
  const contract = await contractService
    .contractTable()
    .where({ id: eventListener.contract })
    .first();
  if (!contract) {
    throw new Error(`Contract "${eventListener.contract}" not found`);
  }
  if (contract.abi === null) {
    return process.later(dayjs().add(1, "minutes").toDate());
  }

  let provider: ethers.providers.JsonRpcProvider;
  try {
    provider = container.blockchain.providerByNetwork(contract.network);
  } catch (e) {
    return process
      .info(`Unable to resolve provider\n${e?.message || "no error"}`)
      .later(dayjs().add(10, "minutes").toDate());
  }

  let contractProvider: ethers.Contract;
  try {
    contractProvider = container.blockchain.contract(
      contract.address,
      contract.abi,
      provider
    );
  } catch (e) {
    return process
      .info(`Unable to create contract\n${e?.message || "no error"}`)
      .later(dayjs().add(10, "minutes").toDate());
  }

  if (!contractProvider.filters[eventListener.name]) {
    throw new Error(`Invalid event "${eventListener.name}"`);
  }

  let currentBlockNumber;
  try {
    currentBlockNumber = await provider.getBlockNumber();
  } catch (e) {
    return process
      .info(`Unable to resolve block number\n${e?.message || "no error"}`)
      .later(dayjs().add(10, "minutes").toDate());
  }

  if (currentBlockNumber <= eventListener.syncHeight) {
    return process.later(dayjs().add(1, "minutes").toDate());
  }

  const toHeight =
    eventListener.syncHeight + step <= currentBlockNumber
      ? eventListener.syncHeight + step
      : currentBlockNumber;
  const eventService = container.model.contractEventService();

  let events: ethers.Event[];
  try {
    events = await contractProvider.queryFilter(
      contractProvider.filters[eventListener.name](),
      eventListener.syncHeight,
      toHeight
    );
  } catch (e) {
    return process
      .info(`Unable to resolve filtered events\n${e?.message || "no error"}`)
      .later(dayjs().add(10, "minutes").toDate());
  }

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

  const callBackService = container.model.callBackService();
  const callBacks = await callBackService
    .table()
    .where("eventListener", eventListener.id);

  const createdEvents = await Promise.all(
    events.map(async (event) => {
      if (duplicateSet.has(`${event.transactionHash}:${event.logIndex}`)) {
        return null;
      }

      const [receipt, block] = await Promise.all([
        event.getTransactionReceipt(),
        event.getBlock(),
      ]);

      return eventService.create(
        eventListener,
        event,
        contract.network.toString(),
        receipt.from,
        block.timestamp
      );
    })
  );

  const eventsIds = createdEvents
    .map((event) => (event ? event.id : null))
    .filter((event) => event);
  if (createdEvents.length > 0) {
    await Promise.all(
      callBacks.map((callBack) => {
        return container.model.queueService().push("callCallBack", {
          id: callBack.id,
          events: eventsIds,
        });
      })
    );
  }

  const currentEventListener = await container.model
    .contractEventListenerTable()
    .where("id", eventListener.id)
    .first();
  if (!currentEventListener) {
    return process.info("Target event listener not found").done();
  }
  const isStateUpdated = dayjs(currentEventListener.updatedAt).isAfter(
    eventListener.updatedAt
  );

  await container.model.contractService().updateListener({
    ...currentEventListener,
    syncHeight: isStateUpdated ? currentEventListener.syncHeight : toHeight,
  });

  return process.later(dayjs().toDate());
};
