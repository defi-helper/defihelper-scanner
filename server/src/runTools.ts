import "module-alias/register";

const toolName = process.argv[2];
const { main } = require(`./tools/${toolName}`);
main();
