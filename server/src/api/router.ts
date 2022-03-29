import { Express, Router } from "express";
import container from "@container";
import contractRouter from "./contractRouter";

export function route(express: Express) {
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
  addressRouter.get("/:address", async (req, res) => {
    const network = req.query.networkId as string;
    if (!network) return res.status(400).send("Invalid network id");

    const contractsAddresses = await container.model
      .contractEventTable()
      .select("address")
      .where("from", req.params.address.toLowerCase())
      .andWhere("network", network)
      .groupBy("address");

    return res.json(contractsAddresses.map((row) => row.address));
  });
  express.use("/api/address", addressRouter);

  const queueRouter = Router();
  queueRouter.post("/:taskId/restart", async (req, res) => {
    const task = await container.model
      .queueTable()
      .where("id", req.params.taskId)
      .first();

    if (!task) {
      return res.status(404).send("Task not found");
    }

    return res
      .status(200)
      .json(await container.model.queueService().resetAndRestart(task));
  });
  express.use("/api/queue", queueRouter);
}
