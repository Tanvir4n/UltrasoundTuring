'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { UltrasoundImageItem, ImageEvaluationResponse } from '../types/evaluation';

interface PageNavigationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageImages: UltrasoundImageItem[];
  evaluations: Record<string, ImageEvaluationResponse>;
  totalEvaluated: number;
  totalImages: number;
  onExportCSV: () => void;
}

export const PageNavigation: React.FC<PageNavigationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  pageImages,
  evaluations,
  totalEvaluated,
  totalImages,
  onExportCSV,
}) => {
  const pageCompletedCount = pageImages.filter((img) => {
    const e = evaluations[img.id];
    return e && e.q1_classification != null && e.q2_realism != null && e.q3_artifacts != null && e.q4_plausibility != null;
  }).length;

  const scrollToSlot = (slotIndex: number) => {
    const el = document.getElementById(`slot-${slotIndex}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <nav 
      aria-label="Evaluation page navigation"
      className="sticky bottom-0 z-30 bg-white border-t-2 border-black py-3 px-4 sm:px-8 shadow-neo-lg"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Left: 10 Slot Quick Mini-map */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <span className="text-xs font-black text-black font-mono shrink-0">
            Page {currentPage} Slots:
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            {pageImages.map((img, idx) => {
              const slotNum = idx + 1;
              const e = evaluations[img.id];
              const isFilled = e && e.q1_classification != null && e.q2_realism != null && e.q3_artifacts != null && e.q4_plausibility != null;
              const isPartial = e && (e.q1_classification != null || e.q2_realism != null || e.q3_artifacts != null || e.q4_plausibility != null) && !isFilled;

              return (
                <button
                  key={img.id || idx}
                  type="button"
                  onClick={() => scrollToSlot(slotNum)}
                  className={`w-7 h-7 rounded-xl text-xs font-black transition-all flex items-center justify-center border-2 border-black ${
                    isFilled
                      ? 'bg-[#84CC16] text-black shadow-neo-sm'
                      : isPartial
                      ? 'bg-[#FEF08A] text-black shadow-neo-sm'
                      : 'bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                  title={`Slot #${slotNum}: ${isFilled ? 'Complete' : isPartial ? 'In progress' : 'Unrated'}`}
                >
                  {slotNum}
                </button>
              );
            })}
          </div>

          <span className="text-xs font-extrabold text-slate-700 font-mono shrink-0 pl-1">
            ({pageCompletedCount}/{pageImages.length} slots complete)
          </span>
        </div>

        {/* Right: Page Navigation & Export */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => {
              onPageChange(currentPage - 1);
              window.scrollTo({ top: 400, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-xs font-extrabold bg-white border-2 border-black text-black hover:bg-slate-50 shadow-neo-sm transition active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5 stroke-[3]" />
            <span>Prev Page</span>
          </button>

          <span className="px-2 font-mono font-black text-xs text-black">
            Page {currentPage} of {totalPages}
          </span>

          {currentPage < totalPages ? (
            <button
              type="button"
              onClick={() => {
                onPageChange(currentPage + 1);
                window.scrollTo({ top: 400, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-black bg-[#9CDBFA] hover:bg-[#82CDF6] text-black border-2 border-black shadow-neo-sm transition active:translate-x-0.5 active:translate-y-0.5"
            >
              <span>Next Page</span>
              <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onExportCSV}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-black bg-[#84CC16] hover:bg-[#65a30d] text-black border-2 border-black shadow-neo-sm transition active:translate-x-0.5 active:translate-y-0.5"
            >
              <Download className="w-3.5 h-3.5 stroke-[3]" />
              <span>Download CSV Results</span>
            </button>
          )}
        </div>

      </div>
    </nav>
  );
};
