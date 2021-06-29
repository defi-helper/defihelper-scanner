import { tableFactory as createTableFactory } from "@services/Database";

export interface CallBack {
  id: string;
  eventListener: string;
  callbackUrl: string;
}

export const callBackTableName = "callback";

export const callBackTableFactory =
  createTableFactory<CallBack>(callBackTableName);

export type CallBackTable = ReturnType<ReturnType<typeof callBackTableFactory>>;