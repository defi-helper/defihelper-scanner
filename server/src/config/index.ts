import dotenv from "dotenv";
dotenv.config();

export default {
  database: {
    host: process.env.DATABASE_HOST ?? "localhost",
    port: parseInt(process.env.DATABASE_PORT ?? "5432", 10),
    user: process.env.DATABASE_USER ?? "",
    password: process.env.DATABASE_PASSWORD ?? "",
    database: process.env.DATABASE_NAME ?? "",
  },
  blockchain: {
    ethMainNode: process.env.ETH_NODE ?? "",
    bscMainNode: process.env.BSC_NODE ?? "",
    polygonMainNode: process.env.POLYGON_NODE ?? "",
    avalanchMainNode: process.env.AVALANCH_NODE ?? "https://api.avax.network/ext/bc/C/rpc",
  },
};
