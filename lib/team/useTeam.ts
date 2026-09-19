// lib/team/useTeam.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp,
  runTransaction, onSnapshot, arrayUnion, getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/lib/firebase/auth-client';
import type { Team, TeamMember, TeamInvitation, TeamRole } from './types';

export function useTeam(teamId?: string) {
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId || !user) {
      // Differe d'un tick pour eviter un rendu en cascade synchrone (set-state-in-effect).
      const timer = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(timer);
    }
    const teamRef = doc(db, 'teams', teamId);
    const membersRef = collection(db, 'teams', teamId, 'members');
    const unsubTeam = onSnapshot(teamRef, (snap) => {
      if (snap.exists()) setTeam({ id: snap.id, ...snap.data() } as Team);
      else setTeam(null);
      setLoading(false);
    }, (err) => { setError(err.message); setLoading(false); });
    const unsubMembers = onSnapshot(membersRef, (snap) => {
      setMembers(snap.docs.map(d => ({ userId: d.id, ...d.data() } as TeamMember)));
    }, (err) => setError(err.message));
    return () => { unsubTeam(); unsubMembers(); };
  }, [teamId, user]);

  const createTeam = useCallback(async (name: string, description?: string) => {
    if (!user) throw new Error('Non authentifié');
    const normalizedName = name.trim();
    if (!normalizedName || normalizedName.length > 200) throw new Error('Nom d’équipe invalide');
    const normalizedDescription = (description ?? '').trim().slice(0, 2000);
    const teamRef = doc(collection(db, 'teams'));
    const memberRef = doc(db, 'teams', teamRef.id, 'members', user.uid);
    // L'identifiant du document userTeams doit etre l'UID Firebase : les
    // regles Firestore n'autorisent l'ecriture que sur /userTeams/{uid}.
    const userTeamRef = doc(db, 'userTeams', user.uid);
    await runTransaction(db, async (tx) => {
      tx.set(teamRef, { name: normalizedName, description: normalizedDescription, ownerId: user.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), memberCount: 1, isArchived: false });
      tx.set(memberRef, { userId: user.uid, email: user.email ?? '', displayName: user.displayName || 'Utilisateur', photoURL: user.photoURL || '', role: 'owner' as TeamRole, joinedAt: serverTimestamp(), invitedBy: user.uid });
      tx.set(userTeamRef, { userId: user.uid, teams: arrayUnion(teamRef.id), primaryTeam: teamRef.id }, { merge: true });
    });
    return teamRef.id;
  }, [user]);

  const inviteMember = useCallback(async (email: string, role: TeamRole) => {
    if (!user || !teamId) throw new Error('Contexte manquant');
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error('Adresse email invalide');
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invRef = await addDoc(collection(db, 'invitations'), { teamId, teamName: team?.name || '', invitedEmail: normalizedEmail, invitedBy: { userId: user.uid, displayName: user.displayName || '' }, role, status: 'pending', token, createdAt: serverTimestamp(), expiresAt });
    const response = await fetch('/api/team/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invitationId: invRef.id, email: normalizedEmail, teamName: team?.name, token }) });
    if (!response.ok) throw new Error('Échec de l’envoi de l’invitation');
    return token;
  }, [user, teamId, team]);

  const acceptInvitation = useCallback(async (invitation: TeamInvitation) => {
    if (!user) throw new Error('Non authentifié');
    const teamRef = doc(db, 'teams', invitation.teamId);
    const memberRef = doc(db, 'teams', invitation.teamId, 'members', user.uid);
    // Document identifie par l'UID Firebase, conformement aux regles Firestore.
    const userTeamRef = doc(db, 'userTeams', user.uid);
    const invitationRef = doc(db, 'invitations', invitation.id);
    await runTransaction(db, async (tx) => {
      const [teamSnap, memberSnap, invitationSnap] = await Promise.all([tx.get(teamRef), tx.get(memberRef), tx.get(invitationRef)]);
      if (!teamSnap.exists()) throw new Error('Équipe introuvable');
      if (memberSnap.exists()) throw new Error('Utilisateur déjà membre de cette équipe');
      if (!invitationSnap.exists() || invitationSnap.data()?.status !== 'pending') throw new Error('Invitation invalide ou déjà utilisée');
      const rawExpiry = invitationSnap.data()?.expiresAt;
      const expiresAt = typeof rawExpiry?.toDate === 'function' ? rawExpiry.toDate() : null;
      if (expiresAt && expiresAt.getTime() < Date.now()) throw new Error('Invitation expirée');
      const currentCount = Number(teamSnap.data()?.memberCount ?? 0);
      if (!Number.isSafeInteger(currentCount) || currentCount < 0) throw new Error('Compteur de membres invalide');
      tx.set(memberRef, { userId: user.uid, email: user.email ?? '', displayName: user.displayName || 'Utilisateur', photoURL: user.photoURL || '', role: invitation.role, joinedAt: serverTimestamp(), invitedBy: invitation.invitedBy.userId });
      tx.set(userTeamRef, { userId: user.uid, teams: arrayUnion(invitation.teamId), primaryTeam: invitation.teamId }, { merge: true });
      tx.update(teamRef, { memberCount: currentCount + 1, updatedAt: serverTimestamp() });
      tx.update(invitationRef, { status: 'accepted' });
    });
  }, [user]);

  const updateMemberRole = useCallback(async (memberId: string, newRole: TeamRole) => {
    if (!teamId) return;
    await updateDoc(doc(db, 'teams', teamId, 'members', memberId), { role: newRole });
  }, [teamId]);

  // Liste les equipes de l'utilisateur : lit le document userTeams/{uid}
  // puis charge chaque equipe referencee.
  const fetchMyTeams = useCallback(async (): Promise<Team[]> => {
    if (!user) return [];
    const userTeamSnap = await getDoc(doc(db, 'userTeams', user.uid));
    const teamIds = (userTeamSnap.data()?.teams as string[] | undefined) ?? [];
    const loaded = await Promise.all(
      teamIds.map(async (id) => {
        const snap = await getDoc(doc(db, 'teams', id));
        return snap.exists() ? ({ id: snap.id, ...snap.data() } as Team) : null;
      })
    );
    return loaded.filter((team): team is Team => team !== null && !team.isArchived);
  }, [user]);

  const removeMember = useCallback(async (memberId: string) => {
    if (!teamId) return;
    await runTransaction(db, async (tx) => {
      const teamRef = doc(db, 'teams', teamId);
      const memberRef = doc(db, 'teams', teamId, 'members', memberId);
      const teamSnap = await tx.get(teamRef);
      const memberSnap = await tx.get(memberRef);
      if (!teamSnap.exists() || !memberSnap.exists()) return;
      const count = Number(teamSnap.data()?.memberCount ?? 0);
      if (!Number.isSafeInteger(count) || count <= 0) throw new Error('Compteur de membres invalide');
      tx.delete(memberRef);
      tx.update(teamRef, { memberCount: count - 1, updatedAt: serverTimestamp() });
    });
  }, [teamId]);

  return { team, members, loading, error, createTeam, inviteMember, acceptInvitation, updateMemberRole, removeMember, fetchMyTeams };
}
