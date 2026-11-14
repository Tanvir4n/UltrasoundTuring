'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UltrasoundImageItem, ImageEvaluationResponse } from '../types/evaluation';
import { exportEvaluationsToCSV } from '../utils/metrics';

import { HeaderHero } from '../components/HeaderHero';
import { ImageAssessmentCard } from '../components/ImageAssessmentCard';
import { PageNavigation } from '../components/PageNavigation';
import { ImageLightboxModal } from '../components/ImageLightboxModal';

import { Upload, ChevronRight, ChevronLeft, Download, Layers } from 'lucide-react';

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
    };
  });
  return [...items, ...padding];
};

export default function AssessmentPage() {
  const [expertId, setExpertId] = useState<string>('');
  const [images, setImages] = useState<UltrasoundImageItem[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const [evaluations, setEvaluations] = useState<Record<string, ImageEvaluationResponse>>({});
  const [lightboxImage, setLightboxImage] = useState<UltrasoundImageItem | null>(null);

  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const slotsSectionRef = useRef<HTMLDivElement>(null);

  // Initialize 100 empty slots (10 pages * 10 slots)
  const initialize100Slots = () => {
    const slots: UltrasoundImageItem[] = Array.from({ length: DEFAULT_TOTAL_SLOTS }).map((_, idx) => ({
      id: `SCAN-${String(idx + 1).padStart(3, '0')}`,
      imageUrl: '',
      slotNumber: (idx % 10) + 1,
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

    const savedEvals = localStorage.getItem('ous_evaluations');
    if (savedEvals) {
      try {
        setEvaluations(JSON.parse(savedEvals));
      } catch (e) {
        console.warn(e);
      }
    }
  }, []);

  // Sync state to LocalStorage
  useEffect(() => {
    if (expertId) localStorage.setItem('ous_expert_id', expertId);
    if (Object.keys(evaluations).length > 0) {
      localStorage.setItem('ous_evaluations', JSON.stringify(evaluations));
    }
  }, [expertId, evaluations]);

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

        newItems.push({
          id: baseName || `SCAN-${String(index + 1).padStart(3, '0')}`,
          fileName: file.name,
          imageUrl: dataUrl,
          slotNumber: (index % 10) + 1,
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

      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId
            ? { ...img, id: baseName, fileName: file.name, imageUrl: dataUrl }
            : img
        )
      );
    };
    reader.readAsDataURL(file);
  };

  // Handle rating changes
  const handleUpdateEvaluation = (imageId: string, update: Partial<ImageEvaluationResponse>) => {
    setEvaluations((prev) => {
      const current = prev[imageId] || {
        imageId,
        q1_classification: null,
        q2_realism: null,
        q3_artifacts: null,
        q4_plausibility: null,
      };

      return {
        ...prev,
        [imageId]: {
          ...current,
          ...update,
        },
      };
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

  // Export to CSV
  const handleExportCSV = () => {
    exportEvaluationsToCSV(images, evaluations, expertId);
  };

  // Scroll to slots section
  const handleScrollToSlots = () => {
    slotsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  return (
    <div className="flex-1 flex flex-col bg-[#fbfbf9] text-[#111827] min-h-screen">
      
      {/* 1. HERO & TOP NAVBAR */}
      <HeaderHero
        expertId={expertId}
        setExpertId={setExpertId}
        totalImages={images.filter((i) => Boolean(i.imageUrl)).length}
        totalEvaluated={totalEvaluated}
        onUploadFiles={handleUploadFiles}
        onRefreshFolder={fetchFolderImages}
        onClearImages={handleClearImages}
        onExportCSV={handleExportCSV}
        onScrollToSlots={handleScrollToSlots}
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

          <div className="flex items-center gap-2.5">
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
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black bg-[#9CDBFA] hover:bg-[#82CDF6] text-black border-2 border-black shadow-neo-sm transition active:translate-x-0.5 active:translate-y-0.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Add Images</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-white hover:bg-slate-100 text-black border-2 border-black shadow-neo-sm transition active:translate-x-0.5 active:translate-y-0.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

        </div>
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
                className="inline-flex items-center gap-1 px-5 py-2.5 rounded-full text-xs font-bold bg-white border-2 border-black text-black hover:bg-slate-100 shadow-neo transition active:translate-x-0.5 active:translate-y-0.5"
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
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-black bg-[#9CDBFA] hover:bg-[#82CDF6] text-black border-2 border-black shadow-neo transition active:translate-x-0.5 active:translate-y-0.5"
              >
                <span>Next Page (Page {currentPage + 1})</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-black bg-[#84CC16] hover:bg-[#65a30d] text-black border-2 border-black shadow-neo transition active:translate-x-0.5 active:translate-y-0.5"
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

    </div>
  );
}
