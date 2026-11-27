import fs from 'fs';
import path from 'path';
import { GroundTruthType } from '@/types/evaluation';

export interface ManifestScanItem {
  id: string;
  slotNumber: number;
  pageNumber: number;
  globalIndex: number;
  fileName: string;
  relativePath: string;
  groundTruth: GroundTruthType;
  morphology: 'PCOS' | 'NON_PCOS';
}

export interface DatasetManifest {
  generatedAt: string;
  totalScans: number;
  realCount: number;
  syntheticCount: number;
  scans: ManifestScanItem[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const MANIFEST_FILE = path.join(DATA_DIR, 'dataset_manifest.json');
const VALID_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp']);

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function collectFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && VALID_EXTS.has(path.extname(e.name).toLowerCase()))
    .map((e) => path.join(dirPath, e.name));
}

export function generateBalancedManifest(): DatasetManifest {
  const cwd = process.cwd();
  const realPcosDir = path.join(cwd, 'real_images', 'PCOS');
  const realNonPcosDir = path.join(cwd, 'real_images', 'NON_PCOS');
  const syntheticDir = path.join(cwd, 'synthetic_images');

  // Collect real images
  let realPcos = collectFiles(realPcosDir).map((full) => ({
    fullPath: full,
    fileName: path.basename(full),
    relativePath: path.relative(cwd, full).replace(/\\/g, '/'),
    groundTruth: 'Real' as GroundTruthType,
    morphology: 'PCOS' as const,
  }));

  let realNonPcos = collectFiles(realNonPcosDir).map((full) => ({
    fullPath: full,
    fileName: path.basename(full),
    relativePath: path.relative(cwd, full).replace(/\\/g, '/'),
    groundTruth: 'Real' as GroundTruthType,
    morphology: 'NON_PCOS' as const,
  }));

  // Fallback if files sit directly in real_images/
  if (realPcos.length === 0 && realNonPcos.length === 0) {
    const rootReal = collectFiles(path.join(cwd, 'real_images')).map((full) => ({
      fullPath: full,
      fileName: path.basename(full),
      relativePath: path.relative(cwd, full).replace(/\\/g, '/'),
      groundTruth: 'Real' as GroundTruthType,
      morphology: 'PCOS' as const,
    }));
    realPcos = rootReal;
  }

  // Collect synthetic images
  const allSynthetic = collectFiles(syntheticDir).map((full) => {
    const name = path.basename(full);
    const upper = name.toUpperCase();
    const isNonPcos = upper.includes('NON PMOS') || upper.includes('NON_PCOS') || upper.includes('NON PCOS');
    return {
      fullPath: full,
      fileName: name,
      relativePath: path.relative(cwd, full).replace(/\\/g, '/'),
      groundTruth: 'Synthetic' as GroundTruthType,
      morphology: (isNonPcos ? 'NON_PCOS' : 'PCOS') as 'PCOS' | 'NON_PCOS',
    };
  });

  const synPcos = allSynthetic.filter((s) => s.morphology === 'PCOS');
  const synNonPcos = allSynthetic.filter((s) => s.morphology === 'NON_PCOS');

  // Select 50 Real (25 PCOS + 25 NON_PCOS) & 50 Synthetic (25 PCOS + 25 NON_PCOS)
  const pickedRealPcos = shuffleArray(realPcos).slice(0, 25);
  const pickedRealNonPcos = shuffleArray(realNonPcos).slice(0, 25);
  let selectedReal = shuffleArray([...pickedRealPcos, ...pickedRealNonPcos]);

  // Top up to 50 if one class had fewer files
  if (selectedReal.length < 50) {
    const used = new Set(selectedReal.map((r) => r.relativePath));
    const remainingReal = shuffleArray([...realPcos, ...realNonPcos].filter((r) => !used.has(r.relativePath)));
    selectedReal = [...selectedReal, ...remainingReal.slice(0, 50 - selectedReal.length)];
  }

  const pickedSynPcos = shuffleArray(synPcos).slice(0, 25);
  const pickedSynNonPcos = shuffleArray(synNonPcos).slice(0, 25);
  let selectedSyn = shuffleArray([...pickedSynPcos, ...pickedSynNonPcos]);

  if (selectedSyn.length < 50) {
    const used = new Set(selectedSyn.map((s) => s.relativePath));
    const remainingSyn = shuffleArray(allSynthetic.filter((s) => !used.has(s.relativePath)));
    selectedSyn = [...selectedSyn, ...remainingSyn.slice(0, 50 - selectedSyn.length)];
  }

  // Distribute 5 Real + 5 Synthetic per page across 10 pages (50/50 per page AND 50/50 overall)
  const scans: ManifestScanItem[] = [];
  const totalPages = 10;

  for (let p = 0; p < totalPages; p++) {
    const pageReal = selectedReal.slice(p * 5, p * 5 + 5);
    const pageSyn = selectedSyn.slice(p * 5, p * 5 + 5);
    const pageCombined = shuffleArray([...pageReal, ...pageSyn]);

    pageCombined.forEach((item, slotIdx) => {
      const globalIndex = p * 10 + slotIdx + 1;
      scans.push({
        id: `SCAN-${String(globalIndex).padStart(3, '0')}`,
        slotNumber: slotIdx + 1,
        pageNumber: p + 1,
        globalIndex,
        fileName: item.fileName,
        relativePath: item.relativePath,
        groundTruth: item.groundTruth,
        morphology: item.morphology,
      });
    });
  }

  const manifest: DatasetManifest = {
    generatedAt: new Date().toISOString(),
    totalScans: scans.length,
    realCount: scans.filter((s) => s.groundTruth === 'Real').length,
    syntheticCount: scans.filter((s) => s.groundTruth === 'Synthetic').length,
    scans,
  };

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf-8');

  return manifest;
}

export function getOrCreateDatasetManifest(): DatasetManifest | null {
  try {
    if (fs.existsSync(MANIFEST_FILE)) {
      const content = fs.readFileSync(MANIFEST_FILE, 'utf-8');
      const parsed: DatasetManifest = JSON.parse(content);
      if (parsed && Array.isArray(parsed.scans) && parsed.scans.length > 0) {
        const firstPath = path.join(process.cwd(), parsed.scans[0].relativePath);
        if (fs.existsSync(firstPath)) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.error('Error reading dataset_manifest.json:', err);
  }

  // Only generate if real_images or synthetic_images exist
  const hasReal = fs.existsSync(path.join(process.cwd(), 'real_images'));
  const hasSyn = fs.existsSync(path.join(process.cwd(), 'synthetic_images'));
  if (hasReal || hasSyn) {
    return generateBalancedManifest();
  }

  return null;
}

export function getScanManifestItem(scanId: string): ManifestScanItem | null {
  const manifest = getOrCreateDatasetManifest();
  if (!manifest) return null;
  return manifest.scans.find((s) => s.id === scanId) || null;
}
