import {
  createSkill,
  getSkill,
} from "./repository";

import {
  SYSTEM_SKILLS,
} from "./defaults";

export async function bootstrapSystemSkills() {
  const results: string[] = [];

  for (const skill of SYSTEM_SKILLS) {
    const existing =
      await getSkill(skill.id);

    if (existing) {
      results.push(
        `${skill.id}: already exists`,
      );

      continue;
    }

    await createSkill(skill);

    results.push(
      `${skill.id}: created`,
    );
  }

  return results;
}
