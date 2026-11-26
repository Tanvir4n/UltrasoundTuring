import { NextResponse } from 'next/server';
import { ImageEvaluationResponse } from '@/types/evaluation';

// In-memory / session store fallback for responses
let globalResponses: Record<string, ImageEvaluationResponse> = {};

export async function GET() {
  return NextResponse.json({ responses: globalResponses });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageId, evaluation, allEvaluations, expertId } = body;

    if (allEvaluations && typeof allEvaluations === 'object') {
      globalResponses = { ...globalResponses, ...allEvaluations };
    } else if (imageId && evaluation) {
      globalResponses[imageId] = {
        ...globalResponses[imageId],
        ...evaluation,
        evaluatedAt: new Date().toISOString(),
      };
    }

    return NextResponse.json({
      success: true,
      savedAt: new Date().toISOString(),
      expertId: expertId || 'Anonymous',
      totalSaved: Object.keys(globalResponses).length,
    });
  } catch (error) {
    console.error('Error saving response:', error);
    return NextResponse.json({ success: false, error: 'Failed to save response' }, { status: 500 });
  }
}
