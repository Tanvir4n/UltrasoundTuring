import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { GroundTruthType } from '@/types/evaluation';
import { getOrCreateDatasetManifest, generateBalancedManifest } from '@/lib/dataset';

export async function GET() {
  try {
    // 1. Prefer balanced 50/50 dataset from manifest (served via public/scans/ or /api/scan/)
    const manifest = getOrCreateDatasetManifest();
    if (manifest && manifest.scans.length > 0) {
      const images = manifest.scans.map((scan) => {
        const publicFileExists =
          scan.publicUrl &&
          fs.existsSync(path.join(process.cwd(), 'public', scan.publicUrl.replace(/^\//, '')));
        return {
          id: scan.id,
          fileName: scan.fileName,
          imageUrl: publicFileExists
            ? `${scan.publicUrl}?v=${encodeURIComponent(manifest.generatedAt)}`
            : `/api/scan/${encodeURIComponent(scan.id)}?v=${encodeURIComponent(manifest.generatedAt)}`,
          slotNumber: scan.slotNumber,
          groundTruth: scan.groundTruth,
        };
      });

      return NextResponse.json({
        images,
        datasetSummary: {
          totalScans: manifest.totalScans,
          realCount: manifest.realCount,
          syntheticCount: manifest.syntheticCount,
          generatedAt: manifest.generatedAt,
          mode: '50_50_balanced',
        },
      });
    }

    // 2. Fallback: scan public/images folder if present
    const imagesDir = path.join(process.cwd(), 'public', 'images');
    if (!fs.existsSync(imagesDir)) {
      return NextResponse.json({ images: [] });
    }

    const files = fs.readdirSync(imagesDir);
    const validExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff', '.svg']);

    const imageFiles = files
      .filter((file) => validExtensions.has(path.extname(file).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
      .map((file, index) => {
        const id = path.parse(file).name;
        const lower = file.toLowerCase();

        let groundTruth: GroundTruthType = 'Unknown';
        if (lower.includes('real') || lower.includes('orig') || lower.includes('clinical')) {
          groundTruth = 'Real';
        } else if (
          lower.includes('syn') ||
          lower.includes('fake') ||
          lower.includes('diff') ||
          lower.includes('gen') ||
          lower.includes('ai')
        ) {
          groundTruth = 'Synthetic';
        }

        return {
          id: id || `IMG-${String(index + 1).padStart(3, '0')}`,
          fileName: file,
          imageUrl: `/images/${file}`,
          slotNumber: (index % 10) + 1,
          groundTruth,
        };
      });

    return NextResponse.json({ images: imageFiles });
  } catch (error) {
    console.error('Error reading images:', error);
    return NextResponse.json({ images: [] }, { status: 500 });
  }
}

// POST /api/images to reshuffle a fresh 50/50 batch (when running with local raw folders)
export async function POST() {
  try {
    const hasLocalSources =
      fs.existsSync(path.join(process.cwd(), 'real_images')) ||
      fs.existsSync(path.join(process.cwd(), 'synthetic_images'));

    if (!hasLocalSources) {
      return NextResponse.json(
        { success: false, error: 'Raw image pools are only available in local environment' },
        { status: 400 }
      );
    }

    const manifest = generateBalancedManifest();
    const images = manifest.scans.map((scan) => ({
      id: scan.id,
      fileName: scan.fileName,
      imageUrl: scan.publicUrl
        ? `${scan.publicUrl}?v=${encodeURIComponent(manifest.generatedAt)}`
        : `/api/scan/${encodeURIComponent(scan.id)}?v=${encodeURIComponent(manifest.generatedAt)}`,
      slotNumber: scan.slotNumber,
      groundTruth: scan.groundTruth,
    }));

    return NextResponse.json({
      success: true,
      images,
      datasetSummary: {
        totalScans: manifest.totalScans,
        realCount: manifest.realCount,
        syntheticCount: manifest.syntheticCount,
        generatedAt: manifest.generatedAt,
      },
    });
  } catch (error) {
    console.error('Error reshuffling dataset:', error);
    return NextResponse.json({ success: false, error: 'Failed to reshuffle dataset' }, { status: 500 });
  }
}
