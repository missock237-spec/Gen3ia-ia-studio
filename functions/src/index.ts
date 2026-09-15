// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// Supprime les invitations expirées toutes les 24h
export const cleanupExpiredInvitations = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();
    const expired = await db.collection('invitations')
      .where('status', '==', 'pending')
      .where('expiresAt', '<', now)
      .get();

    const batch = db.batch();
    expired.docs.forEach(doc => batch.update(doc.ref, { status: 'expired' }));
    await batch.commit();
    console.log(`${expired.size} invitations expirées marquées.`);
  });
