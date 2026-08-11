import type { UserConfig } from "@tyvox/sdk/contracts";

export interface HistoryEntry {
  id: string;
  input: string;
  output: string;
  duration: number;
  timestamp: string;
}

export interface VocabularyEntry {
  freq: number;
  lastSeen: string;
}

export interface VocabularyData {
  vocabulary: Record<string, VocabularyEntry>;
}

export interface HistoryRepository {
  list(userId: string): Promise<HistoryEntry[]>;
  add(userId: string, entry: HistoryEntry): Promise<void>;
  delete(userId: string, ids: string[]): Promise<void>;
}

export interface RecentHistoryEntry {
  output: string;
  timestamp: string;
}

export interface RecentHistoryRepository {
  list(userId: string): Promise<RecentHistoryEntry[]>;
  add(userId: string, entry: RecentHistoryEntry): Promise<void>;
}

export interface VocabularyRepository {
  read(userId: string): Promise<VocabularyData>;
  add(userId: string, entries: string[]): Promise<void>;
  delete(userId: string, entry: string): Promise<void>;
  rename(userId: string, oldEntry: string, newEntry: string): Promise<void>;
  clear(userId: string): Promise<void>;
}

export type PersonaCategory = "role" | "topic" | "tools";

export interface PersonaRow {
  id: string;
  category: PersonaCategory;
  fact: string;
  createdAt: string;
  updatedAt: string;
}

export interface Persona {
  rows: PersonaRow[];
}

export interface PersonaRepository {
  read(userId: string): Promise<Persona>;
  write(userId: string, persona: Persona): Promise<void>;
}

export interface UserConfigRepository {
  read(userId: string): Promise<UserConfig>;
  write(userId: string, config: UserConfig): Promise<void>;
}

export interface UserRepository {
  list(): Promise<string[]>;
}

export interface RecordingRepository {
  save(userId: string, sessionId: string, wav: Buffer): Promise<string>;
}
