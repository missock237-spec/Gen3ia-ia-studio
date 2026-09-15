// components/team/CreateTeamModal.tsx
'use client';

import { useState } from 'react';
import { useTeam } from '@/lib/team/useTeam';
import { useRouter } from 'next/navigation';

export function CreateTeamModal({ onClose }: { onClose: () => void }) {
  const { createTeam } = useTeam();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const teamId = await createTeam(name.trim(), description.trim());
      router.push(`/team/${teamId}`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-bold mb-4">Créer une équipe</h2>
        <input
          type="text" placeholder="Nom de l'équipe"
          value={name} onChange={e => setName(e.target.value)}
          className="w-full p-2 border rounded mb-3 dark:bg-gray-800"
        />
        <textarea
          placeholder="Description (optionnel)"
          value={description} onChange={e => setDescription(e.target.value)}
          className="w-full p-2 border rounded mb-4 dark:bg-gray-800"
          rows={3}
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded border">Annuler</button>
          <button
            onClick={handleCreate} disabled={loading || !name.trim()}
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
          >
            {loading ? 'Création...' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}
