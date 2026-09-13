export function assertOwner(
  ownerId: string,
  userId: string,
): void {
  if (
    !ownerId ||
    !userId ||
    ownerId !== userId
  ) {
    throw new Error(
      "Resource access denied",
    );
  }
}

export function assertSameUser(
  resourceUserId: string,
  authenticatedUserId: string,
): void {
  assertOwner(
    resourceUserId,
    authenticatedUserId,
  );
}
