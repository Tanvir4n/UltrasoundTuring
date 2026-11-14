'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { UltrasoundImageItem } from '../types/evaluation';

interface ImageLightboxModalProps {
  image: UltrasoundImageItem | null;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  image,
  onClose,
}) => {
  const [isInverted, setIsInverted] = useState(false);

  if (!image) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="relative max-w-4xl w-full bg-white border-2 border-black rounded-3xl shadow-neo-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-[#FAF9F6] border-b-2 border-black px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="bg-[#9CDBFA] text-black border-2 border-black rounded-xl px-3 py-1 font-black text-xs shadow-neo-sm">
              {image.id}
            </span>
            <div>
              <span className="font-extrabold text-sm text-black block">
                High-Resolution Ultrasound Inspection
              </span>
              {image.fileName && (
                <span className="text-[11px] font-mono text-slate-500">
                  {image.fileName}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsInverted((v) => !v)}
              className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold border-2 border-black shadow-neo-sm transition flex items-center gap-1 ${
                isInverted 
                  ? 'bg-[#9CDBFA] text-black font-black' 
                  : 'bg-white text-black hover:bg-slate-100'
              }`}
            >
              <span>{isInverted ? 'Normal Contrast' : 'Invert View'}</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border-2 border-black shadow-neo-sm flex items-center justify-center text-black font-black transition active:translate-x-0.5 active:translate-y-0.5"
              title="Close"
            >
              <X className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Ultrasound Inspection Screen */}
        <div className="relative bg-black p-4 sm:p-6 flex items-center justify-center min-h-[50vh] max-h-[75vh] overflow-hidden select-none">
          <img
            src={image.imageUrl}
            alt={image.id}
            style={{ filter: isInverted ? 'invert(1) hue-rotate(180deg)' : 'none' }}
            className="max-w-full max-h-[70vh] object-contain rounded-xl border border-slate-800 transition-all"
          />

          {/* 10 mm Caliper Scale Overlay */}
          <div className="absolute bottom-4 left-6 flex items-center gap-2 bg-black/85 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-mono text-white pointer-events-none shadow-sm">
            <span className="w-6 h-0.5 bg-[#9CDBFA] inline-block shadow-[0_0_6px_#9CDBFA]" />
            <span className="text-[#9CDBFA] font-bold">10 mm Caliper</span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#FAF9F6] border-t-2 border-black px-6 py-3 flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>Click anywhere outside or the Close button to return to evaluation</span>
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-full bg-[#9CDBFA] hover:bg-[#82CDF6] text-black font-black border-2 border-black shadow-neo-sm transition active:translate-x-0.5 active:translate-y-0.5"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
