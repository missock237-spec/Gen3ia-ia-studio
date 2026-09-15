import { describe, expect, it } from 'vitest';
import { reduceTeamCognitiveLoad } from './team-cognitive-load';

describe('team cognitive load reduction', () => {
  it('deduplicates and prioritizes team context', () => {
    const result = reduceTeamCognitiveLoad({
      objective: 'Préparer le lancement',
      memories: [
        { id: '1', content: 'Budget limité', importance: 9 },
        { id: '2', content: 'Budget limité', importance: 7 },
        { id: '3', content: 'Lancement vendredi', importance: 8 },
      ],
      recentMessages: ['Lancement vendredi'],
      decisions: ['Lancement vendredi'],
      constraints: ['Budget limité'],
    });
    expect(result.items.length).toBeLessThanOrEqual(3);
    expect(result.items.map((item: { content: string }) => item.content)).toContain('Budget limité');
  });

  it('keeps the output bounded for large context', () => {
    const memories = Array.from({ length: 200 }, (_, i) => ({ id: String(i), content: `Mémoire ${i}`, importance: i % 10 }));
    const result = reduceTeamCognitiveLoad({ objective: 'test', memories, recentMessages: [], decisions: [], constraints: [] });
    expect(result.items.length).toBeLessThan(200);
  });
});
