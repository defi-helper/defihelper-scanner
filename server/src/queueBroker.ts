import "module-alias/register";
import cli from "command-line-args";
import container from "./container";

async function handle() {
  return container.model.queueService().handle();
}

function wait(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

const broker = (interval: number): any =>
  handle().then((r) => wait(r ? 0 : interval).then(() => broker(interval)));

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
