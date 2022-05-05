import { ContractStatisticsOptions } from "@models/Contract/Service";
import { Contract, EventListener } from "@models/Contract/Entity";
import { CallBack } from "@models/Callback/Entity";
import { Router, Request, Response, NextFunction } from "express";
import { URL } from "url";
import container from "@container";
import dayjs from "dayjs";
import { json } from "body-parser";

const contractState = (
  data: any
): {
  name: string | Error;
  network: number | Error;
  address: string | Error;
  startHeight: number | Error;
  abi: any[] | Error;
  fid: string | null | Error;
} => {
  const state: ReturnType<typeof contractState> = {
    name: new Error("Invalid name"),
    network: new Error("Invalid network"),
    address: new Error("Invalid address"),
    startHeight: new Error("Invalid start height"),
    abi: new Error("Invalid ABI"),
    fid: new Error("Invalid FID"),
  };

  let { name, network, address, startHeight, abi, fid } = data;
  if (typeof name === "string" && name !== "") {
    state.name = name;
  }
  network = parseInt(network, 10);
  if (!isNaN(network)) {
    state.network = network;
  }
  if (typeof address === "string" && /0x[a-z0-9]{40}/i.test(address)) {
    state.address = address;
  }
  startHeight = parseInt(startHeight, 10);
  if (!isNaN(startHeight)) {
    state.startHeight = startHeight;
  }
  if (typeof abi === "string") {
    state.abi = abi !== "" ? JSON.parse(abi) : null;
  }
  if (typeof fid === "string") {
    state.fid = fid !== "" ? fid : null;
  }

  return state;
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
  listenerId: string;
  taskId: string;
  info: string;
  error: string;
  status: string;
  updatedAt: Date;
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
    const { name, network, address, startHeight, abi, fid } = contractState(
      req.body
    );
    if (name instanceof Error) {
      return res.status(400).send(name.message);
    }
    if (network instanceof Error) {
      return res.status(400).send(network.message);
    }
    if (address instanceof Error) {
      return res.status(400).send(address.message);
    }
    if (startHeight instanceof Error) {
      return res.status(400).send(startHeight.message);
    }
    if (abi instanceof Error) {
      return res.status(400).send(abi.message);
    }
    if (fid instanceof Error) {
      return res.status(400).send(fid.message);
    }

    const contract = await container.model
      .contractService()
      .createContract(network, address, name, abi, startHeight, fid);

    return res.json(contract);
  })
  .get(
    "/:contractId",
    [contractMiddleware],
    (req: Request<ContractReqParams>, res: Response) =>
      res.json(req.params.contract)
  )
  .get("/fid/:contractFid", (req, res) =>
    container.model
      .contractTable()
      .where("fid", req.params.contractFid)
      .first()
      .then((contract) =>
        contract
          ? res.json(contract)
          : res.status(404).send("Contract not found")
      )
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
      const contract = req.params.contract;
      const { name, network, address, startHeight, abi, fid } = contractState(
        req.body
      );

      const updated = await container.model.contractService().updateContract({
        ...contract,
        name: name instanceof Error ? contract.name : name,
        network: network instanceof Error ? contract.network : network,
        address: address instanceof Error ? contract.address : address,
        startHeight:
          startHeight instanceof Error ? contract.startHeight : startHeight,
        abi: abi instanceof Error ? contract.abi : abi,
        fid: fid instanceof Error ? contract.fid : fid,
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
      const isIncludeLastTask = req.query.includeLastTask === "yes";
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
      const eventListenersList = await select
        .orderBy("createdAt", "asc")
        .limit(limit)
        .offset(offset);
      const listenersFor: string[] = eventListenersList.map((v) => v.id);

      let lastTasks: ListenerLastTask[] = [];
      if (listenersFor.length && isIncludeLastTask) {
        lastTasks = (await container.model
          .queueTable()
          .columns([
            "status",
            "info",
            "error",
            "updatedAt",
            database.raw('id as "taskId"'),
            database.raw(`params->>'id' as "listenerId"`),
          ])
          .where(database.raw("params->>'id' in (?)", listenersFor))
          .orderBy("createdAt", "desc")) as unknown as ListenerLastTask[];
      }

      return res.json(
        eventListenersList.map((v) => {
          return {
            ...v,
            lastTask: lastTasks.find((t) => t.listenerId === v.id) || null,
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
    ) => {
      const isCount = req.query.count === "yes";
      const limit = Number(req.query.limit ?? 10);
      const offset = Number(req.query.offset ?? 0);

      const select = container.model
        .callBackTable()
        .where("eventListener", req.params.listener.id);
      if (isCount) {
        return res.json(await select.count().first());
      }

      return res.json(await select.limit(limit).offset(offset));
    }
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
