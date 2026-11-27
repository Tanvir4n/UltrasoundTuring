'use client';

import React, { useRef, useState } from 'react';
import { 
  Upload, 
  Download, 
  RefreshCw, 
  Trash2, 
  HelpCircle,
  FileSpreadsheet,
  FileJson,
  CheckCircle,
  Sparkles,
  ArrowRight,
  Activity,
  Layers,
  BarChart3,
  ShieldCheck
} from 'lucide-react';

interface HeaderHeroProps {
  expertId: string;
  setExpertId: (id: string) => void;
  experienceTier?: string;
  setExperienceTier?: (tier: string) => void;
  totalImages: number;
  totalEvaluated: number;
  onUploadFiles: (files: FileList) => void;
  onRefreshFolder: () => void;
  onClearImages: () => void;
  onExportCSV: () => void;
  onExportJSON?: () => void;
  onScrollToSlots: () => void;
  onOpenAnalytics?: () => void;
  onOpenGroundTruthManager?: () => void;
}

export const HeaderHero: React.FC<HeaderHeroProps> = ({
  expertId,
  setExpertId,
  experienceTier = 'Senior (>10 yrs)',
  setExperienceTier,
  totalImages,
  totalEvaluated,
  onUploadFiles,
  onRefreshFolder,
  onClearImages,
  onExportCSV,
  onExportJSON,
  onScrollToSlots,
  onOpenAnalytics,
  onOpenGroundTruthManager,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFiles(e.target.files);
    }
  };

  const progressPercent = totalImages > 0 ? Math.round((totalEvaluated / totalImages) * 100) : 0;

  return (
    <div className="w-full bg-[#fbfbf9] bg-grid-pattern border-b-2 border-black">
      
      {/* 1. TOP NAVBAR (Matching CreateMyTest Navbar with Sky Blue Accent) */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between border-b border-black/10">
        
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#9CDBFA] border-2 border-black shadow-neo-sm flex items-center justify-center text-black font-black text-lg">
            U
          </div>
          <span className="font-extrabold text-xl tracking-tight text-black">
            Ultrasound<span className="text-[#0284c7]">Turing</span>
          </span>
        </div>

        {/* Center Nav Links */}
        <div className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-800">
          <button 
            type="button" 
            onClick={onScrollToSlots} 
            className="hover:text-[#0284c7] transition"
          >
            10-Slot Form
          </button>
          <a href="#questions-overview" className="hover:text-[#0284c7] transition">
            Evaluation Criteria
          </a>
          <button 
            type="button" 
            onClick={onRefreshFolder}
            className="hover:text-[#0284c7] transition flex items-center gap-1"
          >
            Folder Sync
          </button>
          {onOpenAnalytics && (
            <button
              type="button"
              onClick={onOpenAnalytics}
              className="hover:text-[#0284c7] transition flex items-center gap-1 text-black font-black"
            >
              <BarChart3 className="w-4 h-4 stroke-[2.5] text-[#84CC16]" />
              <span>Live Analytics</span>
            </button>
          )}
          <button 
            type="button" 
            onClick={onExportCSV} 
            className="hover:text-[#0284c7] transition"
          >
            Export Results
          </button>
        </div>

        {/* Right Action Pill Buttons */}
        <div className="flex items-center gap-2.5">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {onOpenGroundTruthManager && (
            <button
              type="button"
              onClick={onOpenGroundTruthManager}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-black bg-white hover:bg-slate-50 hover:-translate-y-0.5 hover:shadow-neo text-black border-2 border-black shadow-neo-sm transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
              title="Configure Ground Truth (Real vs Synthetic) labels"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Ground Truth</span>
            </button>
          )}

          {onOpenAnalytics && (
            <button
              type="button"
              onClick={onOpenAnalytics}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-black bg-[#84CC16] hover:bg-[#65a30d] hover:-translate-y-0.5 hover:shadow-neo text-black border-2 border-black shadow-neo-sm transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Analytics</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2 rounded-full text-xs sm:text-sm font-black bg-[#9CDBFA] hover:bg-[#82CDF6] hover:-translate-y-0.5 hover:shadow-neo text-black border-2 border-black shadow-neo-sm transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
          >
            Upload Scans
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setDownloadMenuOpen((prev) => !prev)}
              className="px-4 py-2 rounded-full text-xs sm:text-sm font-bold bg-white hover:bg-slate-50 hover:-translate-y-0.5 hover:shadow-neo text-black border-2 border-black shadow-neo-sm transition-all duration-150 flex items-center gap-1 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
            >
              <span>Download</span>
              <span className="text-[10px]">▼</span>
            </button>

            {downloadMenuOpen && (
              <div
                onMouseLeave={() => setDownloadMenuOpen(false)}
                className="absolute right-0 mt-2 w-60 bg-white border-2 border-black rounded-2xl shadow-neo-md z-50 overflow-hidden py-1.5"
              >
                <div className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  Local Session File
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDownloadMenuOpen(false);
                    onExportCSV();
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-black hover:bg-[#84CC16]/30 flex items-center gap-2 transition"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Save Session CSV (.csv)</span>
                </button>
                {onExportJSON && (
                  <button
                    type="button"
                    onClick={() => {
                      setDownloadMenuOpen(false);
                      onExportJSON();
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-black hover:bg-[#FEF08A]/50 flex items-center gap-2 transition"
                  >
                    <FileJson className="w-3.5 h-3.5 text-amber-700" />
                    <span>Save Session JSON (.json)</span>
                  </button>
                )}

                <div className="px-3.5 py-1.5 mt-1 text-[10px] font-black uppercase tracking-wider text-slate-400 border-t border-b border-slate-100">
                  Master Server Storage
                </div>
                <a
                  href="/api/responses?format=csv"
                  download
                  onClick={() => setDownloadMenuOpen(false)}
                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-black hover:bg-[#9CDBFA]/40 flex items-center gap-2 transition"
                >
                  <Download className="w-3.5 h-3.5 text-[#0284c7]" />
                  <span>Master Server CSV (.csv)</span>
                </a>
                <a
                  href="/api/responses?format=json"
                  download
                  onClick={() => setDownloadMenuOpen(false)}
                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-black hover:bg-[#9CDBFA]/40 flex items-center gap-2 transition"
                >
                  <Download className="w-3.5 h-3.5 text-[#0284c7]" />
                  <span>Master Server JSON (.json)</span>
                </a>
              </div>
            )}
          </div>
        </div>

      </nav>

      {/* 2. HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Hero Content */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Main Headline with Blue Rounded Highlight Box */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-black leading-tight tracking-tight">
                Evaluating{' '}
                <span className="relative inline-block bg-[#9CDBFA] text-black px-3 py-1 rounded-2xl border-2 border-black shadow-neo-sm mx-1">
                  Diffusion-Based
                </span>{' '}
                Synthetic Ultrasound Data
              </h1>

              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800">
                For Ovarian Morphology Classification: CNN–Vision Transformer Fusion &amp; Bidirectional Cross-Domain Generalization
              </h2>
            </div>

            {/* Description */}
            <p className="text-base text-slate-700 leading-relaxed max-w-xl font-medium">
              Standardized expert questionnaire for blind real vs. synthetic ovarian ultrasound evaluation. 
              Assess anatomical realism, follicle contours, and latent diffusion artifacts across <strong>10 scans per page across 10 pages (100 total scans)</strong>.
            </p>

            {/* Action Buttons & Observer ID */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onScrollToSlots}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-black bg-[#9CDBFA] hover:bg-[#82CDF6] hover:-translate-y-0.5 hover:shadow-neo-md text-black border-2 border-black shadow-neo transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
              >
                <span>Start Assessment</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>

              {onOpenAnalytics && (
                <button
                  type="button"
                  onClick={onOpenAnalytics}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-black bg-[#84CC16] hover:bg-[#65a30d] hover:-translate-y-0.5 hover:shadow-neo-md text-black border-2 border-black shadow-neo transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
                >
                  <BarChart3 className="w-4 h-4 stroke-[2.5]" />
                  <span>Live Analytics</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-5 py-3 rounded-full text-sm font-extrabold bg-white hover:bg-slate-50 hover:-translate-y-0.5 hover:shadow-neo-md text-black border-2 border-black shadow-neo transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Images</span>
                <span className="text-[10px]">▼</span>
              </button>
            </div>

            {/* Expert ID & Subtext */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 pt-2">
              <div className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Double-blind clinical study protocol</span>
              </div>

              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border-2 border-black shadow-neo-sm">
                <span className="text-black">Expert ID:</span>
                <input
                  type="text"
                  value={expertId}
                  onChange={(e) => setExpertId(e.target.value)}
                  placeholder="e.g. Rad-01"
                  className="bg-transparent text-black font-mono font-bold focus:outline-none w-24 text-xs placeholder-slate-400"
                />
              </div>

              {setExperienceTier && (
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border-2 border-black shadow-neo-sm">
                  <span className="text-black">Role:</span>
                  <select
                    value={experienceTier}
                    onChange={(e) => setExperienceTier(e.target.value)}
                    className="bg-transparent text-black font-bold focus:outline-none text-xs cursor-pointer"
                  >
                    <option value="Senior (>10 yrs)">Senior (&gt;10 yrs)</option>
                    <option value="Specialist (5–10 yrs)">Specialist (5–10 yrs)</option>
                    <option value="Resident (<5 yrs)">Resident (&lt;5 yrs)</option>
                    <option value="Researcher / Other">Researcher / Other</option>
                  </select>
                </div>
              )}

              {totalImages > 0 && (
                <div className="text-slate-800 font-mono">
                  Progress: <strong>{totalEvaluated}/{totalImages}</strong> ({progressPercent}%)
                </div>
              )}
            </div>

          </div>

          {/* Right Hero Visual Card in Sky Blue Background */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            {/* Big Featured Illustration Card (in Sky Blue #9CDBFA) */}
            <div className="relative w-full max-w-sm rounded-[2.5rem] bg-[#9CDBFA] border-2 border-black shadow-neo-lg p-5 overflow-hidden">
              
              {/* Internal Mockup Frame */}
              <div className="bg-black rounded-2xl border-2 border-black p-4 space-y-3 text-white select-none">
                
                {/* Header Tag */}
                <div className="flex items-center justify-between text-[11px] font-mono border-b border-slate-800 pb-2">
                  <span className="text-[#9CDBFA] font-bold">SONOGRAM PREVIEW</span>
                  <span className="text-slate-400">10 mm SCALE</span>
                </div>

                {/* Ultrasound Screen Simulator */}
                <div className="relative aspect-[4/3] w-full rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
                  <svg viewBox="0 0 200 150" className="w-full h-full">
                    {/* Sector probe FOV */}
                    <path d="M 100 10 L 190 140 A 150 150 0 0 1 10 140 Z" fill="#0c1218" stroke="#1e293b" strokeWidth="1" />
                    {/* Ovarian stroma */}
                    <ellipse cx="100" cy="85" rx="55" ry="38" fill="#24303c" stroke="#475569" strokeWidth="1.5" />
                    {/* Follicles */}
                    <circle cx="80" cy="75" r="10" fill="#04070a" stroke="#334155" strokeWidth="1" />
                    <circle cx="115" cy="70" r="12" fill="#04070a" stroke="#334155" strokeWidth="1" />
                    <circle cx="100" cy="100" r="9" fill="#04070a" stroke="#334155" strokeWidth="1" />
                    <circle cx="130" cy="95" r="7" fill="#04070a" stroke="#334155" strokeWidth="1" />
                    {/* 10mm tick */}
                    <line x1="20" y1="135" x2="50" y2="135" stroke="#9CDBFA" strokeWidth="2" />
                    <text x="55" y="138" fill="#9CDBFA" fontSize="8" fontFamily="monospace">10mm</text>
                  </svg>

                  <div className="absolute top-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[9px] font-mono text-[#9CDBFA] border border-black">
                    BLIND ASSESSMENT
                  </div>
                </div>

                {/* Mini Card Footer */}
                <div className="flex items-center justify-between text-xs pt-1 font-semibold">
                  <span className="text-slate-200">10 Images / Page</span>
                  <span className="bg-[#84CC16] text-black px-2 py-0.5 rounded-lg border-2 border-black text-[10px] font-bold">
                    Q1–Q4 Standalone
                  </span>
                </div>

              </div>

              {/* Bottom Card Caption */}
              <div className="mt-3 text-center text-xs font-black text-black">
                Transvaginal Ovarian Morphology Benchmark
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* 3. KIND OF QUIZZES / QUESTIONS SECTION */}
      <section id="questions-overview" className="max-w-7xl mx-auto px-4 sm:px-8 py-10 border-t-2 border-black/10">
        
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
            Kind of Evaluation Questions
          </h2>
          <p className="text-sm text-slate-600 font-medium">
            Each of the 10 image slots per page features these four standardized criteria from the paper protocol.
          </p>
        </div>

        {/* 2x2 Grid of Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Card 1: Q1. Image Classification (Sky Blue Icon #9CDBFA) */}
          <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 transition flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#9CDBFA] border-2 border-black shadow-neo-sm shrink-0 flex items-center justify-center text-black font-black text-lg">
              ?
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-black">
                Q1. Image Classification (Turing Test)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                In your expert opinion, is this image a real clinical ultrasound image or a synthetic-generated image?
              </p>
              <div className="text-[11px] font-bold text-[#0284c7] pt-1">
                Options: Real • Synthetic • Uncertain
              </div>
            </div>
          </div>

          {/* Card 2: Q2. Anatomical Realism (Lime Green Icon) */}
          <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 transition flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#84CC16] border-2 border-black shadow-neo-sm shrink-0 flex items-center justify-center text-black font-black text-lg">
              👁️
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-black">
                Q2. Anatomical Realism (1 to 5)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                How realistic and anatomically plausible are the ovarian structures and visible follicles in this image?
              </p>
              <div className="text-[11px] font-bold text-[#84CC16] pt-1">
                Scale: 1 (Very unrealistic) to 5 (Highly realistic)
              </div>
            </div>
          </div>

          {/* Card 3: Q3. Image Artifacts (Amber / Gold Icon) */}
          <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 transition flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#F59E0B] border-2 border-black shadow-neo-sm shrink-0 flex items-center justify-center text-black font-black text-lg">
              ⚡
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-black">
                Q3. Image Artifacts (1 to 5)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                To what extent do you observe artificial patterns, distortions, or unusual structures in this image?
              </p>
              <div className="text-[11px] font-bold text-[#F59E0B] pt-1">
                Scale: 1 (No noticeable artifacts) to 5 (Severe artifacts)
              </div>
            </div>
          </div>

          {/* Card 4: Q4. Clinical Plausibility (Sky Blue Icon #9CDBFA) */}
          <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 transition flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#9CDBFA] border-2 border-black shadow-neo-sm shrink-0 flex items-center justify-center text-black font-black text-lg">
              📋
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-black">
                Q4. Overall Clinical Plausibility (1 to 5)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                How closely does this image resemble a genuine clinical ovarian ultrasound image?
              </p>
              <div className="text-[11px] font-bold text-[#0284c7] pt-1">
                Scale: 1 (Not at all) to 5 (Extremely closely)
              </div>
            </div>
          </div>

        </div>

      </section>

    </div>
  );
};
