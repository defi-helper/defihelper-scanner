import { Process } from "@models/Queue/Entity";
import container from "@container";
import { v4 as uuid } from "uuid";

export interface Params {
  listenerId: string;
  offset?: number;
}

const PACK_SIZE = 100_000;

export default async (process: Process) => {
  let { listenerId, offset } = process.task.params as Params;

  const listener = await container.model
    .contractEventListenerTable()
    .where("id", listenerId)
    .first();
  if (!listener) throw new Error("Listener not found");

  if (offset === undefined) {
    const eventsCount = await container.model
      .contractEventTable()
      .count()
      .where("eventListener", listener.id)
      .first()
      .then((row) => Number(row?.count ?? 0));
    if (eventsCount > PACK_SIZE) {
      const queueService = container.model.queueService();
      await Promise.all(
        Array.from(new Array(Math.ceil(eventsCount / PACK_SIZE)).keys()).map(
          (i) =>
            queueService.push("fillInteraction", {
              listenerId,
              offset: i * PACK_SIZE,
            })
        )
      );
      return process.done();
    } else {
      offset = 0;
    }
  }

  const events = await container.model
    .contractEventTable()
    .where("eventListener", listener.id)
    .orderBy("id")
    .limit(PACK_SIZE)
    .offset(offset);
  await events.reduce<Promise<null>>(async (prev, event) => {
    await prev;
    await container.model
      .walletInteractionTable()
      .insert({
        id: uuid(),
        wallet: event.from.toLowerCase(),
        contract: event.address.toLowerCase(),
        network: event.network,
        eventName: listener.name,
        createdAt: new Date(),
      })
      .onConflict(["wallet", "contract", "network"])
      .ignore();
    return null;
  }, Promise.resolve(null));

  return process.done();
};
