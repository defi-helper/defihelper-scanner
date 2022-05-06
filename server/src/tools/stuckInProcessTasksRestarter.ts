import { TaskStatus } from "@models/Queue/Entity";
import container from "../container";

export async function main() {
  await container.model.queueTable()
    .update({ status: TaskStatus.Pending })
    .whereRaw(`"updatedAt" < CURRENT_DATE - (INTERVAL '1 second' * "timeout")`)
    .andWhere("timeout is not null")
    .andWhere("status", TaskStatus.Process)

  console.log(`done, updated successful`);
}
