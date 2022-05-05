import "module-alias/register";
import "source-map-support/register";
import cli from "command-line-args";
import container from "./container";
import config from "./config";
import * as Sentry from "@sentry/node";
import { Handler } from "@models/Queue/Service";

async function handle(include: Handler[], exclude: Handler[]) {
  return container.model.queueService().handle({ include, exclude });
}

function wait(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

const broker = (
  interval: number,
  include: Handler[],
  exclude: Handler[]
): any =>
  handle(include, exclude).then((r) =>
    wait(r ? 0 : interval).then(() => broker(interval, include, exclude))
  );

Sentry.init({
  dsn: config.sentryDsn,
  tracesSampleRate: 0.8,
});

container.model
  .migrationService()
  .up()
  .then(async () => {
    const options = cli([
      { name: "include", type: String },
      { name: "exclude", type: String },
      { name: "interval", type: Number, defaultValue: 1000 },
    ]);
    if (Number.isNaN(options.interval)) throw new Error(`Invalid interval`);

    broker(
      options.interval,
      options.include ? [options.include] : [],
      options.exclude ? [options.exclude] : []
    );
    container.logger().info(`Handle queue tasks`);
  })
  .catch((e) => {
    container.logger().error(e);
    process.exit(1);
  });
