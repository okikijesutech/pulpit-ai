# Pulpit AI — Content Source Register

This register documents every investigated Scripture, Hymn, and Song catalogue source, its official endpoints, licensing framework, and technical acquisition status for **Pulpit AI**.

---

## 1. Scripture Sources

| Source Name | Official URL / Endpoint | Format | Declared License | Technical Acquisition Status | Redistribution Permitted? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **World English Bible (WEB)** | [eBible.org (eng-web)](https://ebible.org/find/details.php?id=eng-web) | USFM, SQLite, JSON, VPL | **Public Domain** (Dedicated by Michael Paul Johnson) | **Acquired & Bundled** | **YES** (Worldwide unrestricted) |
| **King James Version (KJV)** | [eBible.org (eng-kjv)](https://ebible.org/find/details.php?id=eng-kjv) / 1769 Blayney | USFM, SQLite, Plain Text | **Public Domain** (Historical 1611/1769 text) | **Acquired & Bundled** | **YES** (Worldwide public domain) |
| **API.Bible** | [scripture.api.bible](https://scripture.api.bible/) | REST API (JSON) | Multi-publisher proprietary API agreements | **API Adapter Only** | **NO** (Prohibits bulk download & offline redist) |
| **ESV API** | [api.esv.org](https://api.esv.org/) | REST API (JSON) | Crossway Copyright © 2001 (500 verses/day non-commercial) | **API Adapter Only** | **NO** (Prohibits offline distribution & AI training) |
| **NLT API** | [api.nlt.to](https://api.nlt.to/) / Tyndale Permissions | REST API (JSON) | Tyndale House Ministries Copyright © 1996, 2004, 2015 | **API Adapter Only** | **NO** (Strict commercial licensing required) |
| **The Message (MSG)** | [navpress.com/permissions](https://www.navpress.com/permissions) | Print / Commercial Digital | NavPress Copyright © 1993, 2002 Eugene H. Peterson | **Blocked / Commercial** | **NO** (Commercial contract required) |
| **Amplified Bible (AMP / NASB)** | [lockman.org/permissions](https://www.lockman.org/permission-to-quote-copyright-trademark-information/) | Print / Commercial Digital | The Lockman Foundation Copyright © 1954, 1987, 2015 | **Blocked / Commercial** | **NO** (Strict licensing boundaries) |

---

## 2. Hymn and Song Sources

| Source Name | Official URL | Formats | Declared License | Technical Acquisition Status | Redistribution Permitted? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Open Hymnal** | [openhymnal.org](https://openhymnal.org/) | Structured Text, XML, PDF, ABC, MIDI | **Public Domain** / CC-BY-SA (Curated by Brian J. Dumont) | **Acquired & Verified** | **YES** (For PD and CC-BY-SA hymns) |
| **Hymns to God** | [hymnstogod.org](https://www.hymnstogod.org/) | Plain Text, PDF | Historical Pre-1928 Public Domain | **Verified per title** | **YES** (For verified pre-1928 titles) |
| **Worship Commons** | [worshipcommons.org](https://worshipcommons.org/) | ChordPro, Text, Lead Sheets | Creative Commons (CC-BY, CC-BY-NC) | **Selective Acquisition** | **YES** (Under CC-BY terms; requires attribution) |
| **CCEL Hymnary** | [ccel.org/cceh](https://www.ccel.org/cceh/) | ThML, Plain Text | Historical Public Domain | **Verified per title** | **YES** (Historical texts) |
| **Musica Sacra** | [musicasacra.com](https://musicasacra.com/music/english-hymns-in-the-commons/) | PDF, Text | Public Domain (Church Music Association of America) | **Verified per title** | **YES** (English hymns in the commons) |
| **Library of Congress** | [loc.gov Nineteenth-Century Song Sheets](https://www.loc.gov/collections/nineteenth-century-song-sheets/) | Scanned Images, OCR Text | Pre-1928 Public Domain (U.S. National Archives) | **Historical Archive** | **YES** (Public domain in U.S.) |
| **Public Domain Audio Bibles & Hymns** | [publicdomainaudiobibles.com/Hymns.html](https://www.publicdomainaudiobibles.com/Hymns.html) | Audio / Plain Text | Public Domain | **Verified per title** | **YES** (Public domain works) |

---

## 3. Church Licensing & Contemporary Worship Clearinghouses

| Clearinghouse | Scope | Relevance to Pulpit AI | Distribution Policy |
| :--- | :--- | :--- | :--- |
| **CCLI (Church Copyright Licence)** | Congregational singing, projection, and streaming inside licensed church venues. | Allows a local church to project licensed songs during live services. | **Pulpit AI MUST NOT redistribute CCLI song files to other churches.** CCLI songs imported by a church are tagged `church_owned` / `ccli_covered` with `redistributionPermission = false`. |
| **OneLicense** | Choral, liturgical, and hymnal reprint permissions for Catholic and mainline denominations. | Applies to local parish usage. | **Local church use only.** Restricted from global repository bundling. |

---

## 4. Anti-Scraping Compliance Notice

In strict adherence to engineering requirements:
1. Pulpit AI **does not scrape** Bible Gateway, YouVersion, SongSelect, or any copyrighted web portals.
2. Only sanctioned bulk downloads (eBible.org open archives, Open Hymnal releases) and documented developer APIs are utilized.
3. Every downloaded resource is stored with its SHA-256 cryptographic hash and source provenance URL.
