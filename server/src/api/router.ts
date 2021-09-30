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
    const network = req.query.networkId;
    if (!network) return res.status(400).send("Invalid network id");

    const contractsAddresses = await container.model
      .contractEventTable()
      .select("address")
      .where("from", req.params.address.toLowerCase())
      .groupBy("address");

    return res.json(contractsAddresses.map((row) => row.address));
  });
  express.use("/api/address", addressRouter);
}
