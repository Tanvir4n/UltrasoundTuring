'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UltrasoundImageItem, ImageEvaluationResponse, GroundTruthType, ExpertExperienceTier } from '../types/evaluation';
import { exportEvaluationsToCSV, exportEvaluationsToJSON, calculateRealtimeMetrics } from '../utils/metrics';
import { exportFullReportToPDF, exportFullReportToWord } from '../utils/reportExport';

import { HeaderHero } from '../components/HeaderHero';
import { ImageAssessmentCard } from '../components/ImageAssessmentCard';
import { PageNavigation } from '../components/PageNavigation';
import { ImageLightboxModal } from '../components/ImageLightboxModal';
import { AnalyticsDashboardModal } from '../components/AnalyticsDashboardModal';
import { GroundTruthManagerModal } from '../components/GroundTruthManagerModal';

import { Upload, ChevronRight, ChevronLeft, Download, BarChart3, ShieldCheck, RefreshCw } from 'lucide-react';

const DEFAULT_TOTAL_SLOTS = 100; // Exactly 10 pages of 10 slots each = 100 slots

// Helper to ensure at least 100 slots (10 pages) are always available
const padSlotsToMinimum = (items: UltrasoundImageItem[]): UltrasoundImageItem[] => {
  if (items.length >= DEFAULT_TOTAL_SLOTS) {
    return items;
  }
  const remainingCount = DEFAULT_TOTAL_SLOTS - items.length;
  const padding: UltrasoundImageItem[] = Array.from({ length: remainingCount }).map((_, idx) => {
    const globalIdx = items.length + idx + 1;
    return {
      id: `SCAN-${String(globalIdx).padStart(3, '0')}`,
      imageUrl: '',
      slotNumber: ((globalIdx - 1) % 10) + 1,
      groundTruth: 'Unknown',
    };
  });
  return [...items, ...padding];
};

