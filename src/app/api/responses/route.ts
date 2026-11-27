import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ImageEvaluationResponse, GroundTruthType } from '@/types/evaluation';
import { getScanManifestItem } from '@/lib/dataset';

function resolveWritableDataDir(): string {
  const localDir = path.join(process.cwd(), 'data');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    const testFile = path.join(localDir, '.write_test');
    fs.writeFileSync(testFile, '', 'utf-8');
    fs.unlinkSync(testFile);
    return localDir;
  } catch {
    // Fallback for read-only serverless environments (e.g. Vercel)
    const tmpDir = path.join(os.tmpdir(), 'ultrasound-turing-data');
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch {}
    return tmpDir;
  }
}

let cachedMemoryStore: StoredData | null = null;

interface StoredEvaluationEntry extends ImageEvaluationResponse {
  slotNumber?: number;
  fileName?: string;
  groundTruth?: GroundTruthType;
}

interface StoredData {
  lastUpdated: string;
  groundTruthMap: Record<string, GroundTruthType>;
  byExpert: Record<string, Record<string, StoredEvaluationEntry>>;
  latestResponses: Record<string, StoredEvaluationEntry>;
}

function loadStoredData(): StoredData {
  try {
    const dir = resolveWritableDataDir();
    const jsonFile = path.join(dir, 'responses.json');
    if (fs.existsSync(jsonFile)) {
      const content = fs.readFileSync(jsonFile, 'utf-8');
      const parsed = JSON.parse(content);
      const loaded: StoredData = {
        lastUpdated: parsed.lastUpdated || new Date().toISOString(),
        groundTruthMap: parsed.groundTruthMap || {},
        byExpert: parsed.byExpert || {},
        latestResponses: parsed.latestResponses || {},
      };
      cachedMemoryStore = loaded;
      return loaded;
    }
  } catch (err) {
    console.error('Error reading responses.json:', err);
  }
  if (cachedMemoryStore) return cachedMemoryStore;
  const emptyData: StoredData = {
    lastUpdated: new Date().toISOString(),
    groundTruthMap: {},
    byExpert: {},
    latestResponses: {},
  };
  cachedMemoryStore = emptyData;
  saveStoredData(emptyData);
  return emptyData;
}

function escapeCsvCell(val: unknown): string {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCsvContent(data: StoredData): string {
  const headers = [
    'Expert_ID',
    'Experience_Tier',
    'Slot_Number',
    'Image_ID',
    'File_Name',
    'Morphology',
    'Ground_Truth',
    'Q1_Classification',
    'Evaluation_Outcome',
    'Q2_Anatomical_Realism_1to5',
    'Q3_Image_Artifacts_1to5',
    'Q4_Clinical_Plausibility_1to5',
    'Decision_Time_Sec',
    'Artifact_Tags',
    'Clinical_Notes',
    'Evaluated_At',
  ];

  const rows: string[] = [headers.join(',')];

  const experts = Object.keys(data.byExpert).sort();
  for (const expertId of experts) {
    const expertResponses = data.byExpert[expertId] || {};
    const entries = Object.values(expertResponses).sort((a, b) => {
      if (a.slotNumber != null && b.slotNumber != null) {
        return a.slotNumber - b.slotNumber;
      }
      return (a.imageId || '').localeCompare(b.imageId || '');
    });

    for (const entry of entries) {
      const manifestItem = getScanManifestItem(entry.imageId);
      const gt: GroundTruthType =
        data.groundTruthMap[entry.imageId] ||
        entry.groundTruth ||
        manifestItem?.groundTruth ||
        'Unknown';
      const resolvedFileName = entry.fileName || manifestItem?.fileName || entry.imageId;
      const resolvedSlot = entry.slotNumber ?? manifestItem?.globalIndex ?? '';
      const resolvedMorphology = manifestItem?.morphology || '';
      const q1 = entry.q1_classification;

      let outcome = 'Pending';
      if (q1) {
        if (q1 === 'Uncertain') {
          outcome = 'Uncertain';
        } else if (gt === 'Unknown') {
          outcome = q1;
        } else if (q1 === gt) {
          outcome = 'Correct';
        } else if (gt === 'Synthetic' && q1 === 'Real') {
          outcome = 'FOOLED (Synthetic labelled Real)';
        } else {
          outcome = 'Missed';
        }
      }

      const decisionSec =
        entry.decisionTimeMs && entry.decisionTimeMs > 0 && entry.decisionTimeMs < 600000
          ? (entry.decisionTimeMs / 1000).toFixed(2)
          : '';

      rows.push(
        [
          escapeCsvCell(expertId),
          escapeCsvCell(entry.experienceTier || ''),
          escapeCsvCell(resolvedSlot),
          escapeCsvCell(entry.imageId),
          escapeCsvCell(resolvedFileName),
          escapeCsvCell(resolvedMorphology),
          escapeCsvCell(gt),
          escapeCsvCell(q1 || 'Not Rated'),
          escapeCsvCell(outcome),
          escapeCsvCell(entry.q2_realism ?? ''),
          escapeCsvCell(entry.q3_artifacts ?? ''),
          escapeCsvCell(entry.q4_plausibility ?? ''),
          escapeCsvCell(decisionSec),
          escapeCsvCell((entry.artifactTags || []).join('; ')),
          escapeCsvCell(entry.clinicalNotes || ''),
          escapeCsvCell(entry.evaluatedAt || ''),
        ].join(',')
      );
    }
  }

  // Add UTF-8 BOM for seamless Excel compatibility
  return '\uFEFF' + rows.join('\n');
}

function saveStoredData(data: StoredData): void {
  cachedMemoryStore = data;
  try {
    const dir = resolveWritableDataDir();
    const jsonFile = path.join(dir, 'responses.json');
    const csvFile = path.join(dir, 'responses.csv');
    fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2), 'utf-8');
    const csvContent = generateCsvContent(data);
    fs.writeFileSync(csvFile, csvContent, 'utf-8');
  } catch (err) {
    console.error('Error saving responses to disk:', err);
  }
}

