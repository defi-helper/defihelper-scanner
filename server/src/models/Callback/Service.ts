import { Factory } from "@services/Container";
import { v4 as uuid } from "uuid";
import {
  CallBack,
  CallBackTable,
} from "./Entity";


export class CallBackService {
  constructor(readonly table: Factory<CallBackTable> = table) {}

  async create(eventListenerId: string, callbackUrl: string) {
    const created: CallBack = {
      id: uuid(),
      eventListener: eventListenerId,
      callbackUrl,
    };
    await this.table().insert(created);

    return created;
  }

  async delete(callBack: CallBack) {
    await this.table().where({ id: callBack.id }).delete();
  }
}
