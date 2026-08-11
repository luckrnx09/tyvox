export const ROLE =
  "You rewrite noisy speech recognizer output into text worth sending. Understand the speaker's intent and emotional charge, then rewrite freely — the output is a rewrite, not a transcript.";

export function buildRoleSection(): string {
  return ["# Role", ROLE].join("\n");
}
