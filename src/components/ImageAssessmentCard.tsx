'use client';

import React, { useRef, useState } from 'react';
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
  const [isInverted, setIsInverted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0] && onReplaceImage) {
      onReplaceImage(image.id, e.dataTransfer.files[0]);
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
            <div className="text-[11px] text-slate-500 font-mono">
              Blind Clinical Assessment • Ovarian Morphology
            </div>
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

          {evaluation?.evaluatedAt && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-50 text-emerald-900 border border-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Autosaved</span>
            </span>
          )}

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
        <div className="lg:col-span-5 bg-[#F8FAFC] p-4 sm:p-5 flex flex-col justify-between gap-3 min-w-0">
          
          {/* Medical Ultrasound Console Monitor Frame */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative flex-1 w-full bg-[#080C14] rounded-2xl border-2 border-black flex flex-col overflow-hidden group select-none shadow-neo-sm transition-all ${
              isDragging ? 'ring-4 ring-[#9CDBFA] border-[#9CDBFA]' : ''
            }`}
          >
            {/* Top Telemetry Console Bar */}
            <div className="bg-[#0e1524] px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#84CC16] animate-pulse" />
                <span className="font-bold text-white tracking-wider">ULTRASOUND VIEWPORT</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-slate-400">7.5 MHz</span>
                <span className="text-[#9CDBFA] bg-[#9CDBFA]/10 px-2 py-0.5 rounded border border-[#9CDBFA]/30 font-bold">
                  BLIND EVAL
                </span>
              </div>
            </div>

            {/* Sonogram Screen / Active Area */}
            <div className="relative flex-1 min-h-[320px] sm:min-h-[360px] flex items-center justify-center p-3 bg-black overflow-hidden">
              {/* Sector Beam & Radar Graticule Background */}
              <svg
                className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
                viewBox="0 0 400 300"
                preserveAspectRatio="xMidYMid meet"
              >
                <path d="M 200 10 L 385 290 A 310 310 0 0 1 15 290 Z" fill="none" stroke="#9CDBFA" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx="200" cy="10" r="100" fill="none" stroke="#9CDBFA" strokeWidth="0.5" strokeDasharray="2 4" />
                <circle cx="200" cy="10" r="190" fill="none" stroke="#9CDBFA" strokeWidth="0.5" strokeDasharray="2 4" />
                <circle cx="200" cy="10" r="280" fill="none" stroke="#9CDBFA" strokeWidth="0.5" strokeDasharray="2 4" />
                <line x1="200" y1="10" x2="200" y2="290" stroke="#9CDBFA" strokeWidth="0.5" strokeDasharray="2 4" />
              </svg>

              {image.imageUrl ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={image.imageUrl}
                    alt={`Scan ${image.id}`}
                    style={{ filter: isInverted ? 'invert(1) hue-rotate(180deg)' : 'none' }}
                    className="max-h-[360px] w-full object-contain cursor-pointer transition-all duration-150"
                    onClick={() => onOpenLightbox(image)}
                  />

                  {/* 10 mm Caliper Scale in Sky Blue */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-black/85 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-slate-700 text-[10px] font-mono text-white pointer-events-none shadow-sm">
                    <span className="w-5 h-0.5 bg-[#9CDBFA] inline-block shadow-[0_0_6px_#9CDBFA]" />
                    <span className="text-[#9CDBFA] font-bold">10 mm</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-300">Caliper</span>
                  </div>

                  {/* Floating Action Controls (Invert + Enlarge) */}
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => setIsInverted((v) => !v)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border-2 border-black shadow-neo-sm transition flex items-center gap-1 ${
                        isInverted
                          ? 'bg-[#9CDBFA] text-black font-black'
                          : 'bg-white text-black hover:bg-slate-100'
                      }`}
                      title="Toggle Invert / Negative Contrast (useful for follicle boundary inspection)"
                    >
                      <span>{isInverted ? 'Normal' : 'Invert'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenLightbox(image)}
                      className="p-1.5 rounded-lg bg-white text-black border-2 border-black shadow-neo-sm hover:bg-[#9CDBFA] transition"
                      title="View in full-resolution lightbox"
                    >
                      <Maximize2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Watermark badge top left */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 border border-slate-800 text-[9px] font-mono text-slate-400 pointer-events-none">
                    {image.id}
                  </div>
                </div>
              ) : (
                /* Interactive Standby & Dropzone */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-full flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-white/[0.04] transition-colors rounded-xl border border-dashed border-slate-700 hover:border-[#9CDBFA] group/empty"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#9CDBFA] border-2 border-black shadow-neo-sm flex items-center justify-center mb-3 group-hover/empty:scale-105 group-hover/empty:bg-[#82CDF6] transition-transform">
                    <FileImage className="w-7 h-7 text-black stroke-[2]" />
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm font-black text-white flex items-center justify-center gap-1.5">
                      <span>Scan Slot #{slotIndex}</span>
                      <span className="text-[10px] font-mono text-[#9CDBFA] px-1.5 py-0.5 rounded bg-[#9CDBFA]/10 border border-[#9CDBFA]/30">
                        Standby
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium max-w-[240px]">
                      Drag & drop ultrasound scan here, or click to browse
                    </p>
                  </div>

                  <button
                    type="button"
                    className="mt-4 px-4 py-1.5 rounded-full text-xs font-black bg-[#9CDBFA] hover:bg-[#82CDF6] text-black border-2 border-black shadow-neo-sm transition active:translate-x-0.5 active:translate-y-0.5"
                  >
                    Select Scan Image
                  </button>

                  <div className="mt-2 text-[10px] font-mono text-slate-500">
                    PNG • JPG • WEBP • DICOM
                  </div>
                </div>
              )}
            </div>

            {/* Console Screen Footer Status */}
            <div className="bg-[#0e1524] px-3.5 py-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="text-slate-300">
                {image.imageUrl ? 'ANONYMIZED CLINICAL DATA' : 'AWAITING SCAN UPLOAD'}
              </span>
              <span className="text-slate-500">10 mm CALIPER REF</span>
            </div>
          </div>

          {/* Bottom Bar: Clean Quick Actions in White Card */}
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 bg-white p-3 rounded-2xl border-2 border-black shadow-neo-sm">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-black font-black bg-[#FAF9F6] px-2 py-0.5 rounded-lg border border-black/20">
                Scan #{globalIndex}
              </span>
              <span className="text-slate-600 font-medium text-[11px]">
                {image.imageUrl ? 'Ready for evaluation' : 'Empty slot'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {image.imageUrl ? (
                <>
                  <button
                    type="button"
                    onClick={() => onOpenLightbox(image)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black text-black bg-[#FAF9F6] hover:bg-[#9CDBFA] border border-black shadow-neo-sm transition"
                  >
                    <Maximize2 className="w-3 h-3 stroke-[2.5]" />
                    <span>Lightbox</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black text-black bg-white hover:bg-slate-100 border border-black shadow-neo-sm transition"
                  >
                    <Upload className="w-3 h-3 stroke-[2.5]" />
                    <span>Replace</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black text-black bg-[#9CDBFA] hover:bg-[#82CDF6] border border-black shadow-neo-sm transition"
                >
                  <Upload className="w-3 h-3 stroke-[2.5]" />
                  <span>Upload Image</span>
                </button>
              )}
            </div>
          </div>

        </div>

        {/* ================= RIGHT: THE 4 STANDARDIZED QUESTIONS (7 cols) ================= */}
        <div className="lg:col-span-7 p-5 sm:p-7 space-y-6 bg-white min-w-0">
          
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
                    className={`group relative py-3 px-3 rounded-2xl border-2 border-black text-xs sm:text-sm font-black transition-all duration-150 flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      isSelected
                        ? option === 'Real'
                          ? 'bg-[#86EFAC] text-black shadow-neo translate-x-0.5 translate-y-0.5 ring-2 ring-emerald-500/30'
                          : option === 'Synthetic'
                          ? 'bg-[#9CDBFA] text-black shadow-neo translate-x-0.5 translate-y-0.5 ring-2 ring-sky-500/30'
                          : 'bg-[#FEF08A] text-black shadow-neo translate-x-0.5 translate-y-0.5 ring-2 ring-amber-500/30'
                        : option === 'Real'
                        ? 'bg-white text-slate-900 hover:bg-emerald-50 hover:border-black hover:-translate-y-0.5 hover:shadow-neo active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shadow-neo-sm'
                        : option === 'Synthetic'
                        ? 'bg-white text-slate-900 hover:bg-sky-50 hover:border-black hover:-translate-y-0.5 hover:shadow-neo active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shadow-neo-sm'
                        : 'bg-white text-slate-900 hover:bg-amber-50 hover:border-black hover:-translate-y-0.5 hover:shadow-neo active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shadow-neo-sm'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      {option}
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </span>
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
                      className={`py-2.5 rounded-xl border-2 border-black text-sm font-black transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? 'bg-[#9CDBFA] text-black shadow-neo translate-x-0.5 translate-y-0.5 ring-2 ring-sky-500/40'
                          : 'bg-white text-black hover:bg-[#EBF7FD] hover:border-black hover:-translate-y-1 hover:shadow-neo hover:scale-105 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shadow-neo-sm'
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
                      className={`py-2.5 rounded-xl border-2 border-black text-sm font-black transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? 'bg-[#F59E0B] text-black shadow-neo translate-x-0.5 translate-y-0.5 ring-2 ring-amber-500/40'
                          : 'bg-white text-black hover:bg-amber-100 hover:border-black hover:-translate-y-1 hover:shadow-neo hover:scale-105 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shadow-neo-sm'
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
                      className={`py-2.5 rounded-xl border-2 border-black text-sm font-black transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? 'bg-[#9CDBFA] text-black shadow-neo translate-x-0.5 translate-y-0.5 ring-2 ring-sky-500/40'
                          : 'bg-white text-black hover:bg-[#EBF7FD] hover:border-black hover:-translate-y-1 hover:shadow-neo hover:scale-105 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shadow-neo-sm'
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
