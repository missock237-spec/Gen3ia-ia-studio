// app/team/[teamId]/page.tsx
'use client';

import Link from 'next/link';
import { useTeam } from '@/lib/team/useTeam';
import { TeamMembersPanel } from '@/components/team/TeamMembersPanel';
import { useParams } from 'next/navigation';

export default function TeamPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const { team, loading } = useTeam(teamId);

  if (loading) return <div className="p-8">Chargement...</div>;
  if (!team) return <div className="p-8">Équipe introuvable ou accès refusé.</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold">{team.name}</h1>
        {team.description && <p className="text-gray-500 mt-1">{team.description}</p>}
        <p className="text-sm text-gray-400 mt-1">{team.memberCount} membre(s)</p>
      </header>

      <section className="rounded-xl border p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Intelligence d’équipe avancée</h2>
            <p className="text-gray-500 mt-1">Coordination automatique, mémoire de travail optimisée et anticipation préventive des échecs.</p>
          </div>
          <Link href={`/team/${encodeURIComponent(teamId)}/advanced`} className="rounded-lg bg-black px-4 py-2 text-center text-white">Ouvrir</Link>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Membres de l'équipe</h2>
        <TeamMembersPanel teamId={teamId} />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Espace de travail partagé</h2>
        <p className="text-gray-500">Les agents, documents et sessions de cette équipe restent disponibles avec l’ensemble des fonctionnalités de Gen3ia.</p>
      </section>
    </div>
  );
}
