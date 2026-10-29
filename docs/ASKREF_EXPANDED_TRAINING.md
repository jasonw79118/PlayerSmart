# Questions 76–175: expanded referee training

The user supplied the additional 100 questions on 2026-10-29. The original text
is preserved in [askref-expanded-training-guide.txt](askref-expanded-training-guide.txt).
The input is a teaching draft, not rule authority or official answer-bank approval.

All 175 supplied guide questions now have internal coverage. AskRef has 278 total
scenarios, including the earlier independent scenarios and common question catalog.
The question bank remains hidden. In chat, questions can return a cited explanation,
suggested referee wording, division clarification, and expandable restart/location/
discipline details. Conditions remain explicit: a question alone does not prove
an offence, establish a match observation or justify a card.

## Source checks and corrections

The original public PDSA **2025/2026 Issue 09 PDF** is now saved at
[`sources/PDSA-2025-26-Issue09.pdf`](sources/PDSA-2025-26-Issue09.pdf), with a
[source manifest](sources/PDSA-2025-26-Issue09.source.json). Text extraction was
checked for the local modifications used here. Screenshot retrieval failed and
no local PDF renderer was available; visual verification is not claimed.

Checked details include:

- U6/U8 have no goalkeeper. Older divisions use one.
- U6 kick-ins are taken on or outside the touchline, with unlimited teaching
  retakes and no immediate second touch by the kicker.
- The original PDF lists the older divisions' substitution opportunities and
  entry procedure, plus play-down conditions.
- The clock continues during injuries regardless of severity. Stop play for
  safety when needed; stopping play is separate from stopping the clock.
- PDSA permits covered small stud earrings; other jewellery exceptions require
  the specified local approval. The input's blanket IFAB prohibition is not used
  to override this local text. Ambiguous safety/approval cases go to the coordinator.
- Free-kick walls are four yards in U6/U8 and eight yards in older divisions.
  Those distances are not automatically applied to corners or throw-ins.
- U8 illegal-throw teaching retakes and U6 kick-ins override ordinary IFAB
  throw-in turnover and card examples in the appropriate divisions.

Additional version-pinned IFAB summaries cover equipment, substitutions, ball
defects, ball status, throw-in FAQs, goal-kick and corner mechanics, contact,
dangerous play and misconduct. A proper throw that never enters is distinguished
from an incorrectly delivered throw that enters; feet are judged at release.

## Separate newer rule

`src/lib/askref-pending-rules.json` stores the IFAB **2026/27** five-second throw-in
countdown as **inactive, pending PDSA adoption**. Its source is the official
[2026/27 lawbook](https://downloads.theifab.com/downloads/laws-of-the-game-202627-single-pages?l=en).
The checked PDSA PDF adopts IFAB 2025/26. No newer PDSA adoption was established.
Questions about this countdown explain the version difference and ask for
coordinator confirmation. The pending rule is excluded from active bank evidence.

## Maintain the catalogs

The supplied answers are curated in `scripts/import-expanded-training.mjs`;
the script extracts only the numbered questions from its input and combines them
with those curated explanations. It does not trust pasted answers automatically.

After catalog edits, run `node scripts/sync-askref-catalogs.mjs`, then
`npm run askref:review -- export`. This synchronizes the generated draft entries
and review pack. It does not create approvals. Tests check synchronization,
source existence, all 100 questions and aliases across six divisions, local
exceptions, pending-rule isolation, and the chat clarification/details flow.
