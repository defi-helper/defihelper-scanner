import "module-alias/register";
import container from "./container";
import Express from "express";
import { resolve } from "path";
import { route } from "@api/router";

container.model
  .migrationService()
  .up()
  .then(async () => {
    /*
    await container.model
      .contractService()
      .create(1, "0x4e995d583d54bdc755748d11d429abdaadcfa0b7", null, 12171530);
      */

    /*
    const contract = await container.model.contractService().table().first();
    if (contract) {
      await container.model
        .contractEventListenerService()
        .create(contract, "RewardAdded", 12560121);
    }
    */

    container.model.queueService().createBroker().start();

    const express = Express();
    express.use(Express.static(resolve(__dirname, "../../public")));
    route(express);
    express.get(/\/.+/, (req, res) =>
      res.sendFile(resolve(__dirname, "../../public/index.html"))
    );

    express.listen(9000, () => console.log(`Listen 9000`));
  });
