# Verified Scripture and Content Licensing Architecture

## 1. Core Principles & Non-Negotiable Rules

Pulpit AI is designed for use during live worship services where doctrinal accuracy and church trust are paramount.

1. **Verified Content Only**: Never generate, hallucinate, or invent Scripture verses or song lyrics under any circumstance.
2. **Explicit Evidence Required**: Extract Scripture references only when there is explicit spoken evidence (e.g. "John 3:16", "Psalm 23", "1 Corinthians 13:4-7"). Sermon topics, general theological themes, or vague mentions are strictly rejected.
3. **Canon & Bounds Validation**: Every parsed reference is validated against the 66-book Protestant canon table before query execution. Chapters and verses exceeding canonical limits (e.g., "John 3:50" or "John chapter 25") are flagged as invalid and never projected.
4. **Deterministic Local Retrieval**: Text is retrieved from locally verified SQLite storage. If any requested verse in a range is missing from the local package, the system **fails closed** and returns no match rather than guessing or silently substituting another translation.
5. **Human Operator Authority**: Scripture candidates are suggestions by default. An operator must review and approve a candidate before it is dispatched to FreeShow through the Central Authority Manager.

---

## 2. Protestant Canon & Bounds Validation

Pulpit AI implements a complete 66-book Protestant canon table (`@pulpit-ai/scripture-engine`):

- **Old Testament**: 39 books (Genesis through Malachi, 929 chapters).
- **New Testament**: 27 books (Matthew through Revelation, 260 chapters).
- **Total**: 1,189 chapters, with exact verse limits mapped for each individual chapter.

### Reference Parser Features

- **Spoken Form Normalization**: Converts ordinal words ("first", "second", "third") and spoken numbers ("twenty-three", "one hundred and nineteen") into standard numeric integers.
- **Multi-Verse Ranges**: Supports hyphenated and spoken range formats (e.g., "1 Corinthians 13:4-7", "Genesis 1:1 through 3").
- **Audit Evidence Tracking**: Preserves the exact speech segment and raw spoken words for operator audit.

---

## 3. Bundled Translations & Licensing Policy

Modern copyrighted translations (e.g. NIV, ESV, NLT, NKJV) and contemporary worship songs cannot be bundled in open-source distributions without explicit commercial licenses from copyright holders.

Pulpit AI bundles two verified **public-domain** translations:

### 1. World English Bible (WEB)
- **ID / Abbreviation**: `WEB`
- **Language**: English (`en`)
- **Source**: eBible.org / Rainbow Missions, Inc.
- **Copyright**: Public Domain
- **License**: Dedicated to the Public Domain by Michael Paul Johnson.
- **Required Attribution**: `World English Bible (WEB) — Dedicated to the Public Domain`
- **Redistribution Status**: Unrestricted worldwide.

### 2. King James Version (KJV)
- **ID / Abbreviation**: `KJV`
- **Language**: English (`en`)
- **Source**: 1611 / 1769 Oxford Standard Text
- **Edition**: 1769 Blayney Edition
- **Copyright**: Public Domain (Crown rights in UK, unrestricted worldwide)
- **Required Attribution**: `King James Version (KJV) — Public Domain`
- **Redistribution Status**: Unrestricted.

---

## 4. Local SQLite Schema

Translation packages are stored in a local SQLite database:

```sql
CREATE TABLE bible_translations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL UNIQUE,
  language TEXT NOT NULL,
  source TEXT,
  edition TEXT,
  copyright TEXT NOT NULL,
  license TEXT NOT NULL,
  attribution TEXT NOT NULL,
  redistribution_status TEXT NOT NULL,
  checksum TEXT,
  verification_status TEXT NOT NULL,
  imported_at INTEGER NOT NULL
);

CREATE TABLE bible_verses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  translation_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  book_name TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  text TEXT NOT NULL,
  FOREIGN KEY (translation_id) REFERENCES bible_translations(id) ON DELETE CASCADE
);

CREATE INDEX idx_verses_lookup 
ON bible_verses(translation_id, book_name, chapter, verse);
```

---

## 5. Candidate Generation & Cooldown Engine

1. **Confidence Threshold**: References must meet confidence $\ge 0.70$ (default $0.85$–$0.95$).
2. **Duplicate Suppression**: A 10-second cooldown window suppresses identical references from spamming the operator queue during passionate repetition in preaching.
3. **Dispatch Payload**: Formats an allowlisted `start_scripture` command parameterized with reference, formatted text, and mandatory legal attribution.
