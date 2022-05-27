import { Process } from "@models/Queue/Entity";
import container from "@container";
import { v4 as uuid } from "uuid";

export interface Params {
  listenerId: string;
}

export default async (process: Process) => {
  const { listenerId } = process.task.params as Params;

  const listener = await container.model
    .contractEventListenerTable()
    .where("id", listenerId)
    .first();
  if (!listener) throw new Error("Listener not found");

  const events = await container.model
    .contractEventTable()
    .where("eventListener", listener.id);
  await events.reduce<Promise<unknown>>(async (prev, event) => {
    await prev;

    return container.model.walletInteractionTable().insert({
      id: uuid(),
      wallet: event.from.toLowerCase(),
      contract: event.address.toLowerCase(),
      network: event.network,
      eventName: listener.name,
      createdAt: new Date(),
    })
    .onConflict([ 'wallet', 'contract', 'network',])
    .ignore();
  }, Promise.resolve(null));

  return process.done();
};
