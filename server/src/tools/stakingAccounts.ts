import dayjs from "dayjs";
import container from "../container";

export async function main() {
  const listenerId = process.argv[3];
  const listener = await container.model
    .contractEventListenerTable()
    .where("id", listenerId)
    .first();
  if (!listener) {
    console.error(`Event listener ${listenerId} not found`);
    process.exit(1);
  }

  const contract = await container.model
    .contractTable()
    .where("id", listener.contract)
    .first();
  if (!contract || contract.abi === null) {
    console.error(`Contract ABI ${listener.contract} not resolved`);
    process.exit(1);
  }

  const events = await container
    .database()
    .raw(
      `SELECT DISTINCT LOWER(args->>'user') FROM contract_event WHERE "eventListener" = '${listener.id}'`
    );
  const addresses = events.rows.map((row: { lower: string }) => row.lower);
  console.log(`Addresses count = ${addresses.length}`);

  const stakingBalanceService = container.model.stakingBalanceService();
  const queueService = container.model.queueService();
  let i = 0;
  await addresses.reduce(async (prev: Promise<any>, address: string) => {
    await prev;

    const stakingBalance = await stakingBalanceService.create(
      contract,
      address,
      "0"
    );
    await queueService.push(
      "stakingBalanceOf",
      { id: stakingBalance.id },
      dayjs().add(i, "seconds").toDate()
    );
    i++;
  }, Promise.resolve(null));

  console.log("done");
  process.exit(0);
}
