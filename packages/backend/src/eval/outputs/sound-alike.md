# Eval Output: sound-alike

- Timestamp: 2026-08-10T08:24:22.191Z
- Polisher model: deepseek-v4-flash
- Judge model: deepseek-v4-flash
- Passed: 6/6
## fixes misheard product name — PASS
- Rule: replaceMisheardWords
- Input: ask chat gee pee tee to summarize this thread
- Output: Ask ChatGPT to summarize this thread.
- expect: ChatGPT: pass — The output contains 'ChatGPT' which correctly refers to the OpenAI chatbot.
- forbid: gee pee tee: pass — The output does not contain 'gee pee tee' or any similar phonetic spelling.
- fidelity: meaning preserved: pass — The output preserves the original request to ask ChatGPT to summarize the thread without adding or omitting information.
- fidelity: no invented content: pass — The output is a direct rewrite of the input, making no additional statements or explanations.
- language: standard written form: pass — The output uses proper capitalization and standard English spelling.
- mechanics: punctuation and grammar: pass — The output has correct capitalization, a period at the end, and proper spacing.

## corrects code x using context — PASS
- Rule: replaceMisheardWords
- Input: have code x review the pull request
- Output: Have Codex review the pull request.
- expect: Codex: pass — The output uses 'Codex' which matches the intended context of the OpenAI AI coding agent.
- forbid: code x: pass — The output does not contain the phrase 'code x'.
- forbid: code X: pass — The output does not contain 'code X'.
- fidelity: meaning preserved: pass — The output conveys the same meaning as the input, with no additions or omissions.
- fidelity: no invented content: pass — The output only rewrites the input without adding ideas or explanations.
- language: standard written form: pass — The output is in standard written English.
- mechanics: punctuation and grammar: pass — The output uses correct punctuation, grammar, and spacing.

## fixes sound-alike terms in prose — PASS
- Rule: replaceMisheardWords
- Input: our post gress database is getting slow, we should add an index on the orders table
- Output: Our Postgres database is getting slow. We should add an index on the orders table.
- forbid: post gress: pass — The output uses 'Postgres' instead of 'post gress'.
- fidelity: meaning preserved: pass — The output preserves the meaning of the input, with no additions or omissions.
- fidelity: no invented content: pass — The output only rewrites the input without adding ideas or explanations.
- language: standard written form: pass — The output is in standard written English.
- mechanics: punctuation and grammar: pass — The output uses correct punctuation, capitalization, and spacing.

## prefers standard notation — PASS
- Rule: replaceMisheardWords
- Input: our support team is online twenty four seven
- Output: Our support team is online 24/7.
- expect: 24/7: pass — The output contains the exact text '24/7'.
- forbid: twenty four seven: pass — The output does not contain 'twenty four seven'.
- fidelity: meaning preserved: pass — The output conveys the same meaning as the input, with no additions or omissions.
- fidelity: no invented content: pass — The output only rewrites the input without adding ideas or explanations.
- language: standard written form: pass — The output uses standard written English, converting the spoken phrase to its conventional numeric form.
- mechanics: punctuation and grammar: pass — The output has correct capitalization, punctuation, and spacing.

## normalizes spoken contractions — PASS
- Rule: replaceMisheardWords
- Input: i am gonna deploy and wanna test first
- Output: I’m going to deploy, and I want to test first.
- expect: going to: pass — The output contains 'going to'.
- expect: want to: pass — The output contains 'want to'.
- forbid: gonna: pass — The output does not contain 'gonna'.
- forbid: wanna: pass — The output does not contain 'wanna'.
- fidelity: meaning preserved: pass — The output preserves the meaning of the input, with no additions or omissions.
- fidelity: no invented content: pass — The output only rewrites the text without adding ideas or explanations.
- language: standard written form: pass — The output uses standard written English.
- mechanics: punctuation and grammar: pass — The output has correct punctuation, grammar, and spacing.

## does not overcorrect proper names — PASS
- Rule: replaceMisheardWords
- Input: the kubernetes cluster runs on azure
- Output: The Kubernetes cluster runs on Azure.
- expect: Kubernetes: pass — The output correctly capitalizes 'Kubernetes' as a proper name.
- expect: Azure: pass — The output correctly capitalizes 'Azure' as a proper name.
- forbid: Kubernetes or Azure replaced by a different word: pass — Neither 'Kubernetes' nor 'Azure' is replaced by a different word.
- fidelity: meaning preserved: pass — The output preserves the original meaning without adding or omitting information.
- fidelity: no invented content: pass — The output only rewrites the text with capitalization and punctuation, adding no new ideas or explanations.
- language: standard written form: pass — The output is in standard written English with proper capitalization.
- mechanics: punctuation and grammar: pass — The output uses correct punctuation, grammar, and spacing.
