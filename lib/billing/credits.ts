import {
  FieldValue,
} from "firebase-admin/firestore";

import {
  adminDb,
} from "@/lib/firebase/admin";

export async function consumeCredits(
  userId: string,
  amount: number,
) {
  if (
    !Number.isInteger(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "Invalid credit amount.",
    );
  }

  const userRef =
    adminDb
      .collection("users")
      .doc(userId);

  return adminDb.runTransaction(
    async (transaction) => {
      const snapshot =
        await transaction.get(
          userRef,
        );

      if (!snapshot.exists) {
        throw new Error(
          "User does not exist.",
        );
      }

      const data =
        snapshot.data();

      const credits =
        Number(data?.credits ?? 0);

      if (credits < amount) {
        throw new Error(
          "Insufficient credits.",
        );
      }

      transaction.update(
        userRef,
        {
          credits:
            FieldValue.increment(
              -amount,
            ),

          updatedAt:
            FieldValue.serverTimestamp(),
        },
      );

      return {
        remaining:
          credits - amount,
      };
    },
  );
}
