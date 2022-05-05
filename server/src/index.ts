import "module-alias/register";
import "source-map-support/register";
import container from "./container";
import Express from "express";
import { resolve } from "path";
import { route } from "@api/router";
import config from "./config";
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: config.sentryDsn,
  tracesSampleRate: 0.8,
});
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

    express.listen(8080, () => console.log(`Listen 8080`));
  });
