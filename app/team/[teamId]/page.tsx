// app/team/[teamId]/page.tsx
'use client';

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
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold">{team.name}</h1>
        {team.description && <p className="text-gray-500 mt-1">{team.description}</p>}
        <p className="text-sm text-gray-400 mt-1">{team.memberCount} membre(s)</p>
      </header>

      <section>
        <h2 className="text-xl font-semibold mb-4">Membres de l'équipe</h2>
        <TeamMembersPanel teamId={teamId} />
      </section>

      {/* Ici, vous pouvez intégrer vos agents, documents, sessions... */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Espace de travail partagé</h2>
        <p className="text-gray-500">
          Les agents, documents et sessions de cette équipe apparaîtront ici.
        </p>
      </section>
    </div>
  );
}
