'use client';

import React, { useState } from 'react';
import { X, Download, BarChart3, CheckCircle2, AlertTriangle, Sparkles, HelpCircle, Layers } from 'lucide-react';
import { UltrasoundImageItem, ImageEvaluationResponse, RealtimeMetrics } from '../types/evaluation';
import { calculateRealtimeMetrics, exportEvaluationsToCSV, exportEvaluationsToJSON } from '../utils/metrics';

interface AnalyticsDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: UltrasoundImageItem[];
  evaluations: Record<string, ImageEvaluationResponse>;
  expertId: string;
  onOpenGroundTruthManager: () => void;
}

export const AnalyticsDashboardModal: React.FC<AnalyticsDashboardModalProps> = ({
  isOpen,
  onClose,
  images,
  evaluations,
  expertId,
  onOpenGroundTruthManager,
}) => {
  const [filter, setFilter] = useState<'all' | 'fooled' | 'correct' | 'uncertain' | 'real' | 'synthetic'>('all');

  if (!isOpen) return null;

  const metrics: RealtimeMetrics = calculateRealtimeMetrics(images, evaluations);

  // Check how many scans have known Ground Truth
  const knownGtCount = images.filter(
    (i) => i.groundTruth === 'Real' || i.groundTruth === 'Synthetic'
  ).length;

  const evaluatedWithGt = images.filter(
    (i) => (i.groundTruth === 'Real' || i.groundTruth === 'Synthetic') && evaluations[i.id]?.q1_classification != null
  ).length;

  // Filter evaluated scans for breakdown table
  const filteredScans = images.filter((img) => {
    const e = evaluations[img.id];
    if (!e || e.q1_classification == null) return false;
    const gt = img.groundTruth || 'Unknown';

    if (filter === 'fooled') return gt === 'Synthetic' && e.q1_classification === 'Real';
    if (filter === 'correct') return gt !== 'Unknown' && e.q1_classification === gt;
    if (filter === 'uncertain') return e.q1_classification === 'Uncertain';
    if (filter === 'real') return gt === 'Real';
    if (filter === 'synthetic') return gt === 'Synthetic';
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full bg-white border-2 border-black rounded-3xl shadow-neo-lg overflow-hidden flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-[#FAF9F6] border-b-2 border-black px-5 sm:px-7 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#9CDBFA] text-black border-2 border-black shadow-neo-sm flex items-center justify-center">
              <BarChart3 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg sm:text-xl text-black">
                  Expert Evaluation Analytics
                </h3>
                <span className="bg-[#84CC16] text-black border-2 border-black px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-neo-sm">
                  Live Calculation
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Observer ID: <strong className="text-black font-mono">{expertId || 'Anonymous'}</strong> • Real-time scientific Turing test telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportEvaluationsToCSV(images, evaluations, expertId)}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black bg-[#84CC16] hover:bg-[#65a30d] text-black border-2 border-black shadow-neo-sm hover:-translate-y-0.5 hover:shadow-neo transition-all active:translate-x-0.5 active:translate-y-0.5"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white hover:bg-slate-100 border-2 border-black shadow-neo-sm flex items-center justify-center text-black font-black transition active:translate-x-0.5 active:translate-y-0.5"
              title="Close"
            >
              <X className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Ground Truth Warning Pill if not set */}
        {knownGtCount === 0 && (
          <div className="bg-[#FEF08A] px-5 sm:px-7 py-2.5 border-b-2 border-black flex items-center justify-between gap-3 text-xs font-bold text-black">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 stroke-[2.5] text-amber-700 shrink-0" />
              <span>
                Images currently do not have Ground Truth (Real vs Synthetic) tagged. Accuracy and Fooling Rate require Ground Truth labels.
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenGroundTruthManager}
              className="px-3 py-1 bg-white border-2 border-black rounded-lg text-xs font-black shadow-neo-sm hover:bg-[#9CDBFA] transition shrink-0"
            >
              Configure Ground Truth →
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-7 space-y-6 overflow-y-auto flex-1 bg-[#FBFBF9]">
          
          {/* 1. Core Real-Time KPI Cards (User Specified A, B, C, D) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* A. Classification Accuracy */}
            <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-neo-sm flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Classification Accuracy
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-black">
                    {metrics.decisiveAccuracy != null ? `${metrics.decisiveAccuracy}%` : '--%'}
                  </span>
                  <span className="text-xs font-mono text-slate-500 font-bold">
                    {metrics.correctPredictions}/{metrics.decisiveEvaluations} decisive
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-200 text-[11px] text-slate-600 font-medium">
                Overall: <strong>{metrics.overallAccuracy != null ? `${metrics.overallAccuracy}%` : '--%'}</strong> (incl. uncertain)
              </div>
            </div>

            {/* B. Synthetic Fooling Rate */}
            <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-neo-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Synthetic Fooling Rate
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#9CDBFA] border border-black" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-[#0284c7]">
                    {metrics.foolingRate != null ? `${metrics.foolingRate}%` : '--%'}
                  </span>
                  <span className="text-xs font-mono text-slate-500 font-bold">
                    {metrics.syntheticFooledCount}/{metrics.totalSyntheticEvaluated} fooled
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-200 text-[11px] text-slate-600 font-medium">
                Synthetic images mistaken as real clinical scans
              </div>
            </div>

            {/* C. Mean Realism Score (Q2) */}
            <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-neo-sm flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Mean Realism (Q2)
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-black">
                    {metrics.meanRealismOverall != null ? `${metrics.meanRealismOverall}` : '--'}
                  </span>
                  <span className="text-xs font-mono text-slate-500 font-bold">/ 5.0</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-200 text-[11px] flex justify-between font-bold">
                <span className="text-emerald-700">Real: {metrics.meanRealismReal ?? '--'}</span>
                <span className="text-[#0284c7]">Syn: {metrics.meanRealismSynthetic ?? '--'}</span>
              </div>
            </div>

            {/* D. Mean Artifact Score (Q3) */}
            <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-neo-sm flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Mean Artifacts (Q3)
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-[#F59E0B]">
                    {metrics.meanArtifactsOverall != null ? `${metrics.meanArtifactsOverall}` : '--'}
                  </span>
                  <span className="text-xs font-mono text-slate-500 font-bold">/ 5.0</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-200 text-[11px] flex justify-between font-bold">
                <span className="text-slate-600">Lower = cleaner</span>
                <span className="text-amber-700">Syn: {metrics.meanArtifactsSynthetic ?? '--'}</span>
              </div>
            </div>

          </div>

          {/* 2. Secondary Metrics (Progress, Plausibility Q4, Uncertainty Rate) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Progress */}
            <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-neo-sm">
              <span className="text-xs font-black text-slate-700">Evaluation Progress</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-black text-black">
                  {metrics.totalEvaluated} / {metrics.totalScans}
                </span>
                <span className="text-sm font-mono font-bold text-slate-600">
                  {metrics.completionRate}%
                </span>
              </div>
              <div className="mt-2.5 w-full bg-slate-100 rounded-full h-2.5 border border-black overflow-hidden">
                <div
                  className="bg-[#84CC16] h-full transition-all duration-300"
                  style={{ width: `${Math.min(100, metrics.completionRate)}%` }}
                />
              </div>
            </div>

            {/* Q4 Clinical Plausibility */}
            <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-neo-sm">
              <span className="text-xs font-black text-slate-700">Clinical Plausibility (Q4)</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-black">
                  {metrics.meanPlausibilityOverall != null ? `${metrics.meanPlausibilityOverall}` : '--'}
                </span>
                <span className="text-xs font-mono text-slate-500 font-bold">/ 5.0 average</span>
              </div>
              <div className="mt-2 text-xs flex justify-between font-bold text-slate-600">
                <span>Real: {metrics.meanPlausibilityReal ?? '--'}</span>
                <span>Synthetic: {metrics.meanPlausibilitySynthetic ?? '--'}</span>
              </div>
            </div>

            {/* Uncertain Response Rate */}
            <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-neo-sm">
              <span className="text-xs font-black text-slate-700">Uncertain Response Rate</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-600">
                  {metrics.uncertainRate}%
                </span>
                <span className="text-xs font-mono text-slate-500 font-bold">
                  ({metrics.uncertainCount} scans)
                </span>
              </div>
              <p className="mt-2 text-[11px] text-slate-500 font-medium">
                Inconclusive scans handled separately from decisive accuracy.
              </p>
            </div>

          </div>

          {/* 2.5 Real vs. Synthetic Comparison Charts & Q3 Artifact Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Real vs Synthetic Score Comparison (Q2, Q4, Q3) */}
            <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-neo-sm space-y-4">
              <div>
                <h4 className="font-black text-base text-black">
                  Real vs. Synthetic Mean Score Comparison
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  Side-by-side comparison across Q2 Realism, Q4 Plausibility, and Q3 Artifacts (1–5 scale).
                </p>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Q2 Anatomical Realism */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-black text-black">
                    <span>Q2: Anatomical Realism (Higher = Better)</span>
                    <span className="font-mono text-slate-500">
                      Real {metrics.meanRealismReal ?? '--'} vs Syn {metrics.meanRealismSynthetic ?? '--'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-16 font-mono font-bold text-emerald-700 text-[11px]">Real</span>
                      <div className="flex-1 bg-slate-100 h-3.5 rounded-full border border-black overflow-hidden">
                        <div
                          className="bg-[#86EFAC] h-full transition-all duration-300"
                          style={{ width: `${((metrics.meanRealismReal ?? 0) / 5) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono font-black">{metrics.meanRealismReal ?? '--'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-16 font-mono font-bold text-[#0284c7] text-[11px]">Synthetic</span>
                      <div className="flex-1 bg-slate-100 h-3.5 rounded-full border border-black overflow-hidden">
                        <div
                          className="bg-[#9CDBFA] h-full transition-all duration-300"
                          style={{ width: `${((metrics.meanRealismSynthetic ?? 0) / 5) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono font-black">{metrics.meanRealismSynthetic ?? '--'}</span>
                    </div>
                  </div>
                </div>

                {/* Q4 Clinical Plausibility */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-black text-black">
                    <span>Q4: Clinical Plausibility (Higher = Better)</span>
                    <span className="font-mono text-slate-500">
                      Real {metrics.meanPlausibilityReal ?? '--'} vs Syn {metrics.meanPlausibilitySynthetic ?? '--'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-16 font-mono font-bold text-emerald-700 text-[11px]">Real</span>
                      <div className="flex-1 bg-slate-100 h-3.5 rounded-full border border-black overflow-hidden">
                        <div
                          className="bg-[#86EFAC] h-full transition-all duration-300"
                          style={{ width: `${((metrics.meanPlausibilityReal ?? 0) / 5) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono font-black">{metrics.meanPlausibilityReal ?? '--'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-16 font-mono font-bold text-[#0284c7] text-[11px]">Synthetic</span>
                      <div className="flex-1 bg-slate-100 h-3.5 rounded-full border border-black overflow-hidden">
                        <div
                          className="bg-[#9CDBFA] h-full transition-all duration-300"
                          style={{ width: `${((metrics.meanPlausibilitySynthetic ?? 0) / 5) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono font-black">{metrics.meanPlausibilitySynthetic ?? '--'}</span>
                    </div>
                  </div>
                </div>

                {/* Q3 Artifacts */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-black text-black">
                    <span>Q3: Artifacts (Lower = Cleaner)</span>
                    <span className="font-mono text-slate-500">
                      Real {metrics.meanArtifactsReal ?? '--'} vs Syn {metrics.meanArtifactsSynthetic ?? '--'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-16 font-mono font-bold text-emerald-700 text-[11px]">Real</span>
                      <div className="flex-1 bg-slate-100 h-3.5 rounded-full border border-black overflow-hidden">
                        <div
                          className="bg-[#FEF08A] h-full transition-all duration-300"
                          style={{ width: `${((metrics.meanArtifactsReal ?? 0) / 5) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono font-black">{metrics.meanArtifactsReal ?? '--'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-16 font-mono font-bold text-amber-700 text-[11px]">Synthetic</span>
                      <div className="flex-1 bg-slate-100 h-3.5 rounded-full border border-black overflow-hidden">
                        <div
                          className="bg-[#F59E0B] h-full transition-all duration-300"
                          style={{ width: `${((metrics.meanArtifactsSynthetic ?? 0) / 5) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono font-black">{metrics.meanArtifactsSynthetic ?? '--'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Q3 Artifact Score Distribution (1..5) */}
            <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-neo-sm flex flex-col justify-between space-y-4">
              <div>
                <h4 className="font-black text-base text-black">
                  Q3 Artifact Score Distribution (1–5)
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  Frequency breakdown of visual artifacts across Real vs. Synthetic scans.
                </p>
              </div>

              <div className="grid grid-cols-5 gap-2.5 items-end pt-2 h-36">
                {[1, 2, 3, 4, 5].map((score) => {
                  const realCountScore = images.filter(
                    (img) => img.groundTruth === 'Real' && evaluations[img.id]?.q3_artifacts === score
                  ).length;
                  const synCountScore = images.filter(
                    (img) => img.groundTruth === 'Synthetic' && evaluations[img.id]?.q3_artifacts === score
                  ).length;
                  const maxBar = Math.max(
                    1,
                    ...[1, 2, 3, 4, 5].map((s) =>
                      Math.max(
                        images.filter((i) => i.groundTruth === 'Real' && evaluations[i.id]?.q3_artifacts === s).length,
                        images.filter((i) => i.groundTruth === 'Synthetic' && evaluations[i.id]?.q3_artifacts === s).length
                      )
                    )
                  );
                  const realPct = Math.round((realCountScore / maxBar) * 100);
                  const synPct = Math.round((synCountScore / maxBar) * 100);

                  return (
                    <div key={score} className="flex flex-col items-center h-full justify-end gap-1.5">
                      <div className="flex items-end gap-1 w-full justify-center flex-1">
                        <div
                          title={`Real (Score ${score}): ${realCountScore}`}
                          className="w-4 bg-[#86EFAC] border border-black rounded-t-md transition-all"
                          style={{ height: `${Math.max(realCountScore > 0 ? 12 : 4, realPct)}%` }}
                        />
                        <div
                          title={`Synthetic (Score ${score}): ${synCountScore}`}
                          className="w-4 bg-[#9CDBFA] border border-black rounded-t-md transition-all"
                          style={{ height: `${Math.max(synCountScore > 0 ? 12 : 4, synPct)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-black font-mono text-black bg-[#FAF9F6] border border-black px-2 py-0.5 rounded">
                        {score}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[11px] font-bold pt-2 border-t border-slate-200">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-3 h-3 bg-[#86EFAC] border border-black inline-block rounded-sm" /> Real Scans
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-3 h-3 bg-[#9CDBFA] border border-black inline-block rounded-sm" /> Synthetic Scans
                  </span>
                </div>
                <span className="text-slate-500 font-mono">1: Clean • 5: Severe</span>
              </div>
            </div>
          </div>

          {/* 3. Confusion Matrix Breakdown */}
          <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-neo-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-black text-base text-black">
                  Confusion Matrix (Ground Truth vs. Observer Answer)
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  Detailed distribution of real vs. diffusion-generated scans evaluated.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenGroundTruthManager}
                className="text-xs font-bold text-[#0284c7] hover:underline"
              >
                Edit Ground Truth
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse border-2 border-black text-xs font-mono">
                <thead>
                  <tr className="bg-[#FAF9F6] border-b-2 border-black">
                    <th className="p-2.5 text-left font-black border-r-2 border-black">Actual Ground Truth</th>
                    <th className="p-2.5 font-black border-r-2 border-black bg-emerald-50 text-emerald-950">Labelled Real</th>
                    <th className="p-2.5 font-black border-r-2 border-black bg-sky-50 text-sky-950">Labelled Synthetic</th>
                    <th className="p-2.5 font-black bg-amber-50 text-amber-950">Labelled Uncertain</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black">
                  <tr>
                    <td className="p-3 text-left font-black border-r-2 border-black bg-[#FAF9F6]">
                      Actual Real Scans
                    </td>
                    <td className="p-3 border-r-2 border-black font-black text-emerald-700 bg-emerald-50/40">
                      {metrics.confusionMatrix.realAsReal}{' '}
                      <span className="text-[10px] font-normal text-slate-500 block">(Correct)</span>
                    </td>
                    <td className="p-3 border-r-2 border-black font-black text-rose-700 bg-rose-50/30">
                      {metrics.confusionMatrix.realAsSynthetic}{' '}
                      <span className="text-[10px] font-normal text-slate-500 block">(Type I error)</span>
                    </td>
                    <td className="p-3 font-bold text-amber-700">
                      {metrics.confusionMatrix.realAsUncertain}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 text-left font-black border-r-2 border-black bg-[#FAF9F6]">
                      Actual Synthetic Scans
                    </td>
                    <td className="p-3 border-r-2 border-black font-black text-[#0284c7] bg-sky-50/60">
                      {metrics.confusionMatrix.syntheticAsReal}{' '}
                      <span className="text-[10px] font-bold text-[#0284c7] block">
                        (FOOLED: {metrics.foolingRate ?? 0}%)
                      </span>
                    </td>
                    <td className="p-3 border-r-2 border-black font-black text-emerald-700 bg-emerald-50/40">
                      {metrics.confusionMatrix.syntheticAsSynthetic}{' '}
                      <span className="text-[10px] font-normal text-slate-500 block">(Correct detection)</span>
                    </td>
                    <td className="p-3 font-bold text-amber-700">
                      {metrics.confusionMatrix.syntheticAsUncertain}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Filterable Scan Evaluation Results Table */}
          <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-neo-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-black text-base text-black">
                  Image-Wise Evaluation Log ({filteredScans.length})
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  Review row-level ratings and classification outcomes.
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(['all', 'fooled', 'correct', 'uncertain', 'real', 'synthetic'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded-full text-[11px] font-black uppercase border-2 border-black transition ${
                      filter === f
                        ? 'bg-[#9CDBFA] text-black shadow-neo-sm'
                        : 'bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {filteredScans.length === 0 ? (
              <div className="text-center py-8 text-xs font-bold text-slate-500">
                No evaluations match filter "{filter}".
              </div>
            ) : (
              <div className="overflow-x-auto max-h-60 border-2 border-black rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#FAF9F6] border-b-2 border-black sticky top-0 font-black">
                    <tr>
                      <th className="p-2.5">Slot</th>
                      <th className="p-2.5">Scan ID</th>
                      <th className="p-2.5">Ground Truth</th>
                      <th className="p-2.5">Q1 Answer</th>
                      <th className="p-2.5">Outcome</th>
                      <th className="p-2.5">Q2 (Realism)</th>
                      <th className="p-2.5">Q3 (Artifacts)</th>
                      <th className="p-2.5">Q4 (Plausibility)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium font-mono">
                    {filteredScans.map((img) => {
                      const e = evaluations[img.id];
                      const gt = img.groundTruth || 'Unknown';
                      const q1 = e.q1_classification;

                      let statusBadge = (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">
                          Pending
                        </span>
                      );

                      if (q1 === 'Uncertain') {
                        statusBadge = (
                          <span className="px-2 py-0.5 rounded bg-[#FEF08A] text-black font-black text-[10px]">
                            Uncertain
                          </span>
                        );
                      } else if (gt === 'Synthetic' && q1 === 'Real') {
                        statusBadge = (
                          <span className="px-2 py-0.5 rounded bg-[#9CDBFA] text-black font-black text-[10px]">
                            FOOLED
                          </span>
                        );
                      } else if (gt !== 'Unknown' && q1 === gt) {
                        statusBadge = (
                          <span className="px-2 py-0.5 rounded bg-[#86EFAC] text-black font-black text-[10px]">
                            Correct
                          </span>
                        );
                      } else if (gt !== 'Unknown' && q1 !== gt) {
                        statusBadge = (
                          <span className="px-2 py-0.5 rounded bg-rose-200 text-black font-black text-[10px]">
                            Missed
                          </span>
                        );
                      }

                      return (
                        <tr key={img.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-black">#{img.slotNumber}</td>
                          <td className="p-2.5 font-bold">{img.id}</td>
                          <td className="p-2.5 font-bold">
                            <span
                              className={`px-2 py-0.5 rounded border border-black text-[10px] ${
                                gt === 'Real'
                                  ? 'bg-[#86EFAC] text-black'
                                  : gt === 'Synthetic'
                                  ? 'bg-[#9CDBFA] text-black'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {gt}
                            </span>
                          </td>
                          <td className="p-2.5 font-black">{q1 || '--'}</td>
                          <td className="p-2.5">{statusBadge}</td>
                          <td className="p-2.5 font-black">{e.q2_realism ?? '--'}/5</td>
                          <td className="p-2.5 font-black">{e.q3_artifacts ?? '--'}/5</td>
                          <td className="p-2.5 font-black">{e.q4_plausibility ?? '--'}/5</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="bg-[#FAF9F6] border-t-2 border-black px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600 font-medium">
            Provisional live results auto-saved to <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-black font-bold">data/responses.csv</code> &amp; <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-black font-bold">data/responses.json</code>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/api/responses?format=csv"
              download
              className="px-4 py-2 rounded-full text-xs font-black bg-[#9CDBFA] hover:bg-[#82CDF6] text-black border-2 border-black shadow-neo-sm hover:shadow-neo transition-all inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Master CSV</span>
            </a>
            <button
              type="button"
              onClick={() => exportEvaluationsToJSON(images, evaluations, expertId)}
              className="px-4 py-2 rounded-full text-xs font-black bg-[#FEF08A] hover:bg-[#FDE047] text-black border-2 border-black shadow-neo-sm hover:shadow-neo transition-all inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Session JSON</span>
            </button>
            <button
              type="button"
              onClick={() => exportEvaluationsToCSV(images, evaluations, expertId)}
              className="px-5 py-2 rounded-full text-xs font-black bg-[#84CC16] hover:bg-[#65a30d] text-black border-2 border-black shadow-neo-sm hover:shadow-neo transition-all"
            >
              Session CSV
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-full text-xs font-black bg-white hover:bg-slate-100 text-black border-2 border-black shadow-neo-sm transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
