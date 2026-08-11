# Eval Output: fidelity

- Timestamp: 2026-08-10T08:24:22.191Z
- Polisher model: deepseek-v4-flash
- Judge model: deepseek-v4-flash
- Passed: 3/3
## does not answer questions — PASS
- Rule: noAnsweringOrAdding
- Input: why do planes leave white trails in the sky
- Output: Why do planes leave white trails in the sky?
- forbid: an answer or explanation of the white trails: pass — The output is a question, not an answer or explanation.
- fidelity: meaning preserved: pass — The output preserves the exact meaning and content of the input question.
- fidelity: no invented content: pass — The output is a direct rewrite of the question with no added ideas or explanations.
- language: standard written form: pass — The output uses standard English capitalization and punctuation.
- mechanics: punctuation and grammar: pass — The output has correct capitalization, a question mark, and proper spacing.

## does not add invented content — PASS
- Rule: noAnsweringOrAdding
- Input: ping alex about the invoice
- Output: Ping Alex about the invoice.
- forbid: details not mentioned in the input, such as dates, amounts, or deadlines: pass — No extra details are added beyond the input.
- fidelity: meaning preserved: pass — The output preserves the meaning and action of the input exactly.
- fidelity: no invented content: pass — The output only rewrites the text without answering, adding ideas, or explaining.
- language: standard written form: pass — The output is standard written English.
- mechanics: punctuation and grammar: pass — The output has correct capitalization, punctuation, and spacing.

## keeps the spoken language — PASS
- Rule: outputSpokenLanguage
- Input: el servidor se cayó otra vez anoche
- Output: El servidor se cayó otra vez anoche.
- expect: servidor: pass — The output contains the exact word 'servidor'.
- forbid: the output is translated into another language: pass — The output is in Spanish, matching the speaker's language.
- fidelity: meaning preserved: pass — The output preserves the meaning of the input: the server went down again last night.
- fidelity: no invented content: pass — The output only capitalizes and adds a period, adding no new content.
- language: standard written form: pass — The output uses standard Spanish capitalization and punctuation.
- mechanics: punctuation and grammar: pass — The output has correct capitalization, a period, and proper spacing.
