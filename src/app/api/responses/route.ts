import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { ImageEvaluationResponse } from '@/types/evaluation';

const DATA_DIR = path.join(process.cwd(), 'data');
const RESPONSES_FILE = path.join(DATA_DIR, 'responses.json');

interface StoredData {
  lastUpdated: string;
  byExpert: Record<string, Record<string, ImageEvaluationResponse>>;
  latestResponses: Record<string, ImageEvaluationResponse>;
}

// Helper to safely load data from disk
function loadStoredData(): StoredData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(RESPONSES_FILE)) {
      const content = fs.readFileSync(RESPONSES_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading responses.json:', err);
  }
  return {
    lastUpdated: new Date().toISOString(),
    byExpert: {},
    latestResponses: {},
  };
}

// Helper to save data to disk
function saveStoredData(data: StoredData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(RESPONSES_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving responses.json to disk:', err);
  }
}

export async function GET(request: Request) {
  try {
    const data = loadStoredData();
    const { searchParams } = new URL(request.url);
    const expertId = searchParams.get('expertId');

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
    });
  } catch (error) {
    console.error('GET /api/responses error:', error);
    return NextResponse.json({ success: false, error: 'Failed to read stored responses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageId, evaluation, allEvaluations, expertId } = body;
    const currentExpert = (expertId || 'Anonymous').trim();

    const stored = loadStoredData();
    if (!stored.byExpert[currentExpert]) {
      stored.byExpert[currentExpert] = {};
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
      const evalEntry: ImageEvaluationResponse = {
        ...(stored.byExpert[currentExpert][imageId] || {}),
        ...evaluation,
        evaluatedAt: new Date().toISOString(),
      };
      stored.byExpert[currentExpert][imageId] = evalEntry;
      stored.latestResponses[imageId] = evalEntry;
    }

    stored.lastUpdated = new Date().toISOString();
    saveStoredData(stored);

    return NextResponse.json({
      success: true,
      savedAt: stored.lastUpdated,
      expertId: currentExpert,
      filePath: 'data/responses.json',
      totalSaved: Object.keys(stored.byExpert[currentExpert]).length,
    });
  } catch (error) {
    console.error('POST /api/responses error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save response' }, { status: 500 });
  }
}
