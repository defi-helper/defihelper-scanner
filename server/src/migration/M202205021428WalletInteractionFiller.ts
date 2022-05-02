import container from "@container";
import dayjs, { Dayjs } from "dayjs";

export default async () => {
  const queue = container.model.queueService();
  const listeners = await container.model.contractEventListenerTable();
  return listeners.reduce<Promise<Dayjs>>(async (prev, { id }) => {
    const startAt = await prev;
    await queue.push("fillInteraction", { listenerId: id }, startAt.toDate());
    return startAt.clone().add(5, "seconds");
  }, Promise.resolve(dayjs()));
};
