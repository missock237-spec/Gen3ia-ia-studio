import { reduceTeamCognitiveLoad } from "../team-cognitive-load";

jest.mock("@/lib/team/feature-access", () => ({
  requireTeamFeatureAccess: jest.fn().mockResolvedValue(undefined),
}));

describe("reduceTeamCognitiveLoad", () => {
  it("prioritizes context, removes duplicates, and omits low-priority overflow", async () => {
    const memories = Array.from({ length: 20 }, (_, index) => ({
      id: `memory-${index}`,
      text: index === 0 ? "Important decision" : `Memory ${index}`,
      importance: index === 0 ? 1 : 0.5,
      tags: index === 1 ? ["next"] : [],
    }));

    const result = await reduceTeamCognitiveLoad({
      userId: "user-1",
      teamId: "team-1",
      workspace: {
        objective: "Prepare the launch",
        memories,
        recentMessages: [
          { role: "user", content: "Next: validate the launch checklist" },
          { role: "user", content: "Next: validate the launch checklist" },
        ],
        decisions: ["Use production safeguards", "Use production safeguards"],
        constraints: ["No unapproved external actions"],
      },
    });

    expect(result.teamId).toBe("team-1");
    expect(result.prioritizedContext[0]).toBe("OBJECTIF: Prepare the launch");
    expect(result.decisions).toEqual(["Use production safeguards"]);
    expect(result.constraints).toEqual(["No unapproved external actions"]);
    expect(result.omittedMemoryIds).toHaveLength(2);
    expect(result.omittedMemoryIds).toEqual(["memory-18", "memory-19"]);
    expect(result.nextActions).toEqual(expect.arrayContaining([
      "Memory 1",
      "validate the launch checklist",
    ]));
    expect(result.compressionRatio).toBeGreaterThan(0);
    expect(result.compressionRatio).toBeLessThanOrEqual(1);
  });

  it("normalizes and truncates noisy memory content", async () => {
    const result = await reduceTeamCognitiveLoad({
      userId: "user-1",
      teamId: "team-1",
      workspace: {
        memories: [{ id: "m1", text: "  hello   world  ", importance: 2 }],
      },
    });

    expect(result.prioritizedContext).toContain("MÉMOIRE: hello world");
  });
});
