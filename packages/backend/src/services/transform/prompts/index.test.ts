import { describe, expect, it, test } from "vitest";
import { buildTransformPrompt, type TransformContext } from "./index.js";
import type { Persona } from "../../../repositories/types.js";
import { TONE_PRESETS } from "./tone.js";
import type { TransformTextEnrichOption } from "@tyvox/sdk/contracts";
import { MS_PER_DAY } from "../../../utils/dates.js";

const emptyContext: TransformContext = {
  persona: { rows: [] },
  vocabulary: "",
  tone: TONE_PRESETS.professional,
  languages: "",
  recentHistory: "",
};

describe("buildTransformPrompt", () => {
  test("includes role, rules, examples, and output instruction", () => {
    const prompt = buildTransformPrompt([], emptyContext);
    expect(prompt).toContain("# Role");
    expect(prompt).toContain("speech recognizer");
    expect(prompt).toContain("# Rules");
    expect(prompt).toContain("similar-sounding");
    expect(prompt).toContain("numbered list");
    expect(prompt).toContain("# Output\n");
    expect(prompt).toContain("Output only the final text");
    expect(prompt).toContain("It must satisfy the Rules above.");
  });

  test("role demands a free rewrite that keeps emotional charge", () => {
    const prompt = buildTransformPrompt([], emptyContext);
    expect(prompt).toContain("emotional charge");
    expect(prompt).toContain("not a transcript");
  });

  test("rules preserve emotion and profanity", () => {
    const prompt = buildTransformPrompt([], emptyContext);
    expect(prompt).toContain("Keep the speaker's emotion");
    expect(prompt).toContain("swear words");
  });

  test("includes tone preset with instruction, weight note, and examples", () => {
    const preset = TONE_PRESETS.casual;
    const prompt = buildTransformPrompt([], {
      ...emptyContext,
      tone: preset,
    });
    expect(prompt).toContain(`# Tone\n${preset.instruction}`);
    expect(prompt).toContain("The tone never overrides any rule above");
    expect(prompt).toContain("Apply this tone to style only");
    for (const example of preset.examples) {
      expect(prompt).toContain(`Input: ${example.input}`);
      expect(prompt).toContain(`Output: ${example.output}`);
    }
  });

  test("includes persona under user context when provided", () => {
    const updatedAt = new Date().toISOString();
    const persona: Persona = {
      rows: [
        {
          id: "r1",
          category: "role",
          fact: "Write like a software engineer.",
          createdAt: updatedAt,
          updatedAt,
        },
      ],
    };
    const prompt = buildTransformPrompt([], {
      ...emptyContext,
      persona,
    });
    expect(prompt).toContain("# User Context");
    expect(prompt).toContain(
      "## Persona\nrole: Write like a software engineer. (updated 0 days ago)",
    );
  });

  test("renders full persona with update age", () => {
    const updatedAt = new Date(Date.now() - 5 * MS_PER_DAY).toISOString();
    const persona: Persona = {
      rows: [
        { id: "r1", category: "role", fact: "software engineer", createdAt: updatedAt, updatedAt },
      ],
    };
    const prompt = buildTransformPrompt([], { ...emptyContext, persona });
    expect(prompt).toContain("# User Context");
    expect(prompt).toContain("## Persona\nrole: software engineer (updated 5 days ago)");
  });

  test("injects configured languages into user context", () => {
    const prompt = buildTransformPrompt([], {
      ...emptyContext,
      languages: "English, Chinese (Simplified)",
    });
    expect(prompt).toContain("The user's languages: English, Chinese (Simplified).");
    expect(prompt).toContain("standard written form");
  });

  test("omits languages section without configured languages", () => {
    const prompt = buildTransformPrompt([], emptyContext);
    expect(prompt).not.toContain("## Languages");
  });

  test("includes vocabulary under user context when provided", () => {
    const prompt = buildTransformPrompt([], {
      ...emptyContext,
      vocabulary: "- Codex\n- Kubernetes",
    });
    expect(prompt).toContain("# User Context");
    expect(prompt).toContain(
      "## Vocabulary\nThe user often says these words. The speech recognizer may spell them wrong. Always spell them exactly like this:\n- Codex\n- Kubernetes",
    );
  });

  test("adds enrichment section for translate enrich option", () => {
    const enrichOptions: TransformTextEnrichOption[] = [
      { type: "translate", payload: { target: "English" } },
    ];
    const prompt = buildTransformPrompt(enrichOptions, emptyContext);
    expect(prompt).toContain(
      "# Enrichment\n- Translate the rewritten result into **English** as a native speaker would.",
    );
    expect(prompt).toContain("Literal (bad):");
    expect(prompt).toContain("Natural (good):");
    expect(prompt).toContain("It must satisfy the Rules above and the Enrichment section.");
    expect(prompt).not.toContain("overrides rule 1");
  });

  test("omits enrichment section without enrich options", () => {
    const prompt = buildTransformPrompt([], emptyContext);
    expect(prompt).not.toContain("# Enrichment");
  });

  test("includes recent history under user context when provided", () => {
    const prompt = buildTransformPrompt([], {
      ...emptyContext,
      recentHistory: "## Recent History\ncontext here",
    });
    expect(prompt).toContain("# User Context");
    expect(prompt).toContain("## Recent History\ncontext here");
  });

  test("omits user context when persona, vocabulary, and recent history are empty", () => {
    const prompt = buildTransformPrompt([], emptyContext);
    expect(prompt).not.toContain("# User Context");
    expect(prompt).not.toContain("## Persona");
    expect(prompt).not.toContain("## Vocabulary");
    expect(prompt).not.toContain("## Recent History");
  });

  test("orders stable sections before volatile ones", () => {
    const prompt = buildTransformPrompt([{ type: "translate", payload: { target: "English" } }], {
      persona: { rows: [] },
      vocabulary: "vocab",
      tone: TONE_PRESETS.casual,
      languages: "English",
      recentHistory: "## Recent History\ncontext here",
    });
    const order = [
      "# Role",
      "# Rules",
      "# Tone",
      "# User Context",
      "# Enrichment",
      "# Output\n",
    ].map((section) => prompt.indexOf(section));
    for (const position of order) {
      expect(position).toBeGreaterThanOrEqual(0);
    }
    const sorted = [...order].sort((a, b) => a - b);
    expect(order).toEqual(sorted);
  });

  it("rules demand correct punctuation and spacing", () => {
    const prompt = buildTransformPrompt([], emptyContext);
    expect(prompt).toContain("Fix punctuation and spacing");
  });

  test("rules are MECE: each rule has a distinct operation", () => {
    const prompt = buildTransformPrompt([], emptyContext);
    expect(prompt).toContain("similar-sounding word that fits");
    expect(prompt).toContain("Delete filler sounds");
    expect(prompt).toContain("keep only the corrected version");
    expect(prompt).toContain("Delete incomplete fragments");
    expect(prompt).toContain("Delete off-topic side remarks");
    expect(prompt).toContain("Group sentences by topic");
    expect(prompt).toContain("write them as a numbered list");
    expect(prompt).toContain("Keep the speaker's emotion");
    expect(prompt).toContain("Keep foreign words");
    expect(prompt).toContain("Fix grammar and word order");
    expect(prompt).toContain("Fix punctuation and spacing");
    expect(prompt).toContain("Keep structured content verbatim");
    expect(prompt).toContain("npm install react");
  });

  test("global constraints: spoken language and fidelity", () => {
    const prompt = buildTransformPrompt([], emptyContext);
    expect(prompt).toContain("Output in the language the speaker actually spoke.");
    expect(prompt).toContain("Never answer questions in the text.");
  });
});
