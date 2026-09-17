// app/team/join/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/lib/firebase/auth-client';
import { useTeam } from '@/lib/team/useTeam';
import type { TeamInvitation } from '@/lib/team/types';

export default function JoinTeamPage() {
  return (
    <Suspense fallback={<div className="p-8">Chargement...</div>}>
      <JoinTeamContent />
    </Suspense>
  );
}

function JoinTeamContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { user, loading: authLoading } = useAuth();
  const { acceptInvitation } = useTeam();
  const router = useRouter();
  const [invitation, setInvitation] = useState<TeamInvitation | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'joined' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      // Differe d'un tick pour eviter un rendu en cascade synchrone (set-state-in-effect).
      const timer = setTimeout(() => setStatus('error'), 0);
      return () => clearTimeout(timer);
    }
    const fetchInvite = async () => {
      const q = query(collection(db, 'invitations'), where('token', '==', token), where('status', '==', 'pending'));
      const snap = await getDocs(q);
      if (snap.empty) { setStatus('error'); return; }
      setInvitation({ id: snap.docs[0].id, ...snap.docs[0].data() } as TeamInvitation);
      setStatus('ready');
    };
    fetchInvite();
  }, [token]);

  const handleJoin = async () => {
    if (!invitation) return;
    await acceptInvitation(invitation);
    setStatus('joined');
    router.push(`/team/${invitation.teamId}`);
  };

  if (authLoading || status === 'loading') return <div className="p-8">Chargement...</div>;
  if (!user) return <div className="p-8">Connectez-vous pour accepter l’invitation.</div>;
  if (status === 'error') return <div className="p-8">Invitation invalide ou expirée.</div>;

  return (
    <div className="p-8 max-w-md mx-auto text-center">
      <h1 className="text-2xl font-bold mb-4">Rejoindre l’équipe</h1>
      {invitation && (
        <>
          <p className="mb-2">Vous êtes invité à rejoindre :</p>
          <p className="text-xl font-semibold mb-4">{invitation.teamName}</p>
          <p className="text-sm text-gray-500 mb-6">Rôle : {invitation.role}</p>
          <button
            onClick={handleJoin}
            className="px-6 py-2 rounded bg-blue-600 text-white"
          >
            Accepter et rejoindre
          </button>
        </>
      )}
    </div>
  );
}
