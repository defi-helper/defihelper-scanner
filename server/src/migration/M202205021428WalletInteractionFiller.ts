import container from "@container";
import dayjs, { Dayjs } from "dayjs";

export default async () => {
  const queue = container.model.queueService();
  const listeners = await container.model.contractEventListenerTable();
  return listeners.reduce<Promise<Dayjs>>(async (prev, { id }) => {
    const startAt = await prev; // 5 mintues to seconds
    await queue.push("fillInteraction", { listenerId: id }, 300, startAt.toDate());
    return startAt.clone().add(5, "seconds");
  }, Promise.resolve(dayjs()));
};
