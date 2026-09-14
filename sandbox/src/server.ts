import Fastify from "fastify";

import { SandboxJobSchema } from "./job-schema";
import { verifySignature } from "./security";
import { runSandbox } from "./runner";

const app = Fastify({
  logger: true,
  bodyLimit: 600_000
});

app.get("/health", async () => ({
  ok: true,
  service: "gen3ia-sandbox"
}));

app.post("/execute", async (request, reply) => {
  const timestamp = request.headers["x-gen3ia-timestamp"];
  const signature = request.headers["x-gen3ia-signature"];
  const requestId = request.headers["x-gen3ia-request-id"];

  if (
    typeof timestamp !== "string" ||
    typeof signature !== "string" ||
    typeof requestId !== "string"
  ) {
    return reply.code(401).send({ error: "Missing authentication headers" });
  }

  const rawBody = JSON.stringify(request.body);
  if (!verifySignature(rawBody, timestamp, signature, requestId)) {
    return reply.code(401).send({ error: "Invalid or replayed request" });
  }

  const parsed = SandboxJobSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({
      error: "Invalid sandbox job",
      details: parsed.error.issues
    });
  }

  try {
    const result = await runSandbox(parsed.data);
    return reply.send(result);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Sandbox execution failed" });
  }
});

const port = Number(process.env.PORT ?? 8080);

app.listen({ host: "0.0.0.0", port }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
