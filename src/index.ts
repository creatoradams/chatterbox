import { MessageHub } from "./hub.js";
import { loadProfile } from "./profile.js";
import { ConnectorManager } from "./connectors/index.js";
import { createHttpServer, getListenConfig } from "./server/http.js";
import { WsBroadcaster } from "./server/ws.js";
import type { StreamerProfile } from "./types.js";

const hub = new MessageHub();
const connectors = new ConnectorManager(hub, () => {
  hub.emitStatus({ type: "status", data: connectors.getStatus() });
});

async function applyProfile(profile: StreamerProfile | null): Promise<void> {
  hub.setProfile(profile);
  await connectors.restart(profile);
}

const profile = loadProfile();
if (profile) {
  hub.setProfile(profile);
}

const server = createHttpServer(hub, connectors, applyProfile);
const ws = new WsBroadcaster();
ws.attach(server, hub);

const { host, port } = getListenConfig();

server.listen(port, host, async () => {
  console.log(`Chatterbox running at http://${host}:${port}`);
  console.log(`  Dashboard: http://${host}:${port}/dashboard/`);
  console.log(`  OBS overlay: http://${host}:${port}/overlay/obs`);

  if (profile) {
    await connectors.start(profile);
  } else {
    console.log("  No streamer profile yet — open the dashboard to set up.");
  }

  setInterval(() => connectors.emitStatus(), 15_000);
});

process.on("SIGINT", async () => {
  await connectors.stop();
  ws.close();
  server.close();
  process.exit(0);
});
