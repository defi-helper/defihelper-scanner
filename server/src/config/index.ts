import dotenv from "dotenv";
dotenv.config();

export default {
  sentryDsn: process.env.SENTRY_DSN ?? "",
  database: {
    host: process.env.DATABASE_HOST ?? "localhost",
    port: parseInt(process.env.DATABASE_PORT ?? "5432", 10),
    user: process.env.DATABASE_USER ?? "",
    password: process.env.DATABASE_PASSWORD ?? "",
    database: process.env.DATABASE_NAME ?? "",
    ssl: process.env.DATABASE_SSL ?? "",
  },
  rabbitmq: {
    host: process.env.RABBITMQ_HOST ?? 'amqp://localhost:5672',
    options: {
      prefetch: parseInt(process.env.RABBITMQ_PREFETCH ?? '1', 10),
      replyPattern: Boolean(process.env.RABBITMQ_REPLY ?? ''),
      scheduledPublish: Boolean(process.env.RABBITMQ_SCHEDULED_PUBLISH ?? ''),
    },
    queues: [
      { name: 'tasks_default', topic: 'tasks.*.default' },
      { name: 'tasks_metricHistory', topic: 'tasks.*.metricHistory' },
      { name: 'tasks_metricCurrent', topic: 'tasks.*.metricCurrent' },
    ],
  },
  blockchain: {
    ethMainNode: process.env.ETH_NODE ?? "",
    bscMainNode: process.env.BSC_NODE ?? "",
    polygonMainNode: process.env.POLYGON_NODE ?? "",
    moonriverMainNode: process.env.MOONRIVER_NODE ?? "",
    avalancheMainNode: process.env.AVALANCHE_NODE ?? "",

    ethMainNodeUser: process.env.ETH_NODE_USER ?? "",
    bscMainNodeUser: process.env.BSC_NODE_USER ?? "",
    polygonMainNodeUser: process.env.POLYGON_NODE_USER ?? "",
    moonriverMainNodeUser: process.env.MOONRIVER_NODE_USER ?? "",
    avalancheMainNodeUser: process.env.AVALANCHE_NODE_USER ?? "",

    ethMainNodePassword: process.env.ETH_NODE_PASSWORD ?? "",
    bscMainNodePassword: process.env.BSC_NODE_PASSWORD ?? "",
    polygonMainNodePassword: process.env.POLYGON_NODE_PASSWORD ?? "",
    moonriverMainNodePassword: process.env.MOONRIVER_NODE_PASSWORD ?? "",
    avalancheMainNodePassword: process.env.AVALANCHE_NODE_PASSWORD ?? "",
  },
};
