import "module-alias/register";
import "source-map-support/register";
import container from "./container";

container.model
  .migrationService()
  .up()
  .then(async () => {
    const toolName = process.argv[2];
    const { main } = require(`./tools/${toolName}`);
    await main();
    process.exit(0);
  });
