export function buildVocabularySection(vocabulary: string): string {
  if (!vocabulary) {
    return "";
  }
  return `## Vocabulary\nThe user often says these words. The speech recognizer may spell them wrong. Always spell them exactly like this:\n${vocabulary}`;
}