export default function AssessmentPage() {
  const [expertId, setExpertId] = useState<string>('');
  const [experienceTier, setExperienceTier] = useState<string>('Senior (>10 yrs)');
  const [images, setImages] = useState<UltrasoundImageItem[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const [evaluations, setEvaluations] = useState<Record<string, ImageEvaluationResponse>>({});
  const [lightboxImage, setLightboxImage] = useState<UltrasoundImageItem | null>(null);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);
  const [isGroundTruthOpen, setIsGroundTruthOpen] = useState<boolean>(false);
  const [isReshuffling, setIsReshuffling] = useState<boolean>(false);
  const [showLiveResultsStrip, setShowLiveResultsStrip] = useState<boolean>(true);

  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const slotsSectionRef = useRef<HTMLDivElement>(null);

  // Initialize 100 empty slots (10 pages * 10 slots)
  const initialize100Slots = () => {
    const slots: UltrasoundImageItem[] = Array.from({ length: DEFAULT_TOTAL_SLOTS }).map((_, idx) => ({
      id: `SCAN-${String(idx + 1).padStart(3, '0')}`,
      imageUrl: '',
      slotNumber: (idx % 10) + 1,
      groundTruth: 'Unknown',
    }));
    setImages(slots);
  };

  // 1. Fetch images from /api/images or localStorage on mount
  const fetchFolderImages = async () => {
    try {
      const res = await fetch('/api/images');
      const data = await res.json();
      if (data && Array.isArray(data.images) && data.images.length > 0) {
        setImages(padSlotsToMinimum(data.images));
        return;
      }
    } catch (err) {
      console.warn('API images not available:', err);
    }

    // Check localStorage
    try {
      const saved = localStorage.getItem('ous_custom_images');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setImages(padSlotsToMinimum(parsed));
          return;
        }
      }
    } catch (e) {
      console.warn(e);
    }

    initialize100Slots();
  };

  useEffect(() => {
    fetchFolderImages();

    const savedExpert = localStorage.getItem('ous_expert_id');
    if (savedExpert) setExpertId(savedExpert);

    const savedTier = localStorage.getItem('ous_expert_tier');
    if (savedTier) setExperienceTier(savedTier);

    const savedEvals = localStorage.getItem('ous_evaluations');
    if (savedEvals) {
      try {
        const parsedEvals = JSON.parse(savedEvals);
        setEvaluations(parsedEvals);
        // Sync existing localStorage responses to server files (data/responses.json & data/responses.csv)
        if (parsedEvals && Object.keys(parsedEvals).length > 0) {
          fetch('/api/responses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              expertId: savedExpert || 'Anonymous',
              allEvaluations: parsedEvals,
            }),
          }).catch(() => {});
        }
      } catch (e) {
        console.warn(e);
      }
    } else {
      // Fallback: restore from backend file store (data/responses.json) if available
      fetch('/api/responses')
        .then((r) => r.json())
        .then((data) => {
          if (data?.responses && Object.keys(data.responses).length > 0) {
            setEvaluations(data.responses);
          }
        })
        .catch((err) => console.warn('Could not restore from server API:', err));
    }
  }, []);

  // Sync state to LocalStorage & Backend API
  useEffect(() => {
    if (expertId) localStorage.setItem('ous_expert_id', expertId);
    if (experienceTier) localStorage.setItem('ous_expert_tier', experienceTier);
    if (Object.keys(evaluations).length > 0) {
      localStorage.setItem('ous_evaluations', JSON.stringify(evaluations));
    }
  }, [expertId, experienceTier, evaluations]);

  // Handle Bulk Upload of Images from User's Computer
  const handleUploadFiles = (fileList: FileList) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const newItems: UltrasoundImageItem[] = [];

    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        const lower = file.name.toLowerCase();

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

        newItems.push({
          id: baseName || `SCAN-${String(index + 1).padStart(3, '0')}`,
          fileName: file.name,
          imageUrl: dataUrl,
          slotNumber: (index % 10) + 1,
          groundTruth,
        });

        if (newItems.length === files.length) {
          newItems.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));

          // Pad to ensure at least 100 slots (10 pages)
          const allSlots = padSlotsToMinimum(newItems);
          setImages(allSlots);
          setCurrentPage(1);

          try {
            localStorage.setItem('ous_custom_images', JSON.stringify(allSlots));
          } catch (e) {
            console.warn('Storage full for images, working in memory');
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle single slot image replacement
  const handleReplaceSlotImage = (imageId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const lower = file.name.toLowerCase();

      let groundTruth: GroundTruthType = 'Unknown';
      if (lower.includes('real') || lower.includes('orig') || lower.includes('clinical')) {
        groundTruth = 'Real';
      } else if (lower.includes('syn') || lower.includes('fake') || lower.includes('diff') || lower.includes('gen')) {
        groundTruth = 'Synthetic';
      }

      setImages((prev) => {
        const updated = prev.map((img) =>
          img.id === imageId
            ? { ...img, id: baseName, fileName: file.name, imageUrl: dataUrl, groundTruth }
            : img
        );
        try {
          localStorage.setItem('ous_custom_images', JSON.stringify(updated));
        } catch (e) {
          console.warn('Storage full');
        }
        return updated;
      });
    };
    reader.readAsDataURL(file);
  };

  // Real-time Autosave & Rating changes
  const handleUpdateEvaluation = (imageId: string, update: Partial<ImageEvaluationResponse>) => {
    setEvaluations((prev) => {
      const current = prev[imageId] || {
        imageId,
        q1_classification: null,
        q2_realism: null,
        q3_artifacts: null,
        q4_plausibility: null,
      };

      const updatedEvaluation: ImageEvaluationResponse = {
        ...current,
        ...update,
        experienceTier: experienceTier as ExpertExperienceTier,
        evaluatedAt: new Date().toISOString(),
      };

      const nextState = {
        ...prev,
        [imageId]: updatedEvaluation,
      };

      // Autosave to localStorage immediately
      try {
        localStorage.setItem('ous_evaluations', JSON.stringify(nextState));
      } catch (e) {
        console.warn('Local storage write failed');
      }

      // Find image metadata to include slot/filename/ground truth in server CSV
      const targetImage = images.find((img) => img.id === imageId);

      // Background autosave to API (writes both data/responses.json and data/responses.csv)
      fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expertId,
          imageId,
          evaluation: updatedEvaluation,
          imageMeta: targetImage
            ? {
                slotNumber: targetImage.slotNumber,
                fileName: targetImage.fileName,
                groundTruth: targetImage.groundTruth || 'Unknown',
              }
            : undefined,
        }),
      }).catch((err) => console.warn('Background sync error (working offline):', err));

      return nextState;
    });
  };

  // Reset all
  const handleClearImages = () => {
    if (confirm('Clear all images and reset scores?')) {
      initialize100Slots();
      setEvaluations({});
      localStorage.removeItem('ous_custom_images');
      localStorage.removeItem('ous_evaluations');
      setCurrentPage(1);
    }
  };

  // Export full CSV with ground truth outcomes
  const handleExportCSV = () => {
    exportEvaluationsToCSV(images, evaluations, expertId);
  };

  // Export full JSON with ground truth & summary metrics
  const handleExportJSON = () => {
    exportEvaluationsToJSON(images, evaluations, expertId);
  };

  // Export publication-grade PDF report (fetches multi-reader snapshot if available)
  const handleExportPDF = async () => {
    let byExpert = undefined;
    try {
      const res = await fetch('/api/responses');
      const data = await res.json();
      if (data?.byExpert) byExpert = data.byExpert;
    } catch {}
    exportFullReportToPDF(images, evaluations, expertId, experienceTier, byExpert);
  };

  // Export editable Microsoft Word / Google Docs (.doc) report
  const handleExportWord = async () => {
    let byExpert = undefined;
    try {
      const res = await fetch('/api/responses');
      const data = await res.json();
      if (data?.byExpert) byExpert = data.byExpert;
    } catch {}
    exportFullReportToWord(images, evaluations, expertId, experienceTier, byExpert);
  };

  // Scroll to slots section
  const handleScrollToSlots = () => {
    slotsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Reshuffle a fresh random 50/50 batch (50 Real + 50 Synthetic) from local dataset folders
  const handleReshuffleDataset = async () => {
    if (
      Object.keys(evaluations).length > 0 &&
      !confirm('Generate a fresh random 50/50 sample (50 Real + 50 Synthetic)? This will replace the current 100-scan sequence.')
    ) {
      return;
    }

    try {
      setIsReshuffling(true);
      const res = await fetch('/api/images', { method: 'POST' });
      const data = await res.json();
      if (data?.images && data.images.length > 0) {
        setImages(padSlotsToMinimum(data.images));
        setEvaluations({});
        localStorage.removeItem('ous_evaluations');
        localStorage.removeItem('ous_custom_images');
        setCurrentPage(1);
      }
    } catch (err) {
      console.error('Failed to reshuffle dataset:', err);
    } finally {
      setIsReshuffling(false);
    }
  };

  // Pagination Math (Strictly 10 slots per page, always at least 10 pages)
  const totalPages = Math.max(10, Math.ceil(images.length / itemsPerPage));
  const pageStartIndex = (currentPage - 1) * itemsPerPage;
  const pageImages = useMemo(() => {
    return images.slice(pageStartIndex, pageStartIndex + itemsPerPage);
  }, [images, pageStartIndex, itemsPerPage]);

  const totalEvaluated = Object.values(evaluations).filter(
    (e) => e && (e.q1_classification != null || e.q2_realism != null || e.q3_artifacts != null || e.q4_plausibility != null)
  ).length;

  const liveMetrics = useMemo(
    () => calculateRealtimeMetrics(images, evaluations),
    [images, evaluations]
  );

  const realDatasetCount = images.filter((i) => i.groundTruth === 'Real').length;
  const syntheticDatasetCount = images.filter((i) => i.groundTruth === 'Synthetic').length;

  return (
    <div className="flex-1 flex flex-col bg-[#fbfbf9] text-[#111827] min-h-screen">
      
      {/* 1. HERO & TOP NAVBAR */}
      <HeaderHero
        expertId={expertId}
        setExpertId={setExpertId}
        experienceTier={experienceTier}
        setExperienceTier={setExperienceTier}
        totalImages={images.filter((i) => Boolean(i.imageUrl)).length}
        totalEvaluated={totalEvaluated}
        onUploadFiles={handleUploadFiles}
        onRefreshFolder={fetchFolderImages}
        onClearImages={handleClearImages}
        onExportCSV={handleExportCSV}
        onExportJSON={handleExportJSON}
        onExportPDF={handleExportPDF}
        onExportWord={handleExportWord}
        onScrollToSlots={handleScrollToSlots}
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
        onOpenGroundTruthManager={() => setIsGroundTruthOpen(true)}
      />

      {/* 2. 10-SLOT BATCH HEADER */}
      <section ref={slotsSectionRef} className="max-w-7xl w-full mx-auto px-4 sm:px-8 pt-8 pb-4">
        <div className="bg-white border-2 border-black rounded-3xl p-5 sm:p-6 shadow-neo-md flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-[#9CDBFA] text-black font-black text-sm border-2 border-black shadow-neo-sm flex items-center justify-center">
              P{currentPage}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg sm:text-xl text-black">
                  Page {currentPage} of {totalPages}: Slots #{pageStartIndex + 1} to #{Math.min(pageStartIndex + itemsPerPage, images.length)}
                </span>
                <span className="bg-[#84CC16] text-black border-2 border-black px-2.5 py-0.5 rounded-full text-xs font-bold shadow-neo-sm">
                  10 Scans / Page
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Evaluation format: 10 image slots per page across 10 standardized pages (100 total scans).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowLiveResultsStrip((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-black bg-[#FAF9F6] hover:bg-slate-100 hover:-translate-y-0.5 hover:shadow-neo text-black border-2 border-black shadow-neo-sm transition-all duration-150 cursor-pointer"
            >
              <span>{showLiveResultsStrip ? 'Hide Results Strip' : 'Show Results Strip'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAnalyticsOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black bg-[#84CC16] hover:bg-[#65a30d] hover:-translate-y-0.5 hover:shadow-neo text-black border-2 border-black shadow-neo-sm transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Full Analysis &amp; Charts</span>
            </button>

            <button
              type="button"
              onClick={handleReshuffleDataset}
              disabled={isReshuffling}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-black bg-white hover:bg-[#EBF7FD] hover:-translate-y-0.5 hover:shadow-neo text-black border-2 border-black shadow-neo-sm transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer disabled:opacity-50"
              title="Randomly draw a fresh 50 Real + 50 Synthetic dataset from local folders"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReshuffling ? 'animate-spin' : ''}`} />
              <span>{isReshuffling ? 'Sampling...' : 'Reshuffle 50/50'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsGroundTruthOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-black bg-white hover:bg-slate-50 hover:-translate-y-0.5 hover:shadow-neo text-black border-2 border-black shadow-neo-sm transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
              title="Add images or configure Real vs Synthetic ground truth"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Manage Ground Truth</span>
            </button>

            <input
              ref={bulkFileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => e.target.files && handleUploadFiles(e.target.files)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => bulkFileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black bg-[#9CDBFA] hover:bg-[#82CDF6] hover:-translate-y-0.5 hover:shadow-neo text-black border-2 border-black shadow-neo-sm transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Add Images</span>
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black bg-[#9CDBFA] hover:bg-[#82CDF6] hover:-translate-y-0.5 hover:shadow-neo text-black border-2 border-black shadow-neo-sm transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
              title="Download all results, statistical tests, and log in one PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>

            <button
              type="button"
              onClick={handleExportWord}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-white hover:bg-slate-100 hover:-translate-y-0.5 hover:shadow-neo text-black border-2 border-black shadow-neo-sm transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
              title="Download editable report for Microsoft Word / Google Docs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Docs (.doc)</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-white hover:bg-slate-100 hover:-translate-y-0.5 hover:shadow-neo text-black border-2 border-black shadow-neo-sm transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportJSON}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[#FEF08A] hover:bg-[#FDE047] hover:-translate-y-0.5 hover:shadow-neo text-black border-2 border-black shadow-neo-sm transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
          </div>

        </div>

        {/* LIVE RESULT & ANALYSIS SUMMARY STRIP */}
        {showLiveResultsStrip && (
          <div className="mt-4 bg-white border-2 border-black rounded-3xl p-4 sm:p-5 shadow-neo-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#84CC16] animate-pulse border border-black" />
                <span className="font-black text-xs sm:text-sm text-black uppercase tracking-wide">
                  Live Result &amp; Analysis Telemetry
                </span>
                <span className="bg-[#9CDBFA] text-black border border-black px-2.5 py-0.5 rounded-full text-[11px] font-black font-mono">
                  50/50 Split: {realDatasetCount} Real / {syntheticDatasetCount} Synthetic
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAnalyticsOpen(true)}
                className="text-xs font-black text-[#0284c7] hover:underline"
              >
                Open Charts, Confusion Matrix &amp; Log →
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div className="bg-[#FAF9F6] border border-black rounded-xl px-3 py-2">
                <div className="text-[10px] font-black uppercase text-slate-500">Accuracy</div>
                <div className="text-lg font-black text-black">
                  {liveMetrics.decisiveAccuracy != null ? `${liveMetrics.decisiveAccuracy}%` : '--%'}
                </div>
              </div>
              <div className="bg-[#FAF9F6] border border-black rounded-xl px-3 py-2">
                <div className="text-[10px] font-black uppercase text-slate-500">Fooling Rate</div>
                <div className="text-lg font-black text-[#0284c7]">
                  {liveMetrics.foolingRate != null ? `${liveMetrics.foolingRate}%` : '--%'}
                </div>
              </div>
              <div className="bg-[#FAF9F6] border border-black rounded-xl px-3 py-2">
                <div className="text-[10px] font-black uppercase text-slate-500">Realism (Q2)</div>
                <div className="text-lg font-black text-black">
                  {liveMetrics.meanRealismOverall != null ? `${liveMetrics.meanRealismOverall}/5` : '--/5'}
                </div>
              </div>
              <div className="bg-[#FAF9F6] border border-black rounded-xl px-3 py-2">
                <div className="text-[10px] font-black uppercase text-slate-500">Artifacts (Q3)</div>
                <div className="text-lg font-black text-[#F59E0B]">
                  {liveMetrics.meanArtifactsOverall != null ? `${liveMetrics.meanArtifactsOverall}/5` : '--/5'}
                </div>
              </div>
              <div className="bg-[#FAF9F6] border border-black rounded-xl px-3 py-2">
                <div className="text-[10px] font-black uppercase text-slate-500">Plausibility (Q4)</div>
                <div className="text-lg font-black text-black">
                  {liveMetrics.meanPlausibilityOverall != null ? `${liveMetrics.meanPlausibilityOverall}/5` : '--/5'}
                </div>
              </div>
              <div className="bg-[#FAF9F6] border border-black rounded-xl px-3 py-2">
                <div className="text-[10px] font-black uppercase text-slate-500">Progress</div>
                <div className="text-lg font-black text-emerald-700 font-mono">
                  {liveMetrics.totalEvaluated}/{liveMetrics.totalScans}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 3. MAIN EVALUATION BODY: 10 SLOTS */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-4 space-y-8">
        {pageImages.map((image, idx) => {
          const slotIndex = idx + 1;
          const globalIndex = pageStartIndex + slotIndex;

          return (
            <ImageAssessmentCard
              key={image.id || idx}
              image={image}
              slotIndex={slotIndex}
              globalIndex={globalIndex}
              evaluation={evaluations[image.id]}
              onUpdateEvaluation={handleUpdateEvaluation}
              onReplaceImage={handleReplaceSlotImage}
              onOpenLightbox={(img) => setLightboxImage(img)}
            />
          );
        })}

        {/* Bottom Page Navigation Box */}
        <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-neo-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm font-bold text-slate-800">
            Page {currentPage} of {totalPages} • 10 image slots per page (100 total slots)
          </div>

          <div className="flex items-center gap-3">
            {currentPage > 1 && (
              <button
                type="button"
                onClick={() => {
                  setCurrentPage((p) => p - 1);
                  window.scrollTo({ top: 400, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1 px-5 py-2.5 rounded-full text-xs font-bold bg-white border-2 border-black text-black hover:bg-slate-100 hover:-translate-y-0.5 hover:shadow-neo-md shadow-neo transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 stroke-[3]" />
                <span>Previous Page</span>
              </button>
            )}

            {currentPage < totalPages ? (
              <button
                type="button"
                onClick={() => {
                  setCurrentPage((p) => p + 1);
                  window.scrollTo({ top: 400, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-black bg-[#9CDBFA] hover:bg-[#82CDF6] hover:-translate-y-0.5 hover:shadow-neo-md text-black border-2 border-black shadow-neo transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
              >
                <span>Next Page (Page {currentPage + 1})</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-black bg-[#84CC16] hover:bg-[#65a30d] hover:-translate-y-0.5 hover:shadow-neo-md text-black border-2 border-black shadow-neo transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
              >
                <Download className="w-4 h-4 stroke-[3]" />
                <span>Export Final Assessment CSV</span>
              </button>
            )}
          </div>
        </div>
      </main>

      {/* 4. STICKY 10-SLOT MINI-MAP & 10-PAGE SELECTOR */}
      <PageNavigation
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page) => setCurrentPage(page)}
        pageImages={pageImages}
        evaluations={evaluations}
        totalEvaluated={totalEvaluated}
        totalImages={images.length}
        onExportCSV={handleExportCSV}
      />

      {/* 5. LIGHTBOX MODAL */}
      <ImageLightboxModal
        image={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />

      {/* 6. REAL-TIME ANALYTICS DASHBOARD MODAL */}
      <AnalyticsDashboardModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        images={images}
        evaluations={evaluations}
        expertId={expertId}
        experienceTier={experienceTier}
        onOpenGroundTruthManager={() => {
          setIsAnalyticsOpen(false);
          setIsGroundTruthOpen(true);
        }}
      />

      {/* 7. SCAN MANAGER & GROUND TRUTH SETUP MODAL */}
      <GroundTruthManagerModal
        isOpen={isGroundTruthOpen}
        onClose={() => setIsGroundTruthOpen(false)}
        images={images}
        onUpdateImages={(updated) => {
          setImages(updated);
          try {
            localStorage.setItem('ous_custom_images', JSON.stringify(updated));
          } catch (e) {
            console.warn(e);
          }
          // Sync ground truth map to server so data/responses.csv stays accurate
          const groundTruthMap: Record<string, GroundTruthType> = {};
          updated.forEach((img) => {
            if (img.groundTruth && img.groundTruth !== 'Unknown') {
              groundTruthMap[img.id] = img.groundTruth;
            }
          });
          fetch('/api/responses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ expertId, groundTruthMap }),
          }).catch(() => {});
        }}
        onBulkUpload={handleUploadFiles}
      />

    </div>
  );
}
