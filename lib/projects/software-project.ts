import fs from "node:fs/promises";
import path from "node:path";

export interface SoftwareProject {
  id: string;
  ownerId: string;
  name: string;
  root: string;
  createdAt: string;
}

const SAFE_PROJECT_NAME =
  /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,80}$/;

export function validateProjectName(
  name: string,
): string {
  const value = name.trim();

  if (!SAFE_PROJECT_NAME.test(value)) {
    throw new Error(
      "Invalid project name.",
    );
  }

  return value;
}

export async function initializeSoftwareProject(
  project: SoftwareProject,
): Promise<void> {
  const root = path.resolve(project.root);

  await fs.mkdir(root, {
    recursive: true,
  });

  await fs.mkdir(
    path.join(root, "src"),
    {
      recursive: true,
    },
  );

  await fs.mkdir(
    path.join(root, "tests"),
    {
      recursive: true,
    },
  );

  await fs.mkdir(
    path.join(root, ".gen3ia"),
    {
      recursive: true,
    },
  );

  await fs.writeFile(
    path.join(root, ".gen3ia", "project.json"),
    JSON.stringify(
      {
        id: project.id,
        ownerId: project.ownerId,
        name: project.name,
        createdAt: project.createdAt,
      },
      null,
      2,
    ),
    "utf8",
  );
}
