import { ContractStatisticsOptions } from "@models/Contract/Service";
import { Contract, EventListener } from "@models/Contract/Entity";
import { CallBack } from "@models/Callback/Entity";
import { Router, Request, Response, NextFunction } from "express";
import { URL } from "url";
import container from "@container";
import dayjs from "dayjs";
import { json } from "body-parser";

const contractState = (data: any) => {
  let { name, network, address, startHeight, abi } = data;
  if (typeof name !== "string" || name === "") {
    return new Error(`Invalid name "${name}"`);
  }
  network = parseInt(network, 10);
  if (isNaN(network) || ![1, 56, 137, 1285, 43114].includes(network)) {
    return new Error(`Invalid network "${network}"`);
  }
  if (typeof address !== "string" || !/0x[a-z0-9]{40}/i.test(address)) {
    return new Error(`Invalid address "${address}"`);
  }
  startHeight = parseInt(startHeight, 10);
  if (isNaN(startHeight) || startHeight < 0) {
    return new Error(`Invalid start height "${startHeight}"`);
  }
  if (typeof abi !== "string") {
    return new Error(`Invalid abi "${JSON.stringify(abi, null, 4)}"`);
  }
  abi = abi !== "" ? JSON.parse(abi) : null;

  return {
    name,
    network,
    address: address.toLowerCase(),
    startHeight,
    abi,
  };
};

const eventListenerState = (data: any) => {
  let { name, syncHeight } = data;
  if (typeof name !== "string" || name === "") {
    return new Error("Invalid name");
  }
  syncHeight = parseInt(syncHeight, 10);
  if (isNaN(syncHeight) || syncHeight < 0) {
    return new Error("Invalid sync height");
  }

  return {
    name,
    syncHeight,
  };
};

interface ContractReqParams {
  contractId: string;
  contract: Contract;
}

async function contractMiddleware(
  req: Request<ContractReqParams>,
  res: Response,
  next: NextFunction
) {
  const contract = await container.model
    .contractTable()
    .where("id", req.params.contractId)
    .first();
  if (!contract) return res.status(404).send("Contract not found");

  req.params.contract = contract;

  return next();
}

interface ListenerReqParams {
  listenerId: string;
  listener: EventListener;
}

async function listenerMiddleware(
  req: Request<ListenerReqParams>,
  res: Response,
  next: NextFunction
) {
  const listener = await container.model
    .contractEventListenerTable()
    .where("id", req.params.listenerId)
    .first();
  if (!listener) return res.status(404).send("Event listener not found");

  req.params.listener = listener;

  return next();
}

interface CallBackReqParams {
  callBackId: string;
  callBack: CallBack;
}

async function callBackMiddleware(
  req: Request<CallBackReqParams>,
  res: Response,
  next: NextFunction
) {
  const callBack = await container.model
    .callBackTable()
    .where("id", req.params.callBackId)
    .first();
  if (!callBack) return res.status(404).send("Call back not found");

  req.params.callBack = callBack;

  return next();
}

interface ListenerLastTask {
  listenerid: string;
  taskid: string;
  info: string;
  error: string;
  status: string;
}

