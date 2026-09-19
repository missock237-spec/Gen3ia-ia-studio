// components/team/TeamMembersPanel.tsx
'use client';

import { useState } from 'react';
import { useTeam } from '@/lib/team/useTeam';
import type { TeamRole } from '@/lib/team/types';

const ROLES: TeamRole[] = ['owner', 'admin', 'editor', 'viewer'];

const ROLE_LABELS: Record<TeamRole, string> = {
  owner: 'Propriétaire',
  admin: 'Admin',
  editor: 'Éditeur',
  viewer: 'Observateur',
};

export function TeamMembersPanel({ teamId }: { teamId: string }) {
  const { members, inviteMember, updateMemberRole, removeMember } = useTeam(teamId);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('editor');
  const [inviting, setInviting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [lastToken, setLastToken] = useState<string | null>(null);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || inviting) return;
    setInviting(true);
    setFeedback(null);
    try {
      const invitationToken = await inviteMember(inviteEmail.trim(), inviteRole);
      setLastToken(invitationToken);
      setFeedback({
        kind: 'ok',
        text: `Invitation envoyée à ${inviteEmail.trim()}. Partagez le lien ci-dessous pour rejoindre l'équipe.`,
      });
      setInviteEmail('');
    } catch (error) {
      const message = error instanceof Error ? error.message : "Échec de l'envoi de l'invitation.";
      setFeedback({ kind: 'error', text: message });
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulaire d'invitation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="invite-email" className="g3-label text-neutral-500">Inviter par email</label>
          <input
            id="invite-email"
            type="email"
            placeholder="membre@exemple.com"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') void handleInvite(); }}
            className="g3-input"
          />
        </div>
        <div className="sm:w-40">
          <label htmlFor="invite-role" className="g3-label text-neutral-500">Rôle</label>
          <select
            id="invite-role"
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value as TeamRole)}
            className="g3-select"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>{ROLE_LABELS[role]}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleInvite}
          disabled={inviting || !inviteEmail.trim()}
          className="g3-btn g3-btn-primary shrink-0 rounded-full"
        >
          {inviting ? 'Envoi…' : 'Inviter'}
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
            feedback.kind === 'ok'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <p>{feedback.text}</p>
          {feedback.kind === 'ok' && lastToken && (
            <code className="mt-2 block truncate rounded-lg bg-white/70 px-2 py-1 text-xs text-emerald-900">
              {`${typeof window !== 'undefined' ? window.location.origin : ''}/team/join?token=${lastToken}`}
            </code>
          )}
        </div>
      )}

      {/* Liste des membres */}
      <ul className="space-y-2.5">
        {members.map((member) => (
          <li
            key={member.userId}
            className="flex flex-col gap-3 rounded-2xl border border-neutral-200/80 bg-white p-4 transition hover:border-neutral-300 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-3">
              {member.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.photoURL} alt="" className="h-10 w-10 shrink-0 rounded-full border border-neutral-200" />
              ) : (
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-500">
                  {(member.displayName || member.email || '?').charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-900">{member.displayName || 'Membre'}</p>
                <p className="truncate text-xs text-neutral-500">{member.email}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <select
                value={member.role}
                onChange={(event) => updateMemberRole(member.userId, event.target.value as TeamRole)}
                className="g3-select w-auto py-1.5 text-xs"
                disabled={member.role === 'owner'}
                aria-label={`Rôle de ${member.displayName}`}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                ))}
              </select>
              {member.role !== 'owner' && (
                <button
                  type="button"
                  onClick={() => removeMember(member.userId)}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                >
                  Retirer
                </button>
              )}
            </div>
          </li>
        ))}
        {members.length === 0 && (
          <li className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/60 p-6 text-center text-sm text-neutral-500">
            Aucun membre affiché pour le moment.
          </li>
        )}
      </ul>
    </div>
  );
}
