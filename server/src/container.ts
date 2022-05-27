import { Container, singleton } from "@services/Container";
import config from "./config";
import { pgConnectFactory } from "@services/Database";
import { consoleFactory } from "@services/Log";
import { BlockchainContainer } from "@services/Blockchain";
import { ModelContainer } from "@models/container";
import { rabbitmqFactory } from "@services/Rabbitmq";

class AppContainer extends Container<typeof config> {
  readonly logger = singleton(consoleFactory());

  readonly database = singleton(pgConnectFactory(this.parent.database));

  readonly rabbitmq = singleton(rabbitmqFactory(this.parent.rabbitmq));

  readonly blockchain = new BlockchainContainer(this.parent.blockchain);

  readonly model = new ModelContainer(this);
}

export default new AppContainer(config);
