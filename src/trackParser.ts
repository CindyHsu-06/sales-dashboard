import type { FollowUpItem, FollowUpNote } from './types';

function getField(lines: string[], key: string): string {
  for (const line of lines) {
    if (line.startsWith(`${key}: `) || line.startsWith(`${key}:`)) {
      return line.slice(key.length + 1).trim();
    }
  }
  return '';
}

function parseNotionDate(dateStr: string): string {
  // "2026年3月17日" → "2026-03-17"
  // "2026年3月30日 下午6:39" → "2026-03-30"
  const match = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  }
  return dateStr;
}

function parseNotes(lines: string[]): FollowUpNote[] {
  const notes: FollowUpNote[] = [];
  let inNotes = false;

  for (const line of lines) {
    // Detect "## 跟進紀錄" header (Notion exports as "\## 跟進紀錄")
    const cleaned = line.replace(/^\\/, '').trim();
    if (cleaned === '## 跟進紀錄' || cleaned === '## 跟進記錄') {
      inNotes = true;
      continue;
    }

    if (!inNotes) continue;

    // Clean up Notion HTML entities and extract note lines
    // Format: "&#x20; - 2026/3/24 電話未接" or "  - 2026/3/24 電話未接"
    let noteLine = line
      .replace(/&#x20;/g, ' ')
      .replace(/\\-/g, '-')
      .trim();

    // Match "- 2026/M/D content"
    const match = noteLine.match(/^-\s*(\d{4}\/\d{1,2}\/\d{1,2})\s+(.+)/);
    if (match) {
      notes.push({ date: match[1], content: match[2].trim() });
    }
  }

  return notes;
}

function parseMdFile(text: string, id: string): FollowUpItem {
  const lines = text.split('\n').map((l) => l.trimEnd());

  // Company name from first heading
  const titleLine = lines.find((l) => l.trimStart().startsWith('# '));
  const companyName = titleLine ? titleLine.replace(/^#\s+/, '').trim() : '';

  const trimmedLines = lines.map((l) => l.trim()).filter(Boolean);

  const notes = parseNotes(lines);
  const notionLastModified = parseNotionDate(getField(trimmedLines, '最後異動時間'));

  // Use the latest note date if available, otherwise fall back to Notion's lastModified
  let lastModified = notionLastModified;
  if (notes.length > 0) {
    const lastNoteDate = notes[notes.length - 1].date;
    // Convert "2026/3/24" → "2026-03-24"
    const parts = lastNoteDate.split('/');
    if (parts.length === 3) {
      lastModified = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
  }

  return {
    id,
    companyName,
    contact: getField(trimmedLines, '聯絡人'),
    phone: getField(trimmedLines, '電話(+886)'),
    email: getField(trimmedLines, '電子郵件'),
    status: getField(trimmedLines, '狀態'),
    quoteDate: parseNotionDate(getField(trimmedLines, '進單日')),
    lineId: getField(trimmedLines, 'LINE ID 名稱'),
    lastModified,
    taxId: getField(trimmedLines, '統編'),
    orderDetailUrl: getField(trimmedLines, '訂單明細(雲端檔案)'),
    notes,
  };
}

// Fetch the list of MD files from /track/ and parse them
export async function fetchFollowUpItems(basePath: string): Promise<FollowUpItem[]> {
  // Try to discover MD files from directory listing (works on local dev server)
  let mdFiles: string[] = [];
  try {
    const res = await fetch(`${basePath}track/`);
    if (res.ok) {
      const html = await res.text();
      mdFiles = [...html.matchAll(/href="([^"]+\.md)"/g)].map((m) => decodeURIComponent(m[1]));
    }
  } catch { /* directory listing not available */ }

  // Fallback to known filenames (for GitHub Pages / Vercel where directory listing is unavailable)
  if (mdFiles.length === 0) {
    mdFiles = [
      '大提企業有限公司.md',
      '寶鑫五金有限公司.md',
      '灴鎰精密科技有限公司.md',
      '台北捐血中心.md',
      '正碁國際股份有限公司.md',
    ];
  }

  const items: FollowUpItem[] = [];
  await Promise.all(
    mdFiles.map(async (file) => {
      try {
        const r = await fetch(`${basePath}track/${encodeURIComponent(file)}`);
        if (r.ok) {
          const text = await r.text();
          // Make sure we got actual MD content, not an HTML error page
          if (!text.trimStart().startsWith('<!')) {
            items.push(parseMdFile(text, file));
          }
        }
      } catch { /* skip */ }
    })
  );

  // Sort by lastModified descending
  items.sort((a, b) => b.lastModified.localeCompare(a.lastModified));
  return items;
}
