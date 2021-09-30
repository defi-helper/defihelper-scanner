import { Process } from "@models/Queue/Entity";
import container from "@container";
import dayjs from "dayjs";
import axios from "axios";

export interface Params {
  id: string;
  events: string[];
}

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
  const events = await eventService.table().whereIn("id", eventIds);

  try {
    if (events.length > 0) {
      await axios.post(callBack.callbackUrl, {
        eventName: eventListener.name,
        events,
      });
    }

    return process.done();
  } catch (e) {
    return process.error(e);
  }
};
