import { describe, it, expect } from 'vitest';
import { deflateRawSync } from 'node:zlib';
import {
  FileSecurityValidator,
  TxtSongParser,
  CsvSongParser,
  DocxSongParser,
  PptxSongParser,
  PdfSongParser,
  SongImportPipeline
} from '../src/index.js';

/**
 * In-memory ZIP archive generator for creating valid DOCX and PPTX test buffers.
 */
function createTestZipBuffer(files: { path: string; content: string }[]): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const rawData = Buffer.from(file.content, 'utf8');
    const compressedData = deflateRawSync(rawData);
    const fileNameBuf = Buffer.from(file.path, 'utf8');

    // Local File Header
    const localHeader = Buffer.alloc(30 + fileNameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local header signature
    localHeader.writeUInt16LE(20, 4); // Version needed
    localHeader.writeUInt16LE(0, 6); // Flags
    localHeader.writeUInt16LE(8, 8); // Deflate
    localHeader.writeUInt16LE(0, 10); // Mod time
    localHeader.writeUInt16LE(0, 12); // Mod date
    localHeader.writeUInt32LE(0, 14); // CRC-32 (0 for test)
    localHeader.writeUInt32LE(compressedData.length, 18);
    localHeader.writeUInt32LE(rawData.length, 22);
    localHeader.writeUInt16LE(fileNameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28); // Extra length
    fileNameBuf.copy(localHeader, 30);

    const fullLocal = Buffer.concat([localHeader, compressedData]);
    localHeaders.push(fullLocal);

    // Central Directory Header
    const centralHeader = Buffer.alloc(46 + fileNameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(0, 16);
    centralHeader.writeUInt32LE(compressedData.length, 20);
    centralHeader.writeUInt32LE(rawData.length, 24);
    centralHeader.writeUInt16LE(fileNameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42); // Relative offset
    fileNameBuf.copy(centralHeader, 46);

    centralHeaders.push(centralHeader);
    offset += fullLocal.length;
  }

  const allLocals = Buffer.concat(localHeaders);
  const allCentrals = Buffer.concat(centralHeaders);

  // End of Central Directory
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(allCentrals.length, 12);
  eocd.writeUInt32LE(allLocals.length, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([allLocals, allCentrals, eocd]);
}

describe('FileSecurityValidator', () => {
  it('sanitizes text by stripping malicious script tags and javascript pseudo-protocols', () => {
    const malicious = `
      Title: Safe Song
      <script>alert("evil hack")</script>
      Amazing grace <iframe src="evil.com"></iframe>
      Visit javascript:stealTokens() now.
    `;
    const clean = FileSecurityValidator.sanitizeText(malicious);
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('alert');
    expect(clean).not.toContain('<iframe>');
    expect(clean).not.toContain('javascript:');
    expect(clean).toContain('Amazing grace');
  });

  it('quarantines files exceeding maximum allowed size (25 MB)', () => {
    // Fake buffer of 26 MB
    const fakeBuffer = Buffer.alloc(26 * 1024 * 1024);
    const result = FileSecurityValidator.validateFile('huge_bomb.txt', fakeBuffer);
    expect(result.valid).toBe(false);
    expect(result.quarantine).toBe(true);
    expect(result.error).toContain('exceeds maximum allowed limit of 25 MB');
  });

  it('detects zip bomb expansion ratios', () => {
    // Ratio 100:1 (compressed 1000 bytes -> uncompressed 100,000 bytes)
    const check = FileSecurityValidator.validateZipRatio(1000, 100000);
    expect(check.safe).toBe(false);
    expect(check.error).toContain('Potential decompression bomb detected');
  });
});

describe('TxtSongParser', () => {
  it('parses formatted plain text with metadata and section headers', () => {
    const txt = `
Title: Amazing Grace
Author: John Newton
Copyright: Public Domain

[Verse 1]
Amazing grace! How sweet the sound
That saved a wretch like me!

[Chorus]
My chains are gone, I've been set free
My God, my Savior has ransomed me

[Verse 2]
'Twas grace that taught my heart to fear
And grace my fears relieved
    `;

    const draft = TxtSongParser.parse(txt, 'amazing_grace.txt');
    expect(draft.title).toBe('Amazing Grace');
    expect(draft.author).toBe('John Newton');
    expect(draft.copyright).toBe('Public Domain');
    expect(draft.sections.length).toBe(3);

    expect(draft.sections[0].type).toBe('verse');
    expect(draft.sections[0].label).toBe('Verse 1');
    expect(draft.sections[0].lines[0]).toBe('Amazing grace! How sweet the sound');

    expect(draft.sections[1].type).toBe('chorus');
    expect(draft.sections[1].label).toBe('Chorus');
    expect(draft.sections[1].lines[0]).toBe("My chains are gone, I've been set free");
  });

  it('parses plain text separated only by double blank lines', () => {
    const txt = `
First line of verse one
Second line of verse one

First line of chorus
Second line of chorus
    `;

    const draft = TxtSongParser.parse(txt, 'Simple Song.txt');
    expect(draft.title).toBe('Simple Song');
    expect(draft.sections.length).toBe(2);
    expect(draft.sections[0].lines.length).toBe(2);
    expect(draft.sections[1].lines.length).toBe(2);
  });
});

describe('CsvSongParser', () => {
  it('parses Mode A (one row per song with multiline lyrics)', () => {
    const csv = `title,author,lyrics
"Song One","Author A","Line 1\nLine 2\n\nChorus Line 1"
"Song Two","Author B","Line A\nLine B"`;

    const drafts = CsvSongParser.parse(csv, 'songs.csv');
    expect(drafts.length).toBe(2);
    expect(drafts[0].title).toBe('Song One');
    expect(drafts[0].author).toBe('Author A');
    expect(drafts[0].sections.length).toBe(2);
    expect(drafts[1].title).toBe('Song Two');
  });

  it('parses Mode B (multi-row relational format with section labels)', () => {
    const csv = `title,author,section,lyrics
"Praise Song","Composer X","Verse 1","Sing aloud to God our strength"
"Praise Song","Composer X","Chorus","Hallelujah to the King"`;

    const drafts = CsvSongParser.parse(csv, 'sections.csv');
    expect(drafts.length).toBe(1);
    expect(drafts[0].title).toBe('Praise Song');
    expect(drafts[0].sections.length).toBe(2);
    expect(drafts[0].sections[0].label).toBe('Verse 1');
    expect(drafts[0].sections[1].type).toBe('chorus');
  });

  it('throws descriptive error if required columns are missing', () => {
    const badCsv = `name,description\n"Test","Missing lyrics"`;
    expect(() => CsvSongParser.parse(badCsv, 'bad.csv')).toThrow(/missing required columns/i);
  });
});

describe('DocxSongParser', () => {
  it('extracts paragraphs and sections from DOCX OpenXML archive', () => {
    const docxXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:r><w:t>Title: Word of Life</w:t></w:r></w:p>
          <w:p><w:r><w:t>[Verse 1]</w:t></w:r></w:p>
          <w:p><w:r><w:t>Thy word is a lamp unto my feet</w:t></w:r></w:p>
          <w:p><w:r><w:t>And a light unto my path</w:t></w:r></w:p>
        </w:body>
      </w:document>
    `;

    const buffer = createTestZipBuffer([{ path: 'word/document.xml', content: docxXml }]);
    const draft = DocxSongParser.parse(buffer, 'test.docx');

    expect(draft.title).toBe('Word of Life');
    expect(draft.sourceFormat).toBe('docx');
    expect(draft.sections.length).toBe(1);
    expect(draft.sections[0].lines[0]).toBe('Thy word is a lamp unto my feet');
  });

  it('quarantines DOCX archives containing malicious VBA macro binaries', () => {
    const buffer = createTestZipBuffer([
      { path: 'word/document.xml', content: '<w:document></w:document>' },
      { path: 'word/vbaProject.bin', content: 'MALICIOUS_MACRO_BYTES' }
    ]);

    expect(() => DocxSongParser.parse(buffer, 'infected.docx')).toThrow(/Active macro/i);
  });
});

describe('PptxSongParser', () => {
  it('extracts slide texts sequentially in slide number order', () => {
    const slide1Xml = `<?xml version="1.0" encoding="UTF-8"?>
      <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
        <p:cSld><p:spTree><p:sp><p:txBody>
          <a:p><a:r><a:t>Power of Your Love</a:t></a:r></a:p>
        </p:txBody></p:sp></p:spTree></p:cSld>
      </p:sld>
    `;

    const slide2Xml = `<?xml version="1.0" encoding="UTF-8"?>
      <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
        <p:cSld><p:spTree><p:sp><p:txBody>
          <a:p><a:r><a:t>[Verse 1]</a:t></a:r></a:p>
          <a:p><a:r><a:t>Lord I come to You</a:t></a:r></a:p>
          <a:p><a:r><a:t>Let my heart be changed, renewed</a:t></a:r></a:p>
        </p:txBody></p:sp></p:spTree></p:cSld>
      </p:sld>
    `;

    const buffer = createTestZipBuffer([
      { path: 'ppt/slides/slide1.xml', content: slide1Xml },
      { path: 'ppt/slides/slide2.xml', content: slide2Xml }
    ]);

    const draft = PptxSongParser.parse(buffer, 'worship.pptx');
    expect(draft.title).toBe('Power of Your Love');
    expect(draft.sourceFormat).toBe('pptx');
    expect(draft.sections.length).toBe(1);
    expect(draft.sections[0].lines[0]).toBe('Lord I come to You');
  });
});

describe('PdfSongParser', () => {
  it('extracts text from PDF content stream', () => {
    const streamContent = 'BT /F1 12 Tf (Amazing Grace) Tj T* (How sweet the sound) Tj ET';
    const pdfRaw = `%PDF-1.4\n1 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj\ntrailer\n<<>>\n%%EOF`;
    const buffer = Buffer.from(pdfRaw, 'binary');

    const draft = PdfSongParser.parse(buffer, 'hymn.pdf');
    expect(draft.sourceFormat).toBe('pdf');
    expect(draft.sections.length).toBeGreaterThanOrEqual(1);
    expect(draft.sections[0].lines.join(' ')).toContain('How sweet the sound');
  });

  it('detects scanned / image-only PDFs and generates an actionable warning', () => {
    const emptyPdf = '%PDF-1.4\n1 0 obj\n<< /Length 0 >>\nstream\n\nendstream\nendobj\ntrailer\n<<>>\n%%EOF';
    const buffer = Buffer.from(emptyPdf, 'binary');

    const draft = PdfSongParser.parse(buffer, 'scanned_scan.pdf');
    expect(draft.warnings).toBeDefined();
    expect(draft.warnings?.[0]).toContain('Document appears to be scanned or image-based');
  });
});

describe('SongImportPipeline', () => {
  it('routes TXT files accurately and returns structured drafts', async () => {
    const txt = 'Title: In Christ Alone\nAuthor: Keith Getty\n\n[Verse 1]\nIn Christ alone my hope is found';
    const buffer = Buffer.from(txt, 'utf8');

    const result = await SongImportPipeline.importFile('hymn.txt', buffer);
    expect(result.success).toBe(true);
    expect(result.songs.length).toBe(1);
    expect(result.songs[0].title).toBe('In Christ Alone');
    expect(result.songs[0].author).toBe('Keith Getty');
  });

  it('rejects oversized files safely', async () => {
    const huge = Buffer.alloc(30 * 1024 * 1024);
    const result = await SongImportPipeline.importFile('bomb.txt', huge);
    expect(result.success).toBe(false);
    expect(result.quarantined).toBe(true);
    expect(result.errors[0]).toContain('exceeds maximum allowed limit');
  });
});
