'use client';

import React, { useRef, useState } from 'react';
import { X, Upload, Sparkles, Check, RefreshCw, Layers, ShieldCheck, AlertCircle } from 'lucide-react';
import { UltrasoundImageItem, GroundTruthType } from '../types/evaluation';

interface GroundTruthManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: UltrasoundImageItem[];
  onUpdateImages: (updated: UltrasoundImageItem[]) => void;
  onBulkUpload: (files: FileList) => void;
}

export const GroundTruthManagerModal: React.FC<GroundTruthManagerModalProps> = ({
  isOpen,
  onClose,
  images,
  onUpdateImages,
  onBulkUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  // Auto-detect ground truth based on file/ID naming conventions
  const handleAutoDetect = () => {
    const updated = images.map((img) => {
      const name = (img.fileName || img.id).toLowerCase();
      let gt: GroundTruthType = img.groundTruth || 'Unknown';

      if (name.includes('real') || name.includes('orig') || name.includes('clinical') || name.includes('patient')) {
        gt = 'Real';
      } else if (
        name.includes('syn') ||
        name.includes('fake') ||
        name.includes('diff') ||
        name.includes('gen') ||
        name.includes('ai')
      ) {
        gt = 'Synthetic';
      }

      return { ...img, groundTruth: gt };
    });

    onUpdateImages(updated);
  };

  // Toggle individual scan ground truth
  const handleToggleGt = (id: string, newGt: GroundTruthType) => {
    const updated = images.map((img) => (img.id === id ? { ...img, groundTruth: newGt } : img));
    onUpdateImages(updated);
  };

  // Bulk set all loaded images
  const handleBulkSet = (gt: GroundTruthType) => {
    const updated = images.map((img) => (img.imageUrl ? { ...img, groundTruth: gt } : img));
    onUpdateImages(updated);
  };

  // Alternate 50/50
  const handleAlternate = () => {
    let flip = true;
    const updated = images.map((img) => {
      if (!img.imageUrl) return img;
      const gt: GroundTruthType = flip ? 'Real' : 'Synthetic';
      flip = !flip;
      return { ...img, groundTruth: gt };
    });
    onUpdateImages(updated);
  };

  const realCount = images.filter((i) => i.groundTruth === 'Real').length;
  const synCount = images.filter((i) => i.groundTruth === 'Synthetic').length;
  const unknownCount = images.filter((i) => !i.groundTruth || i.groundTruth === 'Unknown').length;

  const filteredImages = images.filter((i) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return i.id.toLowerCase().includes(s) || (i.fileName || '').toLowerCase().includes(s);
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-white border-2 border-black rounded-3xl shadow-neo-lg overflow-hidden flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#FAF9F6] border-b-2 border-black px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#9CDBFA] text-black border-2 border-black shadow-neo-sm flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg sm:text-xl text-black">
                  Scan Manager &amp; Ground Truth Setup
                </h3>
                <span className="bg-[#FEF08A] text-black border-2 border-black px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-neo-sm">
                  Admin Setup
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Assign Real vs. Synthetic labels to images. Labels remain strictly hidden from evaluators.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white hover:bg-slate-100 border-2 border-black shadow-neo-sm flex items-center justify-center text-black font-black transition active:translate-x-0.5 active:translate-y-0.5"
            title="Close"
          >
            <X className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-7 space-y-6 overflow-y-auto flex-1 bg-[#FBFBF9]">
          
          {/* 1. Quick Stats Banner & Actions */}
          <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-neo-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs font-mono font-bold">
              <span className="bg-[#86EFAC] text-black border border-black px-2.5 py-1 rounded-xl">
                Real: {realCount}
              </span>
              <span className="bg-[#9CDBFA] text-black border border-black px-2.5 py-1 rounded-xl">
                Synthetic: {synCount}
              </span>
              <span className="bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-1 rounded-xl">
                Untagged: {unknownCount}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    onBulkUpload(e.target.files);
                  }
                }}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-[#9CDBFA] hover:bg-[#82CDF6] text-black border-2 border-black shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Images</span>
              </button>

              <button
                type="button"
                onClick={handleAutoDetect}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-white hover:bg-slate-50 text-black border-2 border-black shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5"
                title="Detect 'real' or 'syn' keywords in file names"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Auto-Detect from Names</span>
              </button>

              <button
                type="button"
                onClick={handleAlternate}
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-white hover:bg-slate-50 text-slate-800 border-2 border-black shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5"
                title="Alternate 50% Real and 50% Synthetic"
              >
                Alternate 50/50
              </button>
            </div>
          </div>

          {/* 2. Slot Ground Truth Table */}
          <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-neo-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h4 className="font-black text-sm text-black">
                Slot Assignment &amp; Ground Truth Mapping ({images.length} slots)
              </h4>

              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search scan ID or file name..."
                className="px-3 py-1.5 text-xs font-medium border-2 border-black rounded-xl bg-white focus:outline-none shadow-neo-sm w-full sm:w-64"
              />
            </div>

            <div className="overflow-x-auto max-h-80 border-2 border-black rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#FAF9F6] border-b-2 border-black sticky top-0 font-black">
                  <tr>
                    <th className="p-2.5">Slot</th>
                    <th className="p-2.5">Preview</th>
                    <th className="p-2.5">Scan ID</th>
                    <th className="p-2.5">File Name</th>
                    <th className="p-2.5 text-center">Set Ground Truth</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono font-medium">
                  {filteredImages.map((img, idx) => {
                    const gt = img.groundTruth || 'Unknown';
                    const hasImage = Boolean(img.imageUrl);

                    return (
                      <tr key={img.id || idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-black text-black">#{idx + 1}</td>
                        <td className="p-2.5">
                          {hasImage ? (
                            <img
                              src={img.imageUrl}
                              alt={img.id}
                              className="w-9 h-9 object-cover rounded-lg border border-black bg-black"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg border border-dashed border-slate-400 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                              Empty
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 font-bold text-black">{img.id}</td>
                        <td className="p-2.5 text-slate-600 truncate max-w-xs">
                          {img.fileName || (hasImage ? 'Custom upload' : 'Awaiting image')}
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="inline-flex items-center gap-1.5 bg-[#FAF9F6] p-1 rounded-xl border border-black">
                            <button
                              type="button"
                              onClick={() => handleToggleGt(img.id, 'Real')}
                              className={`px-3 py-1 rounded-lg text-xs font-black transition ${
                                gt === 'Real'
                                  ? 'bg-[#86EFAC] text-black shadow-neo-sm scale-105'
                                  : 'bg-white text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              Real
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleGt(img.id, 'Synthetic')}
                              className={`px-3 py-1 rounded-lg text-xs font-black transition ${
                                gt === 'Synthetic'
                                  ? 'bg-[#9CDBFA] text-black shadow-neo-sm scale-105'
                                  : 'bg-white text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              Synthetic
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleGt(img.id, 'Unknown')}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                                gt === 'Unknown'
                                  ? 'bg-slate-800 text-white shadow-neo-sm'
                                  : 'bg-white text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              Clear
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-[#FAF9F6] border-t-2 border-black px-6 py-3.5 flex items-center justify-between">
          <span className="text-xs text-slate-600 font-medium">
            Changes auto-saved to session state.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-full text-xs font-black bg-[#9CDBFA] hover:bg-[#82CDF6] text-black border-2 border-black shadow-neo-sm transition active:translate-x-0.5 active:translate-y-0.5"
          >
            Done &amp; Return to Test
          </button>
        </div>
      </div>
    </div>
  );
};
