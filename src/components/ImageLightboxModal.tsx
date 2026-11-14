'use client';

import React from 'react';
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
  if (!image) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="relative max-w-4xl w-full bg-white border-2 border-black rounded-3xl shadow-neo-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-[#FAF9F6] border-b-2 border-black px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-[#9CDBFA] text-black border-2 border-black rounded-xl px-3 py-1 font-black text-xs shadow-neo-sm">
              {image.id}
            </span>
            <span className="font-bold text-sm text-black">
              High-Resolution Ultrasound Inspection
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border-2 border-black shadow-neo-sm flex items-center justify-center text-black font-black transition active:translate-x-0.5 active:translate-y-0.5"
            title="Close"
          >
            <X className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* Ultrasound Inspection Screen */}
        <div className="bg-black p-4 sm:p-6 flex items-center justify-center min-h-[50vh] max-h-[75vh] overflow-auto">
          <img
            src={image.imageUrl}
            alt={image.id}
            className="max-w-full max-h-[70vh] object-contain rounded-xl border border-slate-800"
          />
        </div>

        {/* Footer */}
        <div className="bg-[#FAF9F6] border-t-2 border-black px-6 py-3 flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>Click anywhere outside or the X button to return to evaluation</span>
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
