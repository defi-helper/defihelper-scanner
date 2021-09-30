import "module-alias/register";
import container from "./container";
import Express from "express";
import { resolve } from "path";
import { route } from "@api/router";

container.model
  .migrationService()
  .up()
  .then(async () => {
    const express = Express();
    express.use(Express.static(resolve(__dirname, "../../public")));
    route(express);
    express.get(/\/.+/, (req, res) =>
      res.sendFile(resolve(__dirname, "../../public/index.html"))
    );

    express.listen(9002, () => console.log(`Listen 9002`));
  });
