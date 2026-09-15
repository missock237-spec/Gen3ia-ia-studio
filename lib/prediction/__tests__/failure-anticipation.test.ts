import { describe, expect, it, vi } from "vitest";
import { anticipateTeamFailures } from "../failure-anticipation";

vi.mock("@/lib/team/feature-access", () => ({
  requireTeamFeatureAccess: vi.fn().mockResolvedValue(undefined),
}));

describe("anticipateTeamFailures", () => {
  it("detects critical high-impact execution risk", async () => {
    const result = await anticipateTeamFailures({
      userId: "user-1",
      teamId: "team-1",
      steps: [{ id: "publish", toolName: "ads.publish", timeoutMs: 120000, maxRetries: 4, sideEffect: true, requiresApproval: true }],
    });
    expect(result.blocked).toBe(true);
    expect(result.predictions[0]).toMatchObject({ stepId: "publish", severity: "critical", score: 100 });
    expect(result.predictions[0].failureModes).toEqual(expect.arrayContaining(["external side effect", "retry amplification", "high-impact tool"]));
  });

  it("keeps a simple read-only step below the critical threshold", async () => {
    const result = await anticipateTeamFailures({
      userId: "user-1",
      teamId: "team-1",
      steps: [{ id: "read", toolName: "file.read", timeoutMs: 30000, maxRetries: 1 }],
    });
    expect(result.blocked).toBe(false);
    expect(result.predictions[0].severity).toBe("low");
    expect(result.predictions[0].score).toBe(0);
  });
});
