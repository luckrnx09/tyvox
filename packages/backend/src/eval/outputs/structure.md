# Eval Output: structure

- Timestamp: 2026-08-10T08:24:22.191Z
- Polisher model: deepseek-v4-flash
- Judge model: deepseek-v4-flash
- Passed: 5/5
## resolves self-correction — PASS
- Rule: keepSelfCorrection
- Input: send it to mike, wait, sarah, sorry, dave
- Output: Send it to Dave.
- expect: Dave: pass — The output contains only 'Dave' as the final corrected name.
- forbid: Mike: pass — The output does not contain 'Mike'.
- forbid: Sarah: pass — The output does not contain 'Sarah'.
- fidelity: meaning preserved: pass — The output preserves the intended meaning of the input after self-corrections, keeping only the final recipient.
- fidelity: no invented content: pass — The output only rewrites the text without adding or explaining anything.
- language: standard written form: pass — The output is in standard written English.
- mechanics: punctuation and grammar: pass — The output has correct punctuation, grammar, and spacing.

## drops incomplete fragment without inventing — PASS
- Rule: deleteIncompleteFragments
- Input: the release went out yesterday and the metrics look good, so if we
- Output: The release went out yesterday, and the metrics look good.
- expect: release: pass — The output contains 'release' as required.
- expect: metrics: pass — The output contains 'metrics' as required.
- forbid: an invented completion of the trailing fragment: pass — The output does not invent a completion for the trailing fragment.
- forbid: so if we: pass — The output does not contain 'so if we'.
- fidelity: meaning preserved: pass — The output preserves the meaning of the complete portion and drops the incomplete fragment.
- fidelity: no invented content: pass — The output only rewrites the input without adding or explaining anything.
- language: standard written form: pass — The output is in standard written English.
- mechanics: punctuation and grammar: pass — The output has correct punctuation, grammar, and spacing.

## removes unrelated aside — PASS
- Rule: deleteOffTopicAsides
- Input: the client loved the demo, my cat knocked over my coffee this morning, so we ship friday
- Output: The client loved the demo, so we ship Friday.
- expect: demo: pass — The output contains the word 'demo'.
- expect: Friday: pass — The output contains the word 'Friday'.
- forbid: cat: pass — The output does not contain the word 'cat'.
- forbid: coffee: pass — The output does not contain the word 'coffee'.
- fidelity: meaning preserved: pass — The output retains the core meaning of the client loving the demo and shipping on Friday, while omitting the off-topic cat remark as instructed.
- fidelity: no invented content: pass — The output is a direct rewrite that only removes the off-topic remark and does not add or explain anything.
- language: standard written form: pass — The output uses standard written English with proper capitalization and phrasing.
- mechanics: punctuation and grammar: pass — The output has correct punctuation, grammar, and spacing.

## groups topics into paragraphs — PASS
- Rule: restructureText
- Input: the signup form crashes on safari, i already filed a ticket, and the marketing site copy needs a rewrite before monday
- Output: The signup form crashes on Safari. I already filed a ticket.

The marketing site copy needs a rewrite before Monday.
- expect: 

: pass — The output groups the two topics into separate paragraphs, each covering one topic.
- fidelity: meaning preserved: pass — The output preserves all original information without adding or omitting any details.
- fidelity: no invented content: pass — The output only rewrites the input and does not introduce new ideas or explanations.
- language: standard written form: pass — The output is in standard written English with proper capitalization and sentence structure.
- mechanics: punctuation and grammar: pass — The output uses correct punctuation, grammar, and spacing.

## formats lists as numbered list — PASS
- Rule: formatLists
- Input: we need to book the flights, reserve the hotel, and rent a car
- Output: We need to:
1. Book the flights
2. Reserve the hotel
3. Rent a car
- expect: 1.: pass — The output contains '1.' as required.
- expect: 2.: pass — The output contains '2.' as required.
- expect: 3.: pass — The output contains '3.' as required.
- fidelity: meaning preserved: pass — The output preserves the meaning of booking flights, reserving a hotel, and renting a car without adding or omitting information.
- fidelity: no invented content: pass — The output only rewrites the input into a numbered list without adding new ideas or explanations.
- language: standard written form: pass — The output is in standard written English with proper capitalization and sentence structure.
- mechanics: punctuation and grammar: pass — The output uses correct punctuation, grammar, and spacing.
