# Pulpit AI — Blocked and Quarantined Content Register

In accordance with Section 7 of the Pulpit AI build specification, **all content with proprietary copyright, restricted redistribution, or unverified legal status is strictly blocked from the distributable default library**.

---

## 1. Blocked Bible Translations

The following modern Bible translations are currently blocked from offline SQLite distribution packages:

### 1. English Standard Version (ESV)
* **Copyright Holder**: Crossway (Good News Publishers), 2001.
* **Reason Blocked**: Crossway’s copyright policy limits free API access to 500 verses per day for non-commercial church use and **expressly prohibits bulk downloading, offline database redistribution, and automated AI indexing**.
* **Current Software Handling**:
  - Excluded from default SQLite distribution.
  - Architecture ready: When an individual church configures their own legitimate Crossway API key, Pulpit AI's plugin interface can query Crossway's live endpoint on demand without bundling the text locally.
* **Required for Offline Bundling**: Signed commercial licensing agreement from Crossway.

### 2. New Living Translation (NLT)
* **Copyright Holder**: Tyndale House Ministries (1996, 2004, 2015).
* **Reason Blocked**: Tyndale's licensing policy prohibits redistributing the full NLT text database in third-party software.
* **Current Software Handling**:
  - Excluded from default SQLite distribution.
  - Quarantined if imported by an individual user until rights verification is provided.
* **Required for Offline Bundling**: Commercial OEM software distribution contract from Tyndale House Foundation.

### 3. The Message (MSG)
* **Copyright Holder**: NavPress Publishing Group (Eugene H. Peterson, 1993, 2002).
* **Reason Blocked**: Proprietary contemporary translation; no public domain or open redistribution grant.
* **Current Software Handling**: Blocked from distributable packages.
* **Required for Offline Bundling**: Written publisher agreement from NavPress.

### 4. Amplified Bible (AMP) & New American Standard Bible (NASB)
* **Copyright Holder**: The Lockman Foundation (1954, 1987, 2015).
* **Reason Blocked**: Proprietary copyright; strict quotation limits (under 500 verses for non-commercial church use).
* **Current Software Handling**: Blocked from default offline distribution.
* **Required for Offline Bundling**: Contractual license from The Lockman Foundation.

---

## 2. Blocked Contemporary Worship Catalogues

### 1. CCLI-Covered Contemporary Songs
* **Examples**: Songs by Bethel Music, Elevation Worship, Hillsong, Passion, CityAlight, Maverick City, Matt Redman, Chris Tomlin.
* **Reason Blocked**: A local church's CCLI Church Copyright Licence covers projection and congregational singing *within the subscribing local church body*. It **does NOT permit an open-source software project (Pulpit AI) to harvest, redistribute, or package these copyrighted lyrics for other users or churches**.
* **Software Isolation Rules**:
  1. Any CCLI song imported by a church into their local Pulpit AI instance is marked `ccli_covered` and `redistributionPermission = false`.
  2. The song is stored strictly in the local church's private SQLite database.
  3. The `CuratedPackageSync` module will **refuse to export or synchronise** any song marked with `redistributionPermission = false`.

### 2. Commercial Sheet Music and Choral Octavos
* **Examples**: Hal Leonard, Hope Publishing, Lorenz, Brentwood-Benson copyrighted publications.
* **Reason Blocked**: Proprietary sheet music copyright; copying or distributing choral arrangements is a violation of copyright law.
* **Software Isolation Rules**: Blocked from default libraries.

---

## 3. Human Operator Review & Quarantine Workflow

To ensure that unverified user imports cannot accidentally bypass these restrictions:
1. **Quarantine by Default**: Every document imported via TXT, DOCX, CSV, PPTX, or PDF is staged in `SongReviewManager` with `verificationStatus = 'unverified'` and `aiProcessingPermission = false`.
2. **Hidden from AI Recognition**: The `SongDatabase.searchSongs(query, approvedOnly = true)` query filters out all quarantined items. The AI lyric matcher cannot see or project them.
3. **Explicit Rights Attestation**: A human presentation operator must review the metadata, confirm whether the song is public domain, church-owned, or CCLI-covered, and manually approve it into the active local library.