export default Router()
  .get("/", async (req, res) => {
    const limit = Number(req.query.limit ?? 10);
    const offset = Number(req.query.offset ?? 0);
    const isCount = req.query.count === "yes";
    const network = req.query.network;
    const address = req.query.address;
    const name = req.query.name;

    const networkFilter = Number(network) || null;
    const addressFilter =
      typeof address === "string" && address !== ""
        ? address.toLowerCase()
        : null;
    const nameFilter = typeof name === "string" && name !== "" ? name : null;

    const select = container.model.contractTable().where(function () {
      if (networkFilter) {
        this.andWhere("network", networkFilter);
      }
      if (addressFilter) {
        this.andWhere("address", addressFilter);
      }
      if (nameFilter) {
        this.andWhere("name", "ilike", `%${nameFilter}%`);
      }
    });
    if (isCount) {
      return res.json(await select.count().first());
    }

    return res.json(await select.limit(limit).offset(offset));
  })
  .post("/", json(), async (req, res) => {
    const state = contractState(req.body);
    if (state instanceof Error) {
      return res.status(400).send(state.message);
    }
    let { name, network, address, startHeight, abi } = state;

    const contract = await container.model
      .contractService()
      .createContract(network, address, name, abi, startHeight);

    return res.json(contract);
  })
  .get(
    "/:contractId",
    [contractMiddleware],
    (req: Request<ContractReqParams>, res: Response) =>
      res.json(req.params.contract)
  )
  .delete(
    "/:contractId",
    [contractMiddleware],
    async (req: Request<ContractReqParams>, res: Response) => {
      await container.model
        .contractService()
        .deleteContract(req.params.contract);

      return res.status(200).send("");
    }
  )
  .put(
    "/:contractId",
    [json(), contractMiddleware],
    async (req: Request<ContractReqParams>, res: Response) => {
      const state = contractState(req.body);
      if (state instanceof Error) {
        return res.status(400).send(state.message);
      }
      const { name, network, address, startHeight, abi } = state;

      const updated = await container.model.contractService().updateContract({
        ...req.params.contract,
        name,
        network,
        address,
        startHeight,
        abi,
      });

      return res.json(updated);
    }
  )
  .get(
    "/:contractId/statistics",
    [json(), contractMiddleware],
    async (req: Request<ContractReqParams>, res: Response) => {
      const query = req.query as {
        filter?: {
          date?: {
            from: string;
            to: string;
          };
          block?: {
            from: string;
            to: string;
          };
        };
      };
      const options: ContractStatisticsOptions = {
        filter: {},
      };
      if (query.filter) {
        if (query.filter.date) {
          const from = dayjs.unix(parseInt(query.filter.date.from, 10));
          const to = dayjs.unix(parseInt(query.filter.date.to, 10));
          if (!from.isValid() || !to.isValid()) {
            return res.status(400).send("Invalid filter date format");
          }
          options.filter.date = {
            from: from.toDate(),
            to: to.toDate(),
          };
        }
        if (query.filter.block) {
          const from = parseInt(query.filter.block.from, 10);
          const to = parseInt(query.filter.block.to, 10);
          if (isNaN(from) || isNaN(to)) {
            return res.status(400).send("Invalid filter block format");
          }
          options.filter.block = { from, to };
        }
      }

      return res.json(
        await container.model
          .contractService()
          .getContractStatistics(req.params.contract, options)
      );
    }
  )
  .get(
    "/:contractId/event-listener",
    [contractMiddleware],
    async (req: Request<ContractReqParams>, res: Response) => {
      const limit = Number(req.query.limit ?? 10);
      const offset = Number(req.query.offset ?? 0);
      const isCount = req.query.count === "yes";
      const name = req.query.name;

      const select = container.model
        .contractEventListenerTable()
        .where(function () {
          this.where("contract", req.params.contract.id);
          if (typeof name === "string" && name !== "") {
            this.andWhere("name", name);
          }
        });
      if (isCount) {
        return res.json(await select.count().first());
      }

      const database = container.database();
      const eventListenerslist = await select
        .orderBy("createdAt", "asc")
        .limit(limit)
        .offset(offset);
      let listenersFor: string[] = eventListenerslist.map((v) => v.id);

      const lastTasks = (await container.model
        .queueTable()
        .columns([
          "status",
          "info",
          "error",
          database.raw("id as taskid"),
          database.raw("params->>'id' as listenerid"),
        ])
        .where((qb) => {
          if (!listenersFor.length) return;
          qb.where(database.raw("params->>'id' in (?)", listenersFor));
        })
        .orderBy("createdAt", "desc")) as unknown as ListenerLastTask[];

      return res.json(
        eventListenerslist.map((v) => {
          return {
            ...v,
            lastTask: lastTasks.find((t) => t.listenerid === v.id) || null,
          };
        })
      );
    }
  )
  .post(
    "/:contractId/event-listener",
    [json(), contractMiddleware],
    async (req: Request<ContractReqParams>, res: Response) => {
      const state = eventListenerState(req.body);
      if (state instanceof Error) {
        return res.status(400).send(state.message);
      }
      const { name, syncHeight } = state;

      const eventListener = await container.model
        .contractService()
        .createListener(req.params.contract, name, syncHeight);

      return res.json(eventListener);
    }
  )
  .delete(
    "/:contractId/event-listener/:listenerId",
    [contractMiddleware, listenerMiddleware],
    async (
      req: Request<ContractReqParams & ListenerReqParams>,
      res: Response
    ) => {
      await container.model
        .contractService()
        .deleteListener(req.params.listener);

      return res.status(200).send("");
    }
  )
  .put(
    "/:contractId/event-listener/:listenerId",
    [json(), contractMiddleware, listenerMiddleware],
    async (
      req: Request<ContractReqParams & ListenerReqParams>,
      res: Response
    ) => {
      const state = eventListenerState(req.body);
      if (state instanceof Error) {
        return res.status(400).send(state.message);
      }
      const { name, syncHeight } = state;

      const updated = await container.model.contractService().updateListener({
        ...req.params.listener,
        name,
        syncHeight,
      });

      return res.json(updated);
    }
  )
  .get(
    "/:contractId/event-listener/:listenerId",
    [contractMiddleware, listenerMiddleware],
    (req: Request<ContractReqParams & ListenerReqParams>, res: Response) =>
      res.json(req.params.listener)
  )
  .get(
    "/:contractId/event-listener/:listenerId/event",
    [contractMiddleware, listenerMiddleware],
    async (
      req: Request<ContractReqParams & ListenerReqParams>,
      res: Response
    ) => {
      const isCount = req.query.count === "yes";
      const limit = Number(req.query.limit ?? 10);
      const offset = Number(req.query.offset ?? 0);

      const select = container.model
        .contractEventTable()
        .where("eventListener", req.params.listener.id);
      if (isCount) {
        return res.json(await select.count().first());
      }

      return res.json(await select.limit(limit).offset(offset));
    }
  )
  .get(
    "/:contractId/event-listener/:listenerId/call-back",
    [contractMiddleware, listenerMiddleware],
    async (
      req: Request<ContractReqParams & ListenerReqParams>,
      res: Response
    ) => res.json(await container.model.callBackService().table())
  )
  .post(
    "/:contractId/event-listener/:listenerId/call-back",
    [json(), contractMiddleware, listenerMiddleware],
    async (
      req: Request<ContractReqParams & ListenerReqParams>,
      res: Response
    ) => {
      const { callBackUrl } = req.body;

      if (!callBackUrl) {
        return res.status(400).send("You have to send callBackUrl in body");
      }

      try {
        new URL(callBackUrl);
      } catch {
        return res.status(400).send("CallBack url in not valid");
      }

      const callBack = await container.model
        .callBackService()
        .create(req.params.listener, callBackUrl);

      return res.json(callBack);
    }
  )
  .get(
    "/:contractId/event-listener/:listenerId/call-back/:callBackId",
    [contractMiddleware, listenerMiddleware, callBackMiddleware],
    (
      req: Request<ContractReqParams & ListenerReqParams & CallBackReqParams>,
      res: Response
    ) => res.json(req.params.callBack)
  )
  .delete(
    "/:contractId/event-listener/:listenerId/call-back/:callBackId",
    [contractMiddleware, listenerMiddleware, callBackMiddleware],
    async (
      req: Request<ContractReqParams & ListenerReqParams & CallBackReqParams>,
      res: Response
    ) => {
      await container.model.callBackService().delete(req.params.callBack);

      return res.status(200).send("");
    }
  );
