import { startLiveGateway } from "./gateway";

const port = Number(process.env.LIVE_GATEWAY_PORT || 8787);
startLiveGateway(port);
console.log(`Gen3ia Live Gateway listening on :${port}`);
