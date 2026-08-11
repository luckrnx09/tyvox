import { join } from "node:path";
import { APP_DATA_DIR } from "../paths.js";
import { createFileHistoryRepository } from "./history.js";
import { createFileRecentHistoryRepository } from "./recent-history.js";
import { createFileRecordingRepository } from "./recordings.js";
import { createFileVocabularyRepository } from "./vocabulary.js";
import { createFilePersonaRepository } from "./persona.js";
import { createFileUserConfigRepository } from "./user-config.js";
import { createFileUserRepository } from "./user.js";

export type {
  HistoryEntry,
  HistoryRepository,
  Persona,
  PersonaCategory,
  PersonaRepository,
  PersonaRow,
  RecentHistoryEntry,
  RecentHistoryRepository,
  RecordingRepository,
  UserConfigRepository,
  UserRepository,
  VocabularyData,
  VocabularyEntry,
  VocabularyRepository,
} from "./types.js";
export { DEFAULT_CONFIG } from "./user-config.js";
export {
  MAX_PERSONA_ROW_CHARS,
  MAX_PERSONA_ROWS,
  MAX_PERSONA_TOTAL_CHARS,
  serializePersonaRows,
  validatePersona,
} from "./persona-validation.js";

const USERS_ROOT = join(APP_DATA_DIR, "users");

export const historyRepository = createFileHistoryRepository(USERS_ROOT);
export const recentHistoryRepository = createFileRecentHistoryRepository(USERS_ROOT);
export const recordingRepository = createFileRecordingRepository(USERS_ROOT);
export const vocabularyRepository = createFileVocabularyRepository(USERS_ROOT);
export const personaRepository = createFilePersonaRepository(USERS_ROOT);
export const userConfigRepository = createFileUserConfigRepository(USERS_ROOT);
export const userRepository = createFileUserRepository(USERS_ROOT);
