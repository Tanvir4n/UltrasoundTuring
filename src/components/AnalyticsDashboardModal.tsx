'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  Download,
  BarChart3,
  AlertTriangle,
  Users,
  FileCode2,
  Copy,
  Check,
  Microscope,
  Clock,
  Activity,
} from 'lucide-react';
import {
  UltrasoundImageItem,
  ImageEvaluationResponse,
  RealtimeMetrics,
  ExpertPerformanceRow,
  InterRaterMetrics,
} from '../types/evaluation';
import {
  calculateRealtimeMetrics,
  exportEvaluationsToCSV,
  exportEvaluationsToJSON,
  generateLaTeXTables,
} from '../utils/metrics';
import { exportFullReportToPDF, exportFullReportToWord } from '../utils/reportExport';
import { calculateExpertBreakdown, calculateInterRaterMetrics } from '../utils/statistics';

interface AnalyticsDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: UltrasoundImageItem[];
  evaluations: Record<string, ImageEvaluationResponse>;
  expertId: string;
  experienceTier?: string;
  onOpenGroundTruthManager: () => void;
}

type DashboardTab = 'overview' | 'statistics' | 'multireader' | 'log_latex';

export const AnalyticsDashboardModal: React.FC<AnalyticsDashboardModalProps> = ({
  isOpen,
  onClose,
  images,
  evaluations,
  expertId,
  experienceTier,
  onOpenGroundTruthManager,
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [filter, setFilter] = useState<'all' | 'fooled' | 'correct' | 'uncertain' | 'real' | 'synthetic'>('all');
  const [byExpertData, setByExpertData] = useState<Record<string, Record<string, ImageEvaluationResponse>>>({});
  const [copiedLatex, setCopiedLatex] = useState(false);

  // Fetch multi-reader data from backend API whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/responses')
      .then((r) => r.json())
      .then((data) => {
        if (data?.byExpert && typeof data.byExpert === 'object') {
          setByExpertData(data.byExpert);
        }
      })
      .catch(() => {});
  }, [isOpen, evaluations]);

  if (!isOpen) return null;

  const metrics: RealtimeMetrics = calculateRealtimeMetrics(images, evaluations);

  // Merge current live session into multi-reader snapshot so active expert is always up to date
  const activeKey = (expertId || 'Anonymous').trim() || 'Anonymous';
  const mergedByExpert: Record<string, Record<string, ImageEvaluationResponse>> = {
    ...byExpertData,
    ...(Object.keys(evaluations).length > 0 ? { [activeKey]: evaluations } : {}),
  };

  const expertRows: ExpertPerformanceRow[] = calculateExpertBreakdown(images, mergedByExpert);
  const interRater: InterRaterMetrics = calculateInterRaterMetrics(mergedByExpert);

  const latexCode = generateLaTeXTables(metrics, expertId, interRater);

  const handleCopyLatex = async () => {
    try {
      await navigator.clipboard.writeText(latexCode);
      setCopiedLatex(true);
      setTimeout(() => setCopiedLatex(false), 2500);
    } catch {
      console.warn('Clipboard copy failed');
    }
  };

  const knownGtCount = images.filter(
    (i) => i.groundTruth === 'Real' || i.groundTruth === 'Synthetic'
  ).length;

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

  const formatP = (p: number | null | undefined) => {
    if (p == null) return '--';
    return p < 0.0001 ? '< 0.0001' : p.toFixed(4);
  };

  const formatLikertCell = (s: {
    mean: number | null;
    sd: number | null;
    median: number | null;
    iqr: [number, number] | null;
  }) => {
    if (s.mean == null) return '--';
    return `${s.mean.toFixed(2)} ± ${(s.sd ?? 0).toFixed(2)} (Med ${s.median}, IQR ${s.iqr?.[0]}–${s.iqr?.[1]})`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative max-w-6xl w-full bg-white border-2 border-black rounded-3xl shadow-neo-lg overflow-hidden flex flex-col my-auto max-h-[93vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-[#FAF9F6] border-b-2 border-black px-5 sm:px-7 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#9CDBFA] text-black border-2 border-black shadow-neo-sm flex items-center justify-center">
              <BarChart3 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-lg sm:text-xl text-black">
                  Q1 Journal Evaluation Analytics
                </h3>
                <span className="bg-[#84CC16] text-black border-2 border-black px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-neo-sm">
                  Live Calculation
                </span>
                {metrics.stats.binomialPValueVsChance != null && (
                  <span
                    className={`border-2 border-black px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono shadow-neo-sm ${
                      metrics.stats.binomialPValueVsChance > 0.05
                        ? 'bg-[#9CDBFA] text-black'
                        : 'bg-[#FEF08A] text-black'
                    }`}
                  >
                    Binomial vs 50%: p = {formatP(metrics.stats.binomialPValueVsChance)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Observer: <strong className="text-black font-mono">{expertId || 'Anonymous'}</strong> • Wilson 95% CI, Mann-Whitney U, PCOS Subgroups, Multi-Reader κ &amp; LaTeX Export
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

        {/* Tab Bar */}
        <div className="bg-white border-b-2 border-black px-5 sm:px-7 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Overview & Charts', icon: BarChart3 },
            { id: 'statistics', label: 'Q1 Statistics & Subgroups', icon: Microscope },
            { id: 'multireader', label: `Multi-Reader & Kappa (${expertRows.length})`, icon: Users },
            { id: 'log_latex', label: 'Image Log & LaTeX Export', icon: FileCode2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as DashboardTab)}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black border-2 border-black shrink-0 transition cursor-pointer ${
                  active
                    ? 'bg-[#9CDBFA] text-black shadow-neo-sm'
                    : 'bg-[#FAF9F6] text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
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
          {/* ==================== TAB 1: OVERVIEW & CHARTS ==================== */}
          {activeTab === 'overview' && (
            <>
              {/* 1. Core Real-Time KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                        {metrics.correctPredictions}/{metrics.decisiveEvaluations}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-slate-200 text-[11px] text-slate-600 font-mono">
                    95% CI:{' '}
                    <strong>
                      {metrics.stats.accuracyCI95
                        ? `[${metrics.stats.accuracyCI95[0]}%, ${metrics.stats.accuracyCI95[1]}%]`
                        : '--'}
                    </strong>
                  </div>
                </div>

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
                  <div className="mt-3 pt-2.5 border-t border-slate-200 text-[11px] text-slate-600 font-mono">
                    95% CI:{' '}
                    <strong>
                      {metrics.stats.foolingRateCI95
                        ? `[${metrics.stats.foolingRateCI95[0]}%, ${metrics.stats.foolingRateCI95[1]}%]`
                        : '--'}
                    </strong>
                  </div>
                </div>

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
                    <span className="text-slate-600">Real: {metrics.meanArtifactsReal ?? '--'}</span>
                    <span className="text-amber-700">Syn: {metrics.meanArtifactsSynthetic ?? '--'}</span>
                  </div>
                </div>
              </div>

              {/* 2. Secondary Metrics (Progress, Diagnostic Metrics, Decision Latency, Uncertain Rate) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

                <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-neo-sm">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                    <Activity className="w-3.5 h-3.5 text-[#0284c7]" />
                    <span>Sensitivity / Specificity</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-xl font-black text-black font-mono">
                      {metrics.diagnostic.sensitivity ?? '--'}% / {metrics.diagnostic.specificity ?? '--'}%
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] flex justify-between font-mono font-bold text-slate-600">
                    <span>F1: {metrics.diagnostic.f1Score ?? '--'}%</span>
                    <span>Bal Acc: {metrics.diagnostic.balancedAccuracy ?? '--'}%</span>
                  </div>
                </div>

                <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-neo-sm">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Mean Decision Latency</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-black font-mono">
                      {metrics.decisionTime.overallMeanSec != null ? `${metrics.decisionTime.overallMeanSec}s` : '--'}
                    </span>
                    <span className="text-xs font-mono text-slate-500 font-bold">/ scan</span>
                  </div>
                  <div className="mt-2 text-[11px] flex justify-between font-mono font-bold text-slate-600">
                    <span>Real: {metrics.decisionTime.realMeanSec ?? '--'}s</span>
                    <span>Syn: {metrics.decisionTime.syntheticMeanSec ?? '--'}s</span>
                  </div>
                </div>

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
                    Overall Acc (incl. uncertain): <strong>{metrics.overallAccuracy ?? '--'}%</strong>
                  </p>
                </div>
              </div>

              {/* 3. Visual Comparison Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                    {[
                      {
                        label: 'Q2: Anatomical Realism (Higher = Better)',
                        r: metrics.meanRealismReal,
                        s: metrics.meanRealismSynthetic,
                        p: metrics.stats.mannWhitneyQ2?.pValue,
                        rColor: 'bg-[#86EFAC]',
                        sColor: 'bg-[#9CDBFA]',
                      },
                      {
                        label: 'Q4: Clinical Plausibility (Higher = Better)',
                        r: metrics.meanPlausibilityReal,
                        s: metrics.meanPlausibilitySynthetic,
                        p: metrics.stats.mannWhitneyQ4?.pValue,
                        rColor: 'bg-[#86EFAC]',
                        sColor: 'bg-[#9CDBFA]',
                      },
                      {
                        label: 'Q3: Artifacts (Lower = Cleaner)',
                        r: metrics.meanArtifactsReal,
                        s: metrics.meanArtifactsSynthetic,
                        p: metrics.stats.mannWhitneyQ3?.pValue,
                        rColor: 'bg-[#FEF08A]',
                        sColor: 'bg-[#F59E0B]',
                      },
                    ].map((row) => (
                      <div key={row.label} className="space-y-1.5">
                        <div className="flex justify-between font-black text-black">
                          <span>{row.label}</span>
                          <span className="font-mono text-slate-500 text-[11px]">
                            p = {formatP(row.p)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-16 font-mono font-bold text-emerald-700 text-[11px]">Real</span>
                            <div className="flex-1 bg-slate-100 h-3.5 rounded-full border border-black overflow-hidden">
                              <div
                                className={`${row.rColor} h-full transition-all duration-300`}
                                style={{ width: `${((row.r ?? 0) / 5) * 100}%` }}
                              />
                            </div>
                            <span className="w-9 text-right font-mono font-black">{row.r ?? '--'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-16 font-mono font-bold text-[#0284c7] text-[11px]">Synthetic</span>
                            <div className="flex-1 bg-slate-100 h-3.5 rounded-full border border-black overflow-hidden">
                              <div
                                className={`${row.sColor} h-full transition-all duration-300`}
                                style={{ width: `${((row.s ?? 0) / 5) * 100}%` }}
                              />
                            </div>
                            <span className="w-9 text-right font-mono font-black">{row.s ?? '--'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Q3 Artifact Score Distribution Histogram */}
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
                              className="w-5 bg-[#86EFAC] border border-black rounded-t-md transition-all"
                              style={{ height: `${Math.max(realCountScore > 0 ? 12 : 4, realPct)}%` }}
                            />
                            <div
                              title={`Synthetic (Score ${score}): ${synCountScore}`}
                              className="w-5 bg-[#9CDBFA] border border-black rounded-t-md transition-all"
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

              {/* 4. Confusion Matrix */}
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
            </>
          )}

          {/* ==================== TAB 2: Q1 STATISTICS & SUBGROUPS ==================== */}
          {activeTab === 'statistics' && (
            <div className="space-y-5">
              {/* Hypothesis Test Banner */}
              <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-neo-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-black text-base text-black">
                      Exact Binomial Test Against Random Chance ($H_0: p = 0.50$)
                    </h4>
                    <p className="text-xs text-slate-600">
                      Non-significant $p &gt; 0.05$ indicates radiologists cannot reliably distinguish synthetic diffusion scans from real ultrasound scans.
                    </p>
                  </div>
                  <div className="bg-[#FAF9F6] border-2 border-black rounded-xl px-4 py-2 font-mono text-xs font-black">
                    Two-tailed $p$ = <span className="text-[#0284c7]">{formatP(metrics.stats.binomialPValueVsChance)}</span>
                  </div>
                </div>
              </div>

              {/* Non-Parametric Mann-Whitney U Table */}
              <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-neo-sm space-y-3">
                <h4 className="font-black text-base text-black">
                  Likert Quality &amp; Latency Comparison (Mean ± SD, Median [IQR], Mann–Whitney U)
                </h4>
                <div className="overflow-x-auto border-2 border-black rounded-xl">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-[#FAF9F6] border-b-2 border-black font-black">
                      <tr>
                        <th className="p-3">Evaluation Dimension</th>
                        <th className="p-3">Real Scans (Mean ± SD / Med [IQR])</th>
                        <th className="p-3">Synthetic Scans (Mean ± SD / Med [IQR])</th>
                        <th className="p-3">Mann–Whitney U</th>
                        <th className="p-3">p-value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      <tr>
                        <td className="p-3 font-sans font-bold text-black">Q2: Anatomical Realism (1–5)</td>
                        <td className="p-3">{formatLikertCell(metrics.likertStats.q2Real)}</td>
                        <td className="p-3">{formatLikertCell(metrics.likertStats.q2Synthetic)}</td>
                        <td className="p-3">{metrics.stats.mannWhitneyQ2?.uStatistic ?? '--'}</td>
                        <td className="p-3 font-black">{formatP(metrics.stats.mannWhitneyQ2?.pValue)}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-sans font-bold text-black">Q3: Image Artifacts (1–5, ↓ better)</td>
                        <td className="p-3">{formatLikertCell(metrics.likertStats.q3Real)}</td>
                        <td className="p-3">{formatLikertCell(metrics.likertStats.q3Synthetic)}</td>
                        <td className="p-3">{metrics.stats.mannWhitneyQ3?.uStatistic ?? '--'}</td>
                        <td className="p-3 font-black">{formatP(metrics.stats.mannWhitneyQ3?.pValue)}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-sans font-bold text-black">Q4: Clinical Plausibility (1–5)</td>
                        <td className="p-3">{formatLikertCell(metrics.likertStats.q4Real)}</td>
                        <td className="p-3">{formatLikertCell(metrics.likertStats.q4Synthetic)}</td>
                        <td className="p-3">{metrics.stats.mannWhitneyQ4?.uStatistic ?? '--'}</td>
                        <td className="p-3 font-black">{formatP(metrics.stats.mannWhitneyQ4?.pValue)}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-sans font-bold text-black">Decision Latency (seconds)</td>
                        <td className="p-3">
                          {metrics.decisionTime.realMeanSec != null ? `${metrics.decisionTime.realMeanSec}s` : '--'}
                        </td>
                        <td className="p-3">
                          {metrics.decisionTime.syntheticMeanSec != null ? `${metrics.decisionTime.syntheticMeanSec}s` : '--'}
                        </td>
                        <td className="p-3">{metrics.stats.mannWhitneyDecisionTime?.uStatistic ?? '--'}</td>
                        <td className="p-3 font-black">{formatP(metrics.stats.mannWhitneyDecisionTime?.pValue)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PCOS vs NON-PCOS Morphology Subgroup Table */}
              <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-neo-sm space-y-3">
                <h4 className="font-black text-base text-black">
                  Ovarian Morphology Subgroup Analysis (PCOS vs. NON-PCOS)
                </h4>
                <div className="overflow-x-auto border-2 border-black rounded-xl">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-[#FAF9F6] border-b-2 border-black font-black">
                      <tr>
                        <th className="p-3">Subgroup</th>
                        <th className="p-3">Evaluated</th>
                        <th className="p-3">Accuracy</th>
                        <th className="p-3">Fooling Rate</th>
                        <th className="p-3">Q2 Realism (R / S)</th>
                        <th className="p-3">Q3 Artifacts (R / S)</th>
                        <th className="p-3">Q4 Plausibility (R / S)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      {[
                        { name: 'PCOS Morphology', data: metrics.subgroups.pcos },
                        { name: 'NON-PCOS (Normal)', data: metrics.subgroups.nonPcos },
                      ].map((row) => (
                        <tr key={row.name}>
                          <td className="p-3 font-sans font-black text-black">{row.name}</td>
                          <td className="p-3">{row.data.totalEvaluated}/{row.data.totalScans}</td>
                          <td className="p-3 font-black">
                            {row.data.decisiveAccuracy != null ? `${row.data.decisiveAccuracy}%` : '--'}
                          </td>
                          <td className="p-3 font-black text-[#0284c7]">
                            {row.data.foolingRate != null ? `${row.data.foolingRate}%` : '--'}
                          </td>
                          <td className="p-3">{row.data.meanRealismReal ?? '--'} / {row.data.meanRealismSynthetic ?? '--'}</td>
                          <td className="p-3">{row.data.meanArtifactsReal ?? '--'} / {row.data.meanArtifactsSynthetic ?? '--'}</td>
                          <td className="p-3">{row.data.meanPlausibilityReal ?? '--'} / {row.data.meanPlausibilitySynthetic ?? '--'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Artifact Failure Taxonomy Breakdown */}
              <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-neo-sm space-y-3">
                <h4 className="font-black text-base text-black">
                  Reported Artifact Failure Modes (Error Taxonomy)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(metrics.artifactTagCounts).map(([tag, counts]) => (
                    <div
                      key={tag}
                      className="bg-[#FAF9F6] border border-black rounded-xl p-3 flex items-center justify-between"
                    >
                      <span className="text-xs font-bold text-black">{tag}</span>
                      <span className="text-xs font-mono font-black px-2 py-0.5 rounded bg-white border border-black">
                        {counts.total} (R:{counts.real} / S:{counts.synthetic})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 3: MULTI-READER & KAPPA ==================== */}
          {activeTab === 'multireader' && (
            <div className="space-y-5">
              {/* Inter-Rater Agreement Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-neo-sm">
                  <span className="text-[11px] font-black uppercase text-slate-500">Total Experts Recorded</span>
                  <div className="mt-1 text-3xl font-black text-black">{interRater.expertCount}</div>
                  <p className="mt-1 text-xs text-slate-500">
                    Shared multi-reader scans: <strong>{interRater.sharedScansCount}</strong>
                  </p>
                </div>

                <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-neo-sm">
                  <span className="text-[11px] font-black uppercase text-slate-500">Fleiss&apos; Kappa (κ)</span>
                  <div className="mt-1 text-3xl font-black text-[#0284c7] font-mono">
                    {interRater.fleissKappa ?? '--'}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Requires ≥ 2 experts rating shared scans</p>
                </div>

                <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-neo-sm">
                  <span className="text-[11px] font-black uppercase text-slate-500">Pairwise Cohen&apos;s κ / Agreement</span>
                  <div className="mt-1 text-3xl font-black text-emerald-700 font-mono">
                    {interRater.pairwiseCohenKappaMean ?? '--'}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Raw agreement: <strong>{interRater.percentAgreement != null ? `${interRater.percentAgreement}%` : '--'}</strong>
                  </p>
                </div>
              </div>

              {/* Expert-Wise Comparison Table */}
              <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-neo-sm space-y-3">
                <h4 className="font-black text-base text-black">
                  Expert-Wise Performance Stratification
                </h4>
                {expertRows.length === 0 ? (
                  <div className="text-center py-8 text-xs font-bold text-slate-500">
                    No expert evaluations recorded yet. Evaluate scans with distinct Expert IDs (e.g. Rad-01, Rad-02) to compare readers.
                  </div>
                ) : (
                  <div className="overflow-x-auto border-2 border-black rounded-xl">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-[#FAF9F6] border-b-2 border-black font-black">
                        <tr>
                          <th className="p-3">Expert ID</th>
                          <th className="p-3">Experience Role</th>
                          <th className="p-3">Evaluated</th>
                          <th className="p-3">Accuracy</th>
                          <th className="p-3">Fooling Rate</th>
                          <th className="p-3">Uncertain %</th>
                          <th className="p-3">Mean Q2/Q3/Q4</th>
                          <th className="p-3">Mean Latency</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-mono">
                        {expertRows.map((row) => (
                          <tr key={row.expertId} className="hover:bg-slate-50">
                            <td className="p-3 font-black text-black">{row.expertId}</td>
                            <td className="p-3 font-sans font-bold text-slate-600">{row.experienceTier || '--'}</td>
                            <td className="p-3">{row.totalEvaluated}</td>
                            <td className="p-3 font-black">{row.decisiveAccuracy != null ? `${row.decisiveAccuracy}%` : '--'}</td>
                            <td className="p-3 font-black text-[#0284c7]">{row.foolingRate != null ? `${row.foolingRate}%` : '--'}</td>
                            <td className="p-3">{row.uncertainRate}%</td>
                            <td className="p-3">
                              {row.meanRealism ?? '--'} / {row.meanArtifacts ?? '--'} / {row.meanPlausibility ?? '--'}
                            </td>
                            <td className="p-3">{row.meanDecisionSec != null ? `${row.meanDecisionSec}s` : '--'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB 4: IMAGE LOG & LATEX EXPORT ==================== */}
          {activeTab === 'log_latex' && (
            <div className="space-y-5">
              {/* Ready-to-Paste LaTeX Tables Box */}
              <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-neo-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-black text-base text-black">
                      Publication-Ready LaTeX Tables (IEEE / Elsevier Booktabs)
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Directly copy and paste Tables I–III (Classification, Mann–Whitney U, PCOS Subgroups) into Overleaf.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLatex}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black bg-[#9CDBFA] hover:bg-[#82CDF6] text-black border-2 border-black shadow-neo-sm transition cursor-pointer"
                  >
                    {copiedLatex ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLatex ? 'Copied LaTeX!' : 'Copy LaTeX Tables'}</span>
                  </button>
                </div>

                <pre className="bg-[#0B132B] text-sky-100 p-4 rounded-xl border-2 border-black text-[11px] font-mono overflow-x-auto max-h-60 leading-relaxed">
                  {latexCode}
                </pre>
              </div>

              {/* Filterable Image-Wise Log */}
              <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-neo-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-black text-base text-black">
                      Image-Wise Evaluation Log ({filteredScans.length})
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Review row-level ratings, decision times, and artifact tags.
                    </p>
                  </div>

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
                    No evaluations match filter &quot;{filter}&quot;.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-64 border-2 border-black rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#FAF9F6] border-b-2 border-black sticky top-0 font-black">
                        <tr>
                          <th className="p-2.5">Scan ID</th>
                          <th className="p-2.5">Pathology</th>
                          <th className="p-2.5">Ground Truth</th>
                          <th className="p-2.5">Q1 Answer</th>
                          <th className="p-2.5">Outcome</th>
                          <th className="p-2.5">Q2 / Q3 / Q4</th>
                          <th className="p-2.5">Latency</th>
                          <th className="p-2.5">Artifact Tags</th>
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
                              <td className="p-2.5 font-bold text-black">{img.id}</td>
                              <td className="p-2.5 text-[11px]">{img.morphology || '--'}</td>
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
                              <td className="p-2.5 font-black">
                                {e.q2_realism ?? '-'}/{e.q3_artifacts ?? '-'}/{e.q4_plausibility ?? '-'}
                              </td>
                              <td className="p-2.5">
                                {e.decisionTimeMs ? `${(e.decisionTimeMs / 1000).toFixed(1)}s` : '--'}
                              </td>
                              <td className="p-2.5 text-[10px] font-sans">
                                {(e.artifactTags || []).join(', ') || '--'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#FAF9F6] border-t-2 border-black px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600 font-medium">
            Auto-saved to <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-black font-bold">data/responses.csv</code> &amp; <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-black font-bold">data/responses.json</code>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => exportFullReportToPDF(images, evaluations, expertId, experienceTier, mergedByExpert)}
              className="px-4 py-2 rounded-full text-xs font-black bg-[#9CDBFA] hover:bg-[#82CDF6] text-black border-2 border-black shadow-neo-sm hover:shadow-neo transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Full Report PDF</span>
            </button>
            <button
              type="button"
              onClick={() => exportFullReportToWord(images, evaluations, expertId, experienceTier, mergedByExpert)}
              className="px-4 py-2 rounded-full text-xs font-black bg-white hover:bg-slate-100 text-black border-2 border-black shadow-neo-sm hover:shadow-neo transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Word (.doc)</span>
            </button>
            <a
              href="/api/responses?format=csv"
              download
              className="px-3.5 py-2 rounded-full text-xs font-black bg-[#FAF9F6] hover:bg-slate-100 text-black border-2 border-black shadow-neo-sm hover:shadow-neo transition-all inline-flex items-center gap-1.5"
            >
              <span>Master CSV</span>
            </a>
            <button
              type="button"
              onClick={() => exportEvaluationsToJSON(images, evaluations, expertId)}
              className="px-3.5 py-2 rounded-full text-xs font-black bg-[#FEF08A] hover:bg-[#FDE047] text-black border-2 border-black shadow-neo-sm hover:shadow-neo transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>JSON</span>
            </button>
            <button
              type="button"
              onClick={() => exportEvaluationsToCSV(images, evaluations, expertId)}
              className="px-4 py-2 rounded-full text-xs font-black bg-[#84CC16] hover:bg-[#65a30d] text-black border-2 border-black shadow-neo-sm hover:shadow-neo transition-all cursor-pointer"
            >
              Session CSV
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-black bg-white hover:bg-slate-100 text-black border-2 border-black shadow-neo-sm transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
