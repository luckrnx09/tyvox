import { vocabularyRepository, type VocabularyData } from "../../repositories/index.js";
import { MS_PER_DAY } from "../../utils/dates.js";

const MAX_PROMOTED_ITEMS = 30;
const DECAY_DAYS = 30;

export interface VocabularyOutput {
  vocabulary: Record<string, number>;
}

export async function getVocabulary(userId: string): Promise<VocabularyOutput> {
  const data = await vocabularyRepository.read(userId);
  const vocabulary: Record<string, number> = {};
  for (const [key, item] of Object.entries(data.vocabulary)) {
    vocabulary[key] = item.freq;
  }
  return { vocabulary };
}

export async function addEntry(userId: string, entry: string): Promise<void> {
  await vocabularyRepository.add(userId, [entry]);
}

export async function deleteEntry(userId: string, entry: string): Promise<void> {
  await vocabularyRepository.delete(userId, entry);
}

export async function renameEntry(
  userId: string,
  oldEntry: string,
  newEntry: string,
): Promise<void> {
  await vocabularyRepository.rename(userId, oldEntry, newEntry);
}

export async function clearVocabulary(userId: string): Promise<void> {
  await vocabularyRepository.clear(userId);
}

export async function getPromotedVocabulary(userId: string): Promise<string[]> {
  const data = await vocabularyRepository.read(userId);
  return rankPromotedEntries(data);
}

export async function getVocabularyMarkdown(userId: string): Promise<string> {
  const promoted = await getPromotedVocabulary(userId);
  if (promoted.length === 0) return "";
  return promoted.map((entry) => `- ${entry}`).join("\n");
}

function rankPromotedEntries(data: VocabularyData): string[] {
  const now = Date.now();
  return Object.entries(data.vocabulary)
    .map(([entry, item]) => {
      const days = Math.floor((now - new Date(item.lastSeen).getTime()) / MS_PER_DAY);
      const freshness = Math.max(0, 1 - days / DECAY_DAYS);
      return { entry, score: item.freq * freshness };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PROMOTED_ITEMS)
    .map((candidate) => candidate.entry);
}
