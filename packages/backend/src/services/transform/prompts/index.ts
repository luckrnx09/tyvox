import type { TransformTextEnrichOption } from "@tyvox/sdk/contracts";
import type { Persona } from "../../../repositories/types.js";
import { buildRoleSection } from "./role.js";
import { buildPersonaSection } from "./persona.js";
import { buildRulesSection } from "./rules.js";
import { buildToneSection, type TonePreset } from "./tone.js";
import { buildTranslateRule } from "./translate.js";
import { buildVocabularySection } from "./vocabulary.js";

export interface TransformContext {
  persona: Persona;
  vocabulary: string;
  tone: TonePreset;
  languages: string;
  recentHistory: string;
}

function buildLanguagesSection(languages: string): string {
  if (!languages) {
    return "";
  }
  return `## Languages\nThe user's languages: ${languages}.`;
}

function buildUserContextSection(fragments: string[]): string {
  const present = fragments.filter((fragment) => fragment.length > 0);
  if (present.length === 0) {
    return "";
  }
  return ["# User Context", ...present].join("\n\n");
}

function buildEnrichmentSection(enrichOptions: TransformTextEnrichOption[]): string {
  if (enrichOptions.length === 0) {
    return "";
  }
  const rules = enrichOptions.map((option) => {
    switch (option.type) {
      case "translate":
        return buildTranslateRule(option.payload);
    }
  });
  return `# Enrichment\n${rules.map((rule) => `- ${rule}`).join("\n")}`;
}

function buildOutputInstruction(hasEnrichment: boolean): string {
  const requirement = hasEnrichment
    ? "It must satisfy the Rules above and the Enrichment section."
    : "It must satisfy the Rules above.";
  return `# Output\nOutput only the final text. ${requirement} No explanations, no notes.`;
}

export function buildTransformPrompt(
  enrichOptions: TransformTextEnrichOption[],
  context: TransformContext,
): string {
  const sections = [
    buildRoleSection(),
    buildRulesSection(),
    buildToneSection(context.tone),
    buildUserContextSection([
      buildLanguagesSection(context.languages),
      buildPersonaSection(context.persona),
      buildVocabularySection(context.vocabulary),
      context.recentHistory,
    ]),
    buildEnrichmentSection(enrichOptions),
    buildOutputInstruction(enrichOptions.length > 0),
  ];
  return sections.filter((section) => section.length > 0).join("\n\n");
}
