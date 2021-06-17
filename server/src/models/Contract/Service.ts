import container from "@container";
import { Factory } from "@services/Container";
import { Emitter } from "@services/Event";
import { ethers } from "ethers";
import { v4 as uuid } from "uuid";
import {
  Contract,
  ContractTable,
  EventListener,
  EventListenerTable,
  EventTable,
} from "./Entity";

async function abiResolver({ id, abi }: Contract) {
  if (abi !== null) return;

  return container.model.queueService().push("resolveAbi", { id });
}

export class ContractService {
  constructor(readonly table: Factory<ContractTable> = table) {}

  public readonly onCreate = new Emitter<Contract>(abiResolver);

  public readonly onUpdate = new Emitter<{ prev: Contract; current: Contract }>(
    ({ current }) => abiResolver(current)
  );

  public readonly onDelete = new Emitter<Contract>();

  async create(
    network: number,
    address: string,
    name: string,
    abi: ethers.ContractInterface | null,
    startHeight: number
  ) {
    const created = {
      id: uuid(),
      network,
      address: address.toLowerCase(),
      name,
      abi: abi === null ? null : JSON.stringify(abi, null, 4),
      startHeight,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.table().insert(created);
    this.onCreate.emit(created);

    return created;
  }

  async update(contract: Contract) {
    const updated = {
      ...contract,
      abi: contract.abi === null ? null : JSON.stringify(contract.abi, null, 4),
      updatedAt: new Date(),
    };
    await this.table().where({ id: contract.id }).update(updated);
    this.onUpdate.emit({ prev: contract, current: updated });

    return updated;
  }

  async delete(contract: Contract) {
    await this.table().where({ id: contract.id }).delete();
    this.onDelete.emit(contract);
  }
}

async function eventResolver({ id }: EventListener) {
  return container.model
    .queueService()
    .push("resolveEvents", { id, step: 5000 });
}

export class EventListenerService {
  constructor(readonly table: Factory<EventListenerTable> = table) {}

  public readonly onCreate = new Emitter<EventListener>(eventResolver);

  async create(
    contract: Contract,
    name: string,
    syncHeight: number = contract.startHeight
  ) {
    const created = {
      id: uuid(),
      contract: contract.id,
      name,
      syncHeight,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.table().insert(created);
    this.onCreate.emit(created);

    return created;
  }

  async update(eventListener: EventListener) {
    const updated = {
      ...eventListener,
      updatedAt: new Date(),
    };
    await this.table()
      .where({
        id: eventListener.id,
      })
      .update(updated);

    return updated;
  }

  async delete(eventListener: EventListener) {
    await this.table().where({ id: eventListener.id }).delete();
  }
}

export class EventService {
  constructor(readonly table: Factory<EventTable> = table) {}

  async create(eventListener: EventListener, event: ethers.Event) {
    const args = Object.entries(event.args || {}).reduce((res, [k, v]) => {
      if (!isNaN(parseInt(k, 10))) return res;

      return {
        ...res,
        [k]: v.toString(),
      };
    }, {});

    const created = {
      id: uuid(),
      eventListener: eventListener.id,
      address: event.address.toLowerCase(),
      blockNumber: event.blockNumber,
      blockHash: event.blockHash.toLowerCase(),
      transactionIndex: event.transactionIndex,
      transactionHash: event.transactionHash.toLowerCase(),
      logIndex: event.logIndex,
      args: JSON.stringify(args, null, 4),
      createdAt: new Date(),
    };
    await this.table().insert(created);

    return created;
  }
}
