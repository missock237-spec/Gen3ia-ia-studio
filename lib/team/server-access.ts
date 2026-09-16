import 'server-only';
import { adminDb } from '@/lib/firebase/admin';

export type TeamAccess = { teamId: string; userId: string; role: string };

export async function requireTeamMembership(userId: string, teamId: string): Promise<TeamAccess> {
  if (!userId?.trim() || !teamId?.trim() || teamId.length > 200 || /[/.#\[\]]/.test(teamId)) {
    throw new Error('Accès équipe invalide');
  }
  const db = adminDb;
  const snap = await db.collection('teams').doc(teamId).get();
  if (!snap.exists || snap.data()?.isArchived === true) throw new Error('Équipe introuvable');
  const member = await db.collection('teams').doc(teamId).collection('members').doc(userId).get();
  if (!member.exists) throw new Error('Accès équipe refusé');
  const role = String(member.data()?.role ?? '');
  if (!['owner', 'admin', 'member'].includes(role)) throw new Error('Rôle équipe invalide');
  return { teamId, userId, role };
}
