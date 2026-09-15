// lib/team/useTeam.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, serverTimestamp, arrayUnion, arrayRemove, onSnapshot
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

  // Écoute en temps réel de l'équipe et des membres
  useEffect(() => {
    if (!teamId || !user) { setLoading(false); return; }

    const teamRef = doc(db, 'teams', teamId);
    const membersRef = collection(db, 'teams', teamId, 'members');

    const unsubTeam = onSnapshot(teamRef, (snap) => {
      if (snap.exists()) setTeam({ id: snap.id, ...snap.data() } as Team);
      setLoading(false);
    }, (err) => { setError(err.message); setLoading(false); });

    const unsubMembers = onSnapshot(membersRef, (snap) => {
      setMembers(snap.docs.map(d => ({ userId: d.id, ...d.data() } as TeamMember)));
    });

    return () => { unsubTeam(); unsubMembers(); };
  }, [teamId, user]);

  // Créer une équipe
  const createTeam = useCallback(async (name: string, description?: string) => {
    if (!user) throw new Error('Non authentifié');
    const teamRef = await addDoc(collection(db, 'teams'), {
      name, description: description || '', ownerId: user.uid,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      memberCount: 1, isArchived: false,
    });
    // Ajouter le créateur comme owner
    await addDoc(collection(db, 'teams', teamRef.id, 'members'), {
      userId: user.uid, email: user.email, displayName: user.displayName || 'Utilisateur',
      photoURL: user.photoURL || '', role: 'owner' as TeamRole,
      joinedAt: serverTimestamp(), invitedBy: user.uid,
    });
    // Index utilisateur
    await addDoc(collection(db, 'userTeams'), {
      userId: user.uid, teamId: teamRef.id, role: 'owner' as TeamRole,
    });
    return teamRef.id;
  }, [user]);

  // Inviter un membre
  const inviteMember = useCallback(async (email: string, role: TeamRole) => {
    if (!user || !teamId) throw new Error('Contexte manquant');
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours

    const invRef = await addDoc(collection(db, 'invitations'), {
      teamId, teamName: team?.name || '', invitedEmail: email,
      invitedBy: { userId: user.uid, displayName: user.displayName || '' },
      role, status: 'pending', token, createdAt: serverTimestamp(), expiresAt,
    });

    // Appeler l'API route pour envoyer l'email
    await fetch('/api/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationId: invRef.id, email, teamName: team?.name, token }),
    });

    return invRef.id;
  }, [user, teamId, team]);

  // Accepter une invitation
  const acceptInvitation = useCallback(async (invitation: TeamInvitation) => {
    if (!user) throw new Error('Non authentifié');
    // Ajouter comme membre
    await addDoc(collection(db, 'teams', invitation.teamId, 'members'), {
      userId: user.uid, email: user.email, displayName: user.displayName || 'Utilisateur',
      photoURL: user.photoURL || '', role: invitation.role,
      joinedAt: serverTimestamp(), invitedBy: invitation.invitedBy.userId,
    });
    // Mettre à jour l'invitation
    await updateDoc(doc(db, 'invitations', invitation.id), { status: 'accepted' });
    // Index utilisateur
    await addDoc(collection(db, 'userTeams'), {
      userId: user.uid, teamId: invitation.teamId, role: invitation.role,
    });
    // Incrémenter memberCount (via transaction idéalement)
    await updateDoc(doc(db, 'teams', invitation.teamId), {
      memberCount: (team?.memberCount || 0) + 1,
      updatedAt: serverTimestamp(),
    });
  }, [user, team]);

  // Modifier le rôle d'un membre
  const updateMemberRole = useCallback(async (memberId: string, newRole: TeamRole) => {
    if (!teamId) return;
    await updateDoc(doc(db, 'teams', teamId, 'members', memberId), { role: newRole });
  }, [teamId]);

  // Retirer un membre
  const removeMember = useCallback(async (memberId: string) => {
    if (!teamId) return;
    await deleteDoc(doc(db, 'teams', teamId, 'members', memberId));
    await updateDoc(doc(db, 'teams', teamId), {
      memberCount: Math.max(0, (team?.memberCount || 1) - 1),
      updatedAt: serverTimestamp(),
    });
  }, [teamId, team]);

  return {
    team, members, loading, error,
    createTeam, inviteMember, acceptInvitation,
    updateMemberRole, removeMember,
  };
}
