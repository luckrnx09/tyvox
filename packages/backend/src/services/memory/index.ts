import {
  historyRepository,
  personaRepository,
  vocabularyRepository,
  type HistoryEntry,
  type Persona,
} from "../../repositories/index.js";
import { getUserConfig } from "../user-config/index.js";
import { createLLMProvider } from "../llm/index.js";
import { extractMemory } from "./extract.js";

const BATCH_MAX_OUTPUT_CHARS = 500;
const MIN_OUTPUT_LENGTH_CHARS = 15;

export async function processUserMemory(userId: string): Promise<void> {
  const entries = await historyRepository.list(userId);
  if (entries.length === 0) return;

  const batch: HistoryEntry[] = [];
  const processedIds: string[] = [];
  let batchChars = 0;
  for (const entry of entries) {
    if (entry.output.length < MIN_OUTPUT_LENGTH_CHARS) {
      processedIds.push(entry.id);
      continue;
    }
    if (batch.length > 0 && batchChars + entry.output.length > BATCH_MAX_OUTPUT_CHARS) {
      break;
    }
    batch.push(entry);
    processedIds.push(entry.id);
    batchChars += entry.output.length;
  }

  if (batch.length > 0) {
    const config = await getUserConfig(userId);
    const provider = createLLMProvider(config.llm);
    const currentPersona = await personaRepository.read(userId);
    const extraction = await extractMemory(batch, currentPersona, provider);
    await vocabularyRepository.add(userId, extraction.vocabulary);
    if (!isEqualPersona(extraction.persona, currentPersona)) {
      await personaRepository.write(userId, extraction.persona);
    }
  }

  await historyRepository.delete(userId, processedIds);
}

function isEqualPersona(a: Persona, b: Persona): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
