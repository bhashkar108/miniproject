import http from "node:http";
import app from "./app";
import { logger } from "./lib/logger";
import { initIO } from "./socketManager";

const rawPort = process.env["PORT"];
const port = (rawPort && !Number.isNaN(Number(rawPort)) && Number(rawPort) > 0) ? Number(rawPort) : 5000;

const server = http.createServer(app);
initIO(server);

server.listen(port, () => {
  logger.info({ port }, "Server listening with VoiceRoom real-time Socket.IO support");
});