export async function GET(request: Request) {
  try {
    const data = loadStoredData();
    const { searchParams } = new URL(request.url);
    const expertId = searchParams.get('expertId');
    const format = searchParams.get('format');

    if (format === 'csv') {
      const csvContent = generateCsvContent(data);
      const filename = `Ultrasound_Turing_Master_Responses_${new Date().toISOString().split('T')[0]}.csv`;
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    if (format === 'json') {
      const jsonContent = JSON.stringify(data, null, 2);
      const filename = `Ultrasound_Turing_Master_Responses_${new Date().toISOString().split('T')[0]}.json`;
      return new NextResponse(jsonContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    if (expertId && data.byExpert[expertId]) {
      return NextResponse.json({
        success: true,
        expertId,
        responses: data.byExpert[expertId],
        lastUpdated: data.lastUpdated,
      });
    }

    return NextResponse.json({
      success: true,
      responses: data.latestResponses,
      byExpert: data.byExpert,
      lastUpdated: data.lastUpdated,
      csvFilePath: 'data/responses.csv',
      jsonFilePath: 'data/responses.json',
    });
  } catch (error) {
    console.error('GET /api/responses error:', error);
    return NextResponse.json({ success: false, error: 'Failed to read stored responses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageId, evaluation, allEvaluations, expertId, imageMeta, groundTruthMap } = body;
    const currentExpert = (expertId || 'Anonymous').trim() || 'Anonymous';

    const stored = loadStoredData();
    if (!stored.byExpert[currentExpert]) {
      stored.byExpert[currentExpert] = {};
    }

    // Update ground truth mapping if provided
    if (groundTruthMap && typeof groundTruthMap === 'object') {
      stored.groundTruthMap = {
        ...stored.groundTruthMap,
        ...groundTruthMap,
      };
    }

    if (allEvaluations && typeof allEvaluations === 'object') {
      stored.byExpert[currentExpert] = {
        ...stored.byExpert[currentExpert],
        ...allEvaluations,
      };
      stored.latestResponses = {
        ...stored.latestResponses,
        ...allEvaluations,
      };
    } else if (imageId && evaluation) {
      const evalEntry: StoredEvaluationEntry = {
        ...(stored.byExpert[currentExpert][imageId] || {}),
        ...evaluation,
        ...(imageMeta || {}),
        evaluatedAt: new Date().toISOString(),
      };
      if (imageMeta?.groundTruth) {
        stored.groundTruthMap[imageId] = imageMeta.groundTruth;
      }
      stored.byExpert[currentExpert][imageId] = evalEntry;
      stored.latestResponses[imageId] = evalEntry;
    }

    stored.lastUpdated = new Date().toISOString();
    saveStoredData(stored);

    return NextResponse.json({
      success: true,
      savedAt: stored.lastUpdated,
      expertId: currentExpert,
      jsonPath: 'data/responses.json',
      csvPath: 'data/responses.csv',
      totalSaved: Object.keys(stored.byExpert[currentExpert]).length,
    });
  } catch (error) {
    console.error('POST /api/responses error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save response' }, { status: 500 });
  }
}
