import app from "./app";
import { connectRedis } from "./lib/redis";
import { startHealthMonitor } from "./services/healthMonitor";

const port = Number(process.env.PORT) || 4000;

void connectRedis().catch((error: unknown) => {
  console.error("Unable to connect to Redis; gateway requests will be unavailable until it recovers.", error);
});
startHealthMonitor();

app.listen(port, () => {
  console.log(`TrafficFlow API listening on http://localhost:${port}`);
});