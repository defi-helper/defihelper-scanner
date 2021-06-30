import { Factory } from "@services/Container";
import { v4 as uuid } from "uuid";
import { EventListener } from "@models/Contract/Entity";
import {
  CallBack,
  CallBackTable,
} from "./Entity";

export class CallBackService {
  constructor(readonly table: Factory<CallBackTable> = table) {}

  async create(eventListener: EventListener, callbackUrl: string) {
    const created: CallBack = {
      id: uuid(),
      eventListener: eventListener.id,
      callbackUrl,
      createdAt: new Date(),
    };
    await this.table().insert(created);

    return created;
  }

  async delete(callBack: CallBack) {
    await this.table().where({ id: callBack.id }).delete();
  }
}
