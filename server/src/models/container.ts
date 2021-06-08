import { resolve } from "path";
import { Container, singleton } from "@services/Container";
import AppContainer from "@container";
import * as Models from "@models/index";

export class ModelContainer extends Container<typeof AppContainer> {
  readonly migrationTable = Models.Migration.Entity.tableFactory(
    this.parent.database
  );

  readonly migrationService = singleton(
    Models.Migration.Service.factory(
      this.parent.logger,
      this.parent.database,
      this.migrationTable,
      resolve(__dirname, "../migration")
    )
  );

  readonly queueTable = Models.Queue.Entity.tableFactory(this.parent.database);

  readonly queueService = singleton(
    () => new Models.Queue.Service.QueueService(this.queueTable)
  );

  readonly contractTable = Models.Contract.Entity.contractTableFactory(
    this.parent.database
  );

  readonly contractService = singleton(
    () => new Models.Contract.Service.ContractService(this.contractTable)
  );

  readonly contractEventListenerTable =
    Models.Contract.Entity.eventListenerTableFactory(this.parent.database);

  readonly contractEventListenerService = singleton(
    () =>
      new Models.Contract.Service.EventListenerService(
        this.contractEventListenerTable
      )
  );

  readonly contractEventTable = Models.Contract.Entity.eventTableFactory(
    this.parent.database
  );

  readonly contractEventService = singleton(
    () => new Models.Contract.Service.EventService(this.contractEventTable)
  );
}
