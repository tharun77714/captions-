import { test } from 'node:test';
import assert from 'node:assert';
import { getGroupedWords, getSecondaryGroupedWords } from './grouping';
import type { LabWord } from './types';

const mockWords: LabWord[] = [
  { id: '1', text: 'hello', start: 0, end: 1 },
  { id: '2', text: 'world', start: 1, end: 2 },
  { id: '3', text: 'this', start: 2, end: 3 },
  { id: '4', text: 'is', start: 3, end: 4 },
  { id: '5', text: 'vidyut', start: 4, end: 5 },
];

test('grouping preserves source traceability (active state)', () => {
  const grouped = getGroupedWords(mockWords, 'active', 3);
  
  const allIds = [
    ...grouped.previousWords,
    ...(grouped.activeWord ? [grouped.activeWord] : []),
    ...grouped.upcomingWords,
    ...grouped.hiddenByStoryboardState
  ].map(w => w.id).sort();

  const sourceIds = mockWords.map(w => w.id).sort();
  assert.deepStrictEqual(allIds, sourceIds, 'Union of partitions must equal source exactly');
});

test('completed state behavior', () => {
  const grouped = getGroupedWords(mockWords, 'completed', 3);
  assert.strictEqual(grouped.activeWord, null, 'Active word must be null in completed state');
  
  const allIds = [
    ...grouped.previousWords,
    ...grouped.upcomingWords,
    ...grouped.hiddenByStoryboardState
  ].map(w => w.id).sort();
  const sourceIds = mockWords.map(w => w.id).sort();
  assert.deepStrictEqual(allIds, sourceIds, 'Traceability maintained in completed state');
});

test('maximum positive temporal overlap bilingual mapping', () => {
  const primary = getGroupedWords(mockWords, 'active', 3);
  if (primary.activeWord) {
    const secWords: LabWord[] = [
      { id: 's1', text: 'a', start: 0, end: 1 },
      { id: 's2', text: 'b', start: 1.5, end: 3.5 },
      { id: 's3', text: 'c', start: 2.2, end: 2.8 }, 
    ];

    const secGrouped = getSecondaryGroupedWords(primary, secWords, 'active', 3);
    assert.strictEqual(secGrouped?.activeWord?.id, 's2', 'Must pick s2 due to max overlap');
  }
});

test('closest midpoint fallback', () => {
  const primary = getGroupedWords([{ id: '1', text: 'A', start: 10, end: 12 }], 'active', 3);
  const secWords: LabWord[] = [
    { id: 's1', text: 'early', start: 0, end: 1 },
    { id: 's2', text: 'late', start: 20, end: 21 },
  ];
  const secGrouped = getSecondaryGroupedWords(primary, secWords, 'active', 3);
  assert.strictEqual(secGrouped?.activeWord?.id, 's2', 'Picks s2 (dist 9.5) over s1 (dist 10.5)');
});

test('unequal primary/secondary word counts and missing lane', () => {
  const primary = getGroupedWords(mockWords, 'active', 3);
  const secGrouped = getSecondaryGroupedWords(primary, [], 'active', 3);
  assert.strictEqual(secGrouped, undefined, 'Missing secondary lane returns undefined');
});
