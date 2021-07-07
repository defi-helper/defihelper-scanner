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

  const eventListenerService = container.model.contractEventListenerService();
  const eventListener = await eventListenerService
    .table()
    .where("id", callBack.eventListener)
    .first();
  if (!eventListener) {
    throw new Error(`Event listener "${callBack.eventListener}" not found`);
  }

  const contractService = container.model.contractService();
  const contract = await contractService
    .table()
    .where({ id: eventListener.contract })
    .first();
  if (!contract) {
    throw new Error(`Contract "${eventListener.contract}" not found`);
  }

  const eventService = container.model.contractEventService();
  const events = await eventService.table().whereIn("id", eventIds);

  try {
    await axios.post(callBack.callbackUrl, {
      contract,
      events,
    });

    return process.done();
  } catch (e) {
    return process.error(e);
  }
};
