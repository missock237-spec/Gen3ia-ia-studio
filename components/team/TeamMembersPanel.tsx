// components/team/TeamMembersPanel.tsx
'use client';

import { useState } from 'react';
import { useTeam } from '@/lib/team/useTeam';
import type { TeamRole } from '@/lib/team/types';

const ROLES: TeamRole[] = ['owner', 'admin', 'editor', 'viewer'];

export function TeamMembersPanel({ teamId }: { teamId: string }) {
  const { members, inviteMember, updateMemberRole, removeMember } = useTeam(teamId);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('editor');
  const [inviting, setInviting] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await inviteMember(inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      alert('Invitation envoyée !');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulaire d'invitation */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-sm font-medium">Inviter par email</label>
          <input
            type="email" placeholder="membre@exemple.com"
            value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
            className="w-full p-2 border rounded dark:bg-gray-800"
          />
        </div>
        <select
          value={inviteRole}
          onChange={e => setInviteRole(e.target.value as TeamRole)}
          className="p-2 border rounded dark:bg-gray-800"
        >
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button
          onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
        >
          {inviting ? '...' : 'Inviter'}
        </button>
      </div>

      {/* Liste des membres */}
      <div className="space-y-2">
        {members.map(m => (
          <div key={m.userId} className="flex items-center justify-between p-3 border rounded dark:border-gray-700">
            <div className="flex items-center gap-3">
              {m.photoURL && <img src={m.photoURL} alt="" className="w-8 h-8 rounded-full" />}
              <div>
                <p className="font-medium">{m.displayName}</p>
                <p className="text-xs text-gray-500">{m.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={m.role}
                onChange={e => updateMemberRole(m.userId, e.target.value as TeamRole)}
                className="text-sm p-1 border rounded dark:bg-gray-800"
                disabled={m.role === 'owner'}
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              {m.role !== 'owner' && (
                <button
                  onClick={() => removeMember(m.userId)}
                  className="text-red-500 text-sm hover:underline"
                >
                  Retirer
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
