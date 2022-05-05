import { TaskStatus } from "@models/Queue/Entity";
import container from "../container";

export async function main() {
  const result = await container.model.queueTable()
    .update({ status: TaskStatus.Pending })
    .whereRaw(`"updatedAt" < CURRENT_DATE - concat("timeout", ' seconds')`)
    .andWhere("status", TaskStatus.Process);

  console.log(`done, updated: ${result}`);
}
