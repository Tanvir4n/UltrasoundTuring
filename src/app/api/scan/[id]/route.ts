import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getScanManifestItem } from '@/lib/dataset';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
};

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  try {
    const scanId = context.params.id;
    const item = getScanManifestItem(scanId);

    if (!item) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    const cwd = process.cwd();
    const resolvedPath = path.resolve(cwd, item.relativePath);

    // Prevent directory traversal outside workspace
    if (!resolvedPath.startsWith(cwd + path.sep) && resolvedPath !== cwd) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({ error: 'Image file missing on disk' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(resolvedPath);
    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error serving scan image:', error);
    return NextResponse.json({ error: 'Failed to load scan' }, { status: 500 });
  }
}
