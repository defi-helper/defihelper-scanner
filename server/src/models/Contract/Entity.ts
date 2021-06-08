import { tableFactory as createTableFactory } from "@services/Database";
import { ethers } from "ethers";

export interface Contract {
  id: string;
  address: string;
  network: number;
  name: string;
  abi: ethers.ContractInterface | null;
  startHeight: number;
  updatedAt: Date;
  createdAt: Date;
}

export const contractTableName = "contract";

export const contractTableFactory =
  createTableFactory<Contract>(contractTableName);

export type ContractTable = ReturnType<ReturnType<typeof contractTableFactory>>;

export interface EventListener {
  id: string;
  contract: string;
  name: string;
  syncHeight: number;
  updatedAt: Date;
  createdAt: Date;
}

export const eventListenerTableName = "contract_event_listener";

export const eventListenerTableFactory = createTableFactory<EventListener>(
  eventListenerTableName
);

export type EventListenerTable = ReturnType<
  ReturnType<typeof eventListenerTableFactory>
>;

export interface Event {
  id: string;
  eventListener: string;
  address: string;
  blockNumber: number;
  blockHash: string;
  transactionIndex: number;
  transactionHash: string;
  logIndex: number;
  args: Object;
  createdAt: Date;
}

export const eventTableName = "contract_event";

export const eventTableFactory = createTableFactory<Event>(eventTableName);

export type EventTable = ReturnType<ReturnType<typeof eventTableFactory>>;
