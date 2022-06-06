import { Process } from "@models/Queue/Entity";
import container from "@container";
import dayjs from "dayjs";
import axios from "axios";

export interface Params {
  id: string;
  events: string[];
}

const chunk = (
  arr: { id: string; from: string; transactionHash: string }[],
  size: number
) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );

export default async (process: Process) => {
  const { id, events: eventIds } = process.task.params as Params;
  const callBackService = container.model.callBackService();
  const callBack = await callBackService.table().where("id", id).first();
  if (!callBack) {
    throw new Error(`CallBack "${id}" not found`);
  }

  const eventListener = await container.model
    .contractEventListenerTable()
    .where("id", callBack.eventListener)
    .first();
  if (!eventListener) {
    throw new Error(`Event listener "${callBack.eventListener}" not found`);
  }

  const contractService = container.model.contractService();
  const contract = await contractService
    .contractTable()
    .where({ id: eventListener.contract })
    .first();
  if (!contract) {
    throw new Error(`Contract "${eventListener.contract}" not found`);
  }

  const eventService = container.model.contractEventService();
  const events = chunk(
    await eventService
      .eventTable()
      .select("id", "from", "transactionHash")
      .whereIn("id", eventIds),
    100
  );

  try {
    if (events.length > 0) {
      const skipped = await events.reduce<Promise<string[]>>(
        async (prev, eventList) => {
          const result = await prev;
          if (result.length > 0) {
            return [...result, ...eventList.map(({ id }) => id)];
          }

          try {
            await axios.post(callBack.callbackUrl, {
              eventName: eventListener.name,
              events: eventList,
            });

            return [];
          } catch (e) {
            if (e instanceof Error) {
              return [...result, ...eventList.map(({ id }) => id)];
            }
            throw e;
          }
        },
        Promise.resolve([])
      );
      if (skipped.length > 0) {
        return process
          .param({
            id,
            events: skipped,
          })
          .later(dayjs().add(5, "minutes").toDate());
      }
    }

    return process.done();
  } catch (e) {
    return process.error(e);
  }
};
