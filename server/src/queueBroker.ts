import "module-alias/register";
import "source-map-support/register";
import cli from "command-line-args";
import container from "./container";
import config from "./config";
import * as Sentry from "@sentry/node";

async function handle() {
  return container.model.queueService().handle();
}

function wait(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

const broker = (interval: number): any =>
  handle().then((r) => wait(r ? 0 : interval).then(() => broker(interval)));

Sentry.init({
  dsn: config.sentryDsn,
  tracesSampleRate: 0.8,
});

container.model
  .migrationService()
  .up()
  .then(async () => {
    const options = cli([
      { name: "interval", type: Number, defaultValue: 1000 },
    ]);
    if (Number.isNaN(options.interval)) throw new Error(`Invalid interval`);

    broker(options.interval);
    container.logger().info(`Handle queue tasks`);
  })
  .catch((e) => {
    container.logger().error(e);
    process.exit(1);
  });
