'use client';

import React, { useRef } from 'react';
import { 
  UltrasoundImageItem, 
  ImageEvaluationResponse, 
  ClassificationResponse 
} from '../types/evaluation';
import { 
  Maximize2, 
  Check, 
  Upload, 
  FileImage,
  MessageSquare
} from 'lucide-react';

interface ImageAssessmentCardProps {
  image: UltrasoundImageItem;
  globalIndex: number;
  slotIndex: number; // 1 to 10
  evaluation: ImageEvaluationResponse | undefined;
  onUpdateEvaluation: (imageId: string, update: Partial<ImageEvaluationResponse>) => void;
  onReplaceImage?: (imageId: string, file: File) => void;
  onOpenLightbox: (image: UltrasoundImageItem) => void;
}

export const ImageAssessmentCard: React.FC<ImageAssessmentCardProps> = ({
  image,
  globalIndex,
  slotIndex,
  evaluation,
  onUpdateEvaluation,
  onReplaceImage,
  onOpenLightbox,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isQ1 = evaluation?.q1_classification != null;
  const isQ2 = evaluation?.q2_realism != null;
  const isQ3 = evaluation?.q3_artifacts != null;
  const isQ4 = evaluation?.q4_plausibility != null;
  const isComplete = isQ1 && isQ2 && isQ3 && isQ4;

  const currentQ1 = evaluation?.q1_classification || null;
  const currentQ2 = evaluation?.q2_realism || null;
  const currentQ3 = evaluation?.q3_artifacts || null;
  const currentQ4 = evaluation?.q4_plausibility || null;
  const notes = evaluation?.clinicalNotes || '';

  const handleSingleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onReplaceImage) {
      onReplaceImage(image.id, e.target.files[0]);
    }
  };

  return (
    <div
      id={`slot-${slotIndex}`}
      className={`bg-white border-2 border-black rounded-3xl shadow-neo-md transition-all duration-150 overflow-hidden ${
        isComplete ? 'ring-2 ring-black/5' : ''
      }`}
    >
      {/* Slot Header Bar */}
      <div className="bg-[#FAF9F6] px-5 py-3.5 border-b-2 border-black flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="bg-[#9CDBFA] text-black border-2 border-black rounded-xl px-3 py-1 font-black text-xs shadow-neo-sm">
            SLOT #{String(slotIndex).padStart(2, '0')}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-black">
                Image ID: {image.id}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                (Scan {globalIndex})
              </span>
            </div>
            {image.fileName && image.fileName !== image.id && (
              <div className="text-[11px] text-slate-500 font-mono truncate max-w-xs">
                File: {image.fileName}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleSingleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white hover:bg-slate-100 text-black border-2 border-black shadow-neo-sm transition active:translate-x-0.5 active:translate-y-0.5"
            title="Change or upload scan for this slot"
          >
            <Upload className="w-3 h-3" />
            <span>Change Scan</span>
          </button>

          {isComplete ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-[#84CC16] text-black border-2 border-black shadow-neo-sm">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Complete (4/4)</span>
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white text-slate-700 border-2 border-black shadow-neo-sm">
              {[isQ1, isQ2, isQ3, isQ4].filter(Boolean).length}/4 Answered
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: Left Image, Right Questions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y-2 lg:divide-y-0 lg:divide-x-2 divide-black">
        
        {/* ================= LEFT: ULTRASOUND VIEWPORT (5 cols) ================= */}
        <div className="lg:col-span-5 bg-[#12161f] p-4 sm:p-5 flex flex-col justify-between">
          <div className="relative aspect-[4/3] w-full bg-black rounded-2xl border-2 border-black flex items-center justify-center overflow-hidden group select-none shadow-neo-sm">
            {image.imageUrl ? (
              <>
                <img
                  src={image.imageUrl}
                  alt={`Scan ${image.id}`}
                  className="w-full h-full object-contain cursor-pointer"
                  onClick={() => onOpenLightbox(image)}
                />

                {/* 10 mm Caliper Scale in Sky Blue */}
                <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 bg-black/80 px-2.5 py-1 rounded-lg border border-slate-700 text-[10px] font-mono text-white pointer-events-none">
                  <span className="w-4 h-0.5 bg-[#9CDBFA] inline-block" />
                  <span>10 mm</span>
                </div>

                {/* Enlarge Button */}
                <button
                  type="button"
                  onClick={() => onOpenLightbox(image)}
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white text-black border-2 border-black shadow-neo-sm hover:bg-[#9CDBFA] transition"
                  title="View in full-resolution lightbox"
                >
                  <Maximize2 className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-950 hover:bg-slate-900 transition text-slate-400 hover:text-white"
              >
                <FileImage className="w-10 h-10 mb-2 stroke-1 text-[#9CDBFA]" />
                <span className="text-xs font-bold text-white">Click to Select Scan</span>
                <span className="text-[11px] text-slate-500 mt-1 font-mono">Slot #{slotIndex}</span>
              </button>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
            <span className="text-white font-mono">Scan #{globalIndex}</span>
            <span>Click image to view high-res</span>
          </div>
        </div>

        {/* ================= RIGHT: THE 4 STANDARDIZED QUESTIONS (7 cols) ================= */}
        <div className="lg:col-span-7 p-5 sm:p-7 space-y-6 bg-white">
          
          {/* Q1. Image Classification */}
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#0284c7]">
                  Question 1: Image Classification
                </span>
                <h4 className="text-sm font-extrabold text-black mt-0.5">
                  In your expert opinion, is this image a real clinical ultrasound image or a synthetic-generated image?
                </h4>
              </div>
              {currentQ1 && (
                <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-black text-white shrink-0">
                  {currentQ1}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {(['Real', 'Synthetic', 'Uncertain'] as ClassificationResponse[]).map((option) => {
                const isSelected = currentQ1 === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      onUpdateEvaluation(image.id, {
                        q1_classification: option,
                        evaluatedAt: new Date().toISOString(),
                      })
                    }
                    className={`py-3 px-3 rounded-2xl border-2 border-black text-xs sm:text-sm font-black transition-all flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? option === 'Real'
                          ? 'bg-[#86EFAC] text-black shadow-neo translate-x-0.5 translate-y-0.5'
                          : option === 'Synthetic'
                          ? 'bg-[#9CDBFA] text-black shadow-neo translate-x-0.5 translate-y-0.5'
                          : 'bg-[#FEF08A] text-black shadow-neo translate-x-0.5 translate-y-0.5'
                        : 'bg-white text-slate-800 hover:bg-slate-50 shadow-neo-sm'
                    }`}
                  >
                    <span>{option}</span>
                    <span className="text-[10px] font-medium text-slate-600">
                      {option === 'Real' ? 'Clinical scan' : option === 'Synthetic' ? 'Diffusion AI' : 'Inconclusive'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Q2. Anatomical Realism */}
          <div className="space-y-2 pt-4 border-t-2 border-black/10">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#0284c7]">
                  Question 2: Anatomical Realism
                </span>
                <h4 className="text-sm font-bold text-black mt-0.5">
                  How realistic and anatomically plausible are the ovarian structures and visible follicles in this image?
                </h4>
              </div>
              {currentQ2 && (
                <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-black text-white shrink-0 font-mono">
                  {currentQ2} / 5
                </span>
              )}
            </div>

            {/* 1 to 5 Buttons in Sky Blue */}
            <div className="space-y-1.5 pt-1">
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((score) => {
                  const isSelected = currentQ2 === score;
                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() =>
                        onUpdateEvaluation(image.id, {
                          q2_realism: score,
                          evaluatedAt: new Date().toISOString(),
                        })
                      }
                      className={`py-2.5 rounded-xl border-2 border-black text-sm font-black transition-all ${
                        isSelected
                          ? 'bg-[#9CDBFA] text-black shadow-neo translate-x-0.5 translate-y-0.5'
                          : 'bg-white text-black hover:bg-slate-50 shadow-neo-sm'
                      }`}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between text-[11px] font-bold text-slate-500 px-1">
                <span>1: Very unrealistic</span>
                <span>3: Moderately realistic</span>
                <span>5: Highly realistic</span>
              </div>
            </div>
          </div>

          {/* Q3. Image Artifacts */}
          <div className="space-y-2 pt-4 border-t-2 border-black/10">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#F59E0B]">
                  Question 3: Image Artifacts
                </span>
                <h4 className="text-sm font-bold text-black mt-0.5">
                  To what extent do you observe artificial patterns, distortions, or unusual structures in this image?
                </h4>
              </div>
              {currentQ3 && (
                <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-black text-white shrink-0 font-mono">
                  {currentQ3} / 5
                </span>
              )}
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((score) => {
                  const isSelected = currentQ3 === score;
                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() =>
                        onUpdateEvaluation(image.id, {
                          q3_artifacts: score,
                          evaluatedAt: new Date().toISOString(),
                        })
                      }
                      className={`py-2.5 rounded-xl border-2 border-black text-sm font-black transition-all ${
                        isSelected
                          ? 'bg-[#F59E0B] text-black shadow-neo translate-x-0.5 translate-y-0.5'
                          : 'bg-white text-black hover:bg-slate-50 shadow-neo-sm'
                      }`}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between text-[11px] font-bold text-slate-500 px-1">
                <span>1: No noticeable artifacts</span>
                <span>3: Moderate artifacts</span>
                <span>5: Severe artifacts</span>
              </div>
            </div>
          </div>

          {/* Q4. Overall Clinical Plausibility */}
          <div className="space-y-2 pt-4 border-t-2 border-black/10">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#0284c7]">
                  Question 4: Overall Clinical Plausibility
                </span>
                <h4 className="text-sm font-bold text-black mt-0.5">
                  How closely does this image resemble a genuine clinical ovarian ultrasound image?
                </h4>
              </div>
              {currentQ4 && (
                <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-black text-white shrink-0 font-mono">
                  {currentQ4} / 5
                </span>
              )}
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((score) => {
                  const isSelected = currentQ4 === score;
                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() =>
                        onUpdateEvaluation(image.id, {
                          q4_plausibility: score,
                          evaluatedAt: new Date().toISOString(),
                        })
                      }
                      className={`py-2.5 rounded-xl border-2 border-black text-sm font-black transition-all ${
                        isSelected
                          ? 'bg-[#9CDBFA] text-black shadow-neo translate-x-0.5 translate-y-0.5'
                          : 'bg-white text-black hover:bg-slate-50 shadow-neo-sm'
                      }`}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between text-[11px] font-bold text-slate-500 px-1">
                <span>1: Not at all</span>
                <span>3: Moderately</span>
                <span>5: Extremely closely</span>
              </div>
            </div>
          </div>

          {/* Optional Clinical Remarks Field */}
          <div className="pt-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Clinical Remarks (optional):</span>
            </div>
            <input
              type="text"
              value={notes}
              onChange={(e) =>
                onUpdateEvaluation(image.id, {
                  clinicalNotes: e.target.value,
                  evaluatedAt: new Date().toISOString(),
                })
              }
              placeholder="e.g. follicle boundary regularity, acoustic shadow quality..."
              className="w-full bg-white border-2 border-black rounded-xl px-3 py-2 text-xs font-medium text-black placeholder-slate-400 focus:outline-none shadow-neo-sm"
            />
          </div>

        </div>

      </div>
    </div>
  );
};
