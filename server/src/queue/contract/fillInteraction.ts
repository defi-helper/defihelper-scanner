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
  await events.reduce(async (prev, event) => {
    await prev;

    const interaction = await container.model
      .walletInteractionTable()
      .where({
        eventName: listener.name,
        network: event.network,
        contract: event.address.toLowerCase(),
        wallet: event.from.toLowerCase(),
      })
      .first();
    if (interaction) return null;

    return container.model.walletInteractionTable().insert({
      id: uuid(),
      wallet: event.from.toLowerCase(),
      contract: event.address.toLowerCase(),
      network: event.network,
      eventName: listener.name,
      createdAt: new Date(),
    });
  }, Promise.resolve(null));

  return process.done();
};
