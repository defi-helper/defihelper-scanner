import { Express, Router } from "express";
import { json } from "body-parser";
import container from "@container";
import { URL } from "url";

export function route(express: Express) {
  const contractState = (data: any) => {
    let { name, network, address, startHeight, abi } = data;
    if (typeof name !== "string" || name === "") {
      return new Error("Invalid name");
    }
    network = parseInt(network, 10);
    if (isNaN(network) || ![1, 56, 137].includes(network)) {
      return new Error("Invalid network");
    }
    if (typeof address !== "string" || !/0x[a-z0-9]{40}/i.test(address)) {
      return new Error("Invalid address");
    }
    startHeight = parseInt(startHeight, 10);
    if (isNaN(startHeight) || startHeight < 0) {
      return new Error("Invalid start height");
    }
    if (typeof abi !== "string") {
      return new Error("Invalid abi");
    }
    abi = abi !== "" ? JSON.parse(abi) : null;

    return {
      name,
      network,
      address,
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

  const contractRouter = Router();
  contractRouter.get("/", async (req, res) => {
    const limit = parseInt((req.query.limit ?? 10).toString());
    const offset = parseInt((req.query.offset ?? 0).toString());
    const isCount = req.query.count === "yes";
    const network = req.query.network;
    const address = req.query.address;
    const name = req.query.name;

    let select = container.model.contractService().table();
    if (typeof network === "string" && network !== "") {
      select = select.andWhere("network", parseInt(network));
    }
    if (typeof address === "string" && address !== "") {
      select = select.andWhere("address", address);
    }
    if (typeof name === "string" && name !== "") {
      select = select.andWhere("name", "ilike", `%${name}%`);
    }

    if (isCount) {
      return res.json(await select.count().first());
    } else {
      select = select.limit(limit).offset(offset);
    }

    const contracts = await select;

    return res.json(contracts);
  });
  contractRouter.post("/", json(), async (req, res) => {
    const state = contractState(req.body);
    if (state instanceof Error) {
      return res.status(400).send(state.message);
    }
    let { name, network, address, startHeight, abi } = state;

    const contract = await container.model
      .contractService()
      .create(network, address, name, abi, startHeight);

    return res.json(contract);
  });
  contractRouter.get("/:contractId", async (req, res) => {
    const contract = await container.model
      .contractService()
      .table()
      .where("id", req.params.contractId)
      .first();
    if (!contract) return res.status(404).send("Contract not found");

    return res.json(contract);
  });
  contractRouter.delete("/:contractId", async (req, res) => {
    const contract = await container.model
      .contractService()
      .table()
      .where("id", req.params.contractId)
      .first();
    if (!contract) return res.status(404).send("Contract not found");

    await container.model.contractService().delete(contract);

    return res.status(200).send("");
  });
  contractRouter.put("/:contractId", json(), async (req, res) => {
    const contract = await container.model
      .contractService()
      .table()
      .where("id", req.params.contractId)
      .first();
    if (!contract) return res.status(404).send("Contract not found");

    const state = contractState(req.body);
    if (state instanceof Error) {
      return res.status(400).send(state.message);
    }
    const { name, network, address, startHeight, abi } = state;

    const updated = await container.model.contractService().update({
      ...contract,
      name,
      network,
      address,
      startHeight,
      abi,
    });

    return res.json(updated);
  });
  contractRouter.get("/:contractId/event-listener", async (req, res) => {
    const limit = parseInt((req.query.limit ?? 10).toString());
    const offset = parseInt((req.query.offset ?? 0).toString());
    const isCount = req.query.count === "yes";
    const name = req.query.name;

    const contract = await container.model
      .contractService()
      .table()
      .where("id", req.params.contractId)
      .first();
    if (!contract) return res.status(404).send("Contract not found");

    let select = container.model
      .contractEventListenerService()
      .table()
      .where("contract", contract.id);
    if (typeof name === "string" && name !== "") {
      select = select.andWhere("name", name);
    }

    if (isCount) {
      return res.json(await select.count().first());
    } else {
      select = select.limit(limit).offset(offset);
    }

    const listeners = await select;

    return res.json(listeners);
  });
  contractRouter.post(
    "/:contractId/event-listener",
    json(),
    async (req, res) => {
      const contract = await container.model
        .contractService()
        .table()
        .where("id", req.params.contractId)
        .first();
      if (!contract) return res.status(404).send("Contract not found");

      const state = eventListenerState(req.body);
      if (state instanceof Error) {
        return res.status(400).send(state.message);
      }
      const { name, syncHeight } = state;

      const eventListener = await container.model
        .contractEventListenerService()
        .create(contract, name, syncHeight);

      return res.json(eventListener);
    }
  );
  contractRouter.get(
    "/:contractId/event-listener/:listenerId",
    async (req, res) => {
      const contract = await container.model
        .contractService()
        .table()
        .where("id", req.params.contractId)
        .first();
      if (!contract) return res.status(404).send("Contract not found");

      const listener = await container.model
        .contractEventListenerService()
        .table()
        .where("id", req.params.listenerId)
        .first();
      if (!listener) return res.status(404).send("Event listener not found");

      return res.json(listener);
    }
  );
  contractRouter.delete(
    "/:contractId/event-listener/:listenerId",
    async (req, res) => {
      const contract = await container.model
        .contractService()
        .table()
        .where("id", req.params.contractId)
        .first();
      if (!contract) return res.status(404).send("Contract not found");

      const listener = await container.model
        .contractEventListenerService()
        .table()
        .where("id", req.params.listenerId)
        .first();
      if (!listener) return res.status(404).send("Event listener not found");

      await container.model.contractEventListenerService().delete(listener);

      return res.status(200).send("");
    }
  );
  contractRouter.put(
    "/:contractId/event-listener/:listenerId",
    json(),
    async (req, res) => {
      const contract = await container.model
        .contractService()
        .table()
        .where("id", req.params.contractId)
        .first();
      if (!contract) return res.status(404).send("Contract not found");

      const listener = await container.model
        .contractEventListenerService()
        .table()
        .where("id", req.params.listenerId)
        .first();
      if (!listener) return res.status(404).send("Event listener not found");

      const state = eventListenerState(req.body);
      if (state instanceof Error) {
        return res.status(400).send(state.message);
      }
      const { name, syncHeight } = state;

      const updated = await container.model
        .contractEventListenerService()
        .update({
          ...listener,
          name,
          syncHeight,
        });

      return res.json(updated);
    }
  );
  contractRouter.get(
    "/:contractId/event-listener/:listenerId/event",
    async (req, res) => {
      const isCount = req.query.count === "yes";
      const limit = parseInt((req.query.limit ?? 10).toString());
      const offset = parseInt((req.query.offset ?? 0).toString());

      const contract = await container.model
        .contractService()
        .table()
        .where("id", req.params.contractId)
        .first();
      if (!contract) return res.status(404).send("Contract not found");

      const listener = await container.model
        .contractEventListenerService()
        .table()
        .where("id", req.params.listenerId)
        .first();
      if (!listener) return res.status(404).send("Event listener not found");

      let select = container.model
        .contractEventService()
        .table()
        .where("eventListener", listener.id);

      if (isCount) {
        return res.json(await select.count().first());
      } else {
        select = select.limit(limit).offset(offset);
      }

      const events = await select;

      return res.json(events);
    }
  );

  contractRouter.get(
    "/:contractId/event-listener/:listenerId/call-back",
    async (req, res) => {
      const callbacks = await container.model
        .callBackService()
        .table();

      return res.json(callbacks);
    }
  );

  contractRouter.post(
    "/:contractId/event-listener/:listenerId/call-back",
    json(),
    async (req, res) => {
      const listener = await container.model
        .contractEventListenerService()
        .table()
        .where("id", req.params.listenerId)
        .first();
      if (!listener) return res.status(404).send("Event listener not found");

      const { callBackUrl } = req.body;

      if (!callBackUrl) {
          return res.status(400).send("You have to send callBackUrl in body");
      }

      try {
          new URL(callBackUrl);
      } catch {
          return res.status(400).send("CallBack url in not valid");
      }

      const callBack = await container.model.callBackService().create(listener, callBackUrl);

      return res.json(callBack);
    }
  );

  contractRouter.delete(
    "/:contractId/event-listener/:listenerId/call-back/:callBackId",
    async (req, res) => {
      const callBack = await container.model
        .callBackService()
        .table()
        .where("id", req.params.callBackId)
        .first();
      if (!callBack) return res.status(404).send("CallBack not found");

      await container.model.callBackService().delete(callBack);

      return res.status(200).send("");
    }
  );

  express.use("/api/contract", contractRouter);

  const blockchainRouter = Router();
  blockchainRouter.get("/:network/current-block", async (req, res) => {
    const network = parseInt(req.params.network, 10);
    if (isNaN(network)) return res.status(400).send("Invalid network id");

    try {
      const provider = container.blockchain.providerByNetwork(network);

      return res.json({
        currentBlock: await provider.getBlockNumber(),
      });
    } catch {
      return res.status(404).send("Network not supported");
    }
  });
  express.use("/api/eth", blockchainRouter);

  const addressRouter = Router();
  addressRouter.get('/:address', async (req, res) => {
      const network = req.query.networkId;
      if (!network) return res.status(400).send("Invalid network id");

      const contractsAddresses = await container.model.contractEventTable()
          .select('address')
          .where('from', req.params.address)
          .groupBy('address');


      return res.json(contractsAddresses.map(row => row.address));
  });
  express.use("/api/address", addressRouter);
}
