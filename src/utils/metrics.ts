import {
  UltrasoundImageItem,
  ImageEvaluationResponse,
  RealtimeMetrics,
  ConfusionMatrix,
  SubgroupMetricsSummary,
  InterRaterMetrics,
  ARTIFACT_TAXONOMY_TAGS,
} from '../types/evaluation';
import {
  calculateDiagnosticMetrics,
  computeLikertStats,
  exactBinomialPValueVsHalf,
  mannWhitneyU,
  wilsonCI95,
} from './statistics';

function computeSubgroupSummary(
  subsetImages: UltrasoundImageItem[],
  evaluations: Record<string, ImageEvaluationResponse>
): SubgroupMetricsSummary {
  let totalEvaluated = 0;
  let decisive = 0;
  let correct = 0;
  let synEval = 0;
  let synFooled = 0;

  const q2R: number[] = [];
  const q2S: number[] = [];
  const q3R: number[] = [];
  const q3S: number[] = [];
  const q4R: number[] = [];
  const q4S: number[] = [];

  for (const img of subsetImages) {
    const e = evaluations[img.id];
    if (!e) continue;
    const hasAny =
      e.q1_classification != null ||
      e.q2_realism != null ||
      e.q3_artifacts != null ||
      e.q4_plausibility != null;
    if (!hasAny) continue;

    totalEvaluated++;
    const gt = img.groundTruth || 'Unknown';

    if (e.q1_classification != null && e.q1_classification !== 'Uncertain') {
      if (gt === 'Real' || gt === 'Synthetic') {
        decisive++;
        if (e.q1_classification === gt) correct++;
      }
      if (gt === 'Synthetic') {
        synEval++;
        if (e.q1_classification === 'Real') synFooled++;
      }
    } else if (gt === 'Synthetic' && e.q1_classification === 'Uncertain') {
      synEval++;
    }

    if (e.q2_realism != null) {
      if (gt === 'Real') q2R.push(e.q2_realism);
      else if (gt === 'Synthetic') q2S.push(e.q2_realism);
    }
    if (e.q3_artifacts != null) {
      if (gt === 'Real') q3R.push(e.q3_artifacts);
      else if (gt === 'Synthetic') q3S.push(e.q3_artifacts);
    }
    if (e.q4_plausibility != null) {
      if (gt === 'Real') q4R.push(e.q4_plausibility);
      else if (gt === 'Synthetic') q4S.push(e.q4_plausibility);
    }
  }

  const avg = (arr: number[]): number | null =>
    arr.length > 0 ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : null;

  return {
    totalScans: subsetImages.length,
    totalEvaluated,
    decisiveEvaluations: decisive,
    decisiveAccuracy: decisive > 0 ? Number(((correct / decisive) * 100).toFixed(1)) : null,
    foolingRate: synEval > 0 ? Number(((synFooled / synEval) * 100).toFixed(1)) : null,
    meanRealismReal: avg(q2R),
    meanRealismSynthetic: avg(q2S),
    meanArtifactsReal: avg(q3R),
    meanArtifactsSynthetic: avg(q3S),
    meanPlausibilityReal: avg(q4R),
    meanPlausibilitySynthetic: avg(q4S),
  };
}

export function calculateRealtimeMetrics(
  images: UltrasoundImageItem[],
  evaluations: Record<string, ImageEvaluationResponse>
): RealtimeMetrics {
  let totalEvaluated = 0;
  let decisiveEvaluations = 0;
  let correctPredictions = 0;
  let uncertainCount = 0;

  let totalSyntheticEvaluated = 0;
  let syntheticFooledCount = 0;

  const q2Real: number[] = [];
  const q2Synthetic: number[] = [];
  const q2Overall: number[] = [];

  const q3Real: number[] = [];
  const q3Synthetic: number[] = [];
  const q3Overall: number[] = [];

  const q4Real: number[] = [];
  const q4Synthetic: number[] = [];
  const q4Overall: number[] = [];

  const timeRealSec: number[] = [];
  const timeSynSec: number[] = [];
  const timeFooledSec: number[] = [];
  const timeOverallSec: number[] = [];

  const artifactTagCounts: Record<string, { real: number; synthetic: number; total: number }> = {};
  for (const tag of ARTIFACT_TAXONOMY_TAGS) {
    artifactTagCounts[tag] = { real: 0, synthetic: 0, total: 0 };
  }

  const matrix: ConfusionMatrix = {
    realAsReal: 0,
    realAsSynthetic: 0,
    realAsUncertain: 0,
    syntheticAsReal: 0,
    syntheticAsSynthetic: 0,
    syntheticAsUncertain: 0,
  };

  images.forEach((img) => {
    const e = evaluations[img.id];
    if (!e) return;

    const hasAnyResponse =
      e.q1_classification != null ||
      e.q2_realism != null ||
      e.q3_artifacts != null ||
      e.q4_plausibility != null;

    if (!hasAnyResponse) return;

    totalEvaluated++;

    const gt = img.groundTruth || 'Unknown';

    // Q1 Classification Metrics
    if (e.q1_classification != null) {
      if (e.q1_classification === 'Uncertain') {
        uncertainCount++;
        if (gt === 'Real') matrix.realAsUncertain++;
        else if (gt === 'Synthetic') matrix.syntheticAsUncertain++;
      } else {
        if (gt === 'Real' || gt === 'Synthetic') {
          decisiveEvaluations++;
        }

        if (gt === 'Real') {
          if (e.q1_classification === 'Real') {
            correctPredictions++;
            matrix.realAsReal++;
          } else if (e.q1_classification === 'Synthetic') {
            matrix.realAsSynthetic++;
          }
        } else if (gt === 'Synthetic') {
          totalSyntheticEvaluated++;
          if (e.q1_classification === 'Synthetic') {
            correctPredictions++;
            matrix.syntheticAsSynthetic++;
          } else if (e.q1_classification === 'Real') {
            syntheticFooledCount++;
            matrix.syntheticAsReal++;
          }
        }
      }

      if (gt === 'Synthetic' && e.q1_classification === 'Uncertain') {
        totalSyntheticEvaluated++;
      }
    }

    // Q2 Anatomical Realism
    if (e.q2_realism != null) {
      q2Overall.push(e.q2_realism);
      if (gt === 'Real') q2Real.push(e.q2_realism);
      else if (gt === 'Synthetic') q2Synthetic.push(e.q2_realism);
    }

    // Q3 Image Artifacts
    if (e.q3_artifacts != null) {
      q3Overall.push(e.q3_artifacts);
      if (gt === 'Real') q3Real.push(e.q3_artifacts);
      else if (gt === 'Synthetic') q3Synthetic.push(e.q3_artifacts);
    }

    // Q4 Clinical Plausibility
    if (e.q4_plausibility != null) {
      q4Overall.push(e.q4_plausibility);
      if (gt === 'Real') q4Real.push(e.q4_plausibility);
      else if (gt === 'Synthetic') q4Synthetic.push(e.q4_plausibility);
    }

    // Decision Latency (filter absurd idle values > 10 minutes)
    if (e.decisionTimeMs && e.decisionTimeMs > 0 && e.decisionTimeMs < 600000) {
      const sec = e.decisionTimeMs / 1000;
      timeOverallSec.push(sec);
      if (gt === 'Real') timeRealSec.push(sec);
      else if (gt === 'Synthetic') {
        timeSynSec.push(sec);
        if (e.q1_classification === 'Real') timeFooledSec.push(sec);
      }
    }

    // Artifact Failure Taxonomy Tags
    if (Array.isArray(e.artifactTags)) {
      for (const tag of e.artifactTags) {
        if (!artifactTagCounts[tag]) {
          artifactTagCounts[tag] = { real: 0, synthetic: 0, total: 0 };
        }
        artifactTagCounts[tag].total++;
        if (gt === 'Real') artifactTagCounts[tag].real++;
        else if (gt === 'Synthetic') artifactTagCounts[tag].synthetic++;
      }
    }
  });

  const avg = (arr: number[]): number | null =>
    arr.length > 0 ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : null;

  const totalScans = images.filter((i) => Boolean(i.imageUrl)).length || images.length;
  const completionRate = totalScans > 0 ? Number(((totalEvaluated / totalScans) * 100).toFixed(1)) : 0;

  const decisiveAccuracy =
    decisiveEvaluations > 0 ? Number(((correctPredictions / decisiveEvaluations) * 100).toFixed(1)) : null;

  const knownGtCount = images.filter(
    (img) =>
      (img.groundTruth === 'Real' || img.groundTruth === 'Synthetic') &&
      evaluations[img.id]?.q1_classification != null
  ).length;
  const overallAccuracy =
    knownGtCount > 0 ? Number(((correctPredictions / knownGtCount) * 100).toFixed(1)) : null;

  const foolingRate =
    totalSyntheticEvaluated > 0
      ? Number(((syntheticFooledCount / totalSyntheticEvaluated) * 100).toFixed(1))
      : null;

  const uncertainRate =
    totalEvaluated > 0 ? Number(((uncertainCount / totalEvaluated) * 100).toFixed(1)) : 0;

  // Subgroups (PCOS vs NON_PCOS)
  const pcosImages = images.filter(
    (img) => img.morphology === 'PCOS' || (img.fileName || '').toUpperCase().includes('_PMOS_')
  );
  const nonPcosImages = images.filter(
    (img) =>
      img.morphology === 'NON_PCOS' || (img.fileName || '').toUpperCase().includes('NON PMOS')
  );

  return {
    totalScans,
    totalEvaluated,
    completionRate,
    decisiveEvaluations,
    correctPredictions,
    decisiveAccuracy,
    overallAccuracy,
    totalSyntheticEvaluated,
    syntheticFooledCount,
    foolingRate,
    uncertainCount,
    uncertainRate,
    meanRealismReal: avg(q2Real),
    meanRealismSynthetic: avg(q2Synthetic),
    meanRealismOverall: avg(q2Overall),
    meanPlausibilityReal: avg(q4Real),
    meanPlausibilitySynthetic: avg(q4Synthetic),
    meanPlausibilityOverall: avg(q4Overall),
    meanArtifactsReal: avg(q3Real),
    meanArtifactsSynthetic: avg(q3Synthetic),
    meanArtifactsOverall: avg(q3Overall),
    confusionMatrix: matrix,
    diagnostic: calculateDiagnosticMetrics(matrix),
    likertStats: {
      q2Real: computeLikertStats(q2Real),
      q2Synthetic: computeLikertStats(q2Synthetic),
      q3Real: computeLikertStats(q3Real),
      q3Synthetic: computeLikertStats(q3Synthetic),
      q4Real: computeLikertStats(q4Real),
      q4Synthetic: computeLikertStats(q4Synthetic),
    },
    stats: {
      accuracyCI95: wilsonCI95(correctPredictions, decisiveEvaluations),
      foolingRateCI95: wilsonCI95(syntheticFooledCount, totalSyntheticEvaluated),
      binomialPValueVsChance: exactBinomialPValueVsHalf(correctPredictions, decisiveEvaluations),
      mannWhitneyQ2: mannWhitneyU(q2Real, q2Synthetic),
      mannWhitneyQ3: mannWhitneyU(q3Real, q3Synthetic),
      mannWhitneyQ4: mannWhitneyU(q4Real, q4Synthetic),
      mannWhitneyDecisionTime: mannWhitneyU(timeRealSec, timeSynSec),
    },
    subgroups: {
      pcos: computeSubgroupSummary(pcosImages, evaluations),
      nonPcos: computeSubgroupSummary(nonPcosImages, evaluations),
    },
    decisionTime: {
      overallMeanSec: avg(timeOverallSec),
      realMeanSec: avg(timeRealSec),
      syntheticMeanSec: avg(timeSynSec),
      fooledMeanSec: avg(timeFooledSec),
    },
    artifactTagCounts,
  };
}

export function generateLaTeXTables(
  metrics: RealtimeMetrics,
  expertId: string,
  interRater?: InterRaterMetrics | null
): string {
  const fmt = (v: number | null | undefined, suffix = '') => (v != null ? `${v}${suffix}` : '--');
  const fmtCI = (ci: [number, number] | null) => (ci ? `[${ci[0]}\\%, ${ci[1]}\\%]` : '--');
  const fmtP = (p: number | null | undefined) => {
    if (p == null) return '--';
    return p < 0.0001 ? '$< 0.0001$' : `$${p.toFixed(4)}$`;
  };
  const fmtLikert = (s: { mean: number | null; sd: number | null; median: number | null; iqr: [number, number] | null }) => {
    if (s.mean == null) return '--';
    const meanSd = `$${s.mean.toFixed(2)} \\pm ${(s.sd ?? 0).toFixed(2)}$`;
    const medIqr = s.iqr ? `${s.median} [${s.iqr[0]}--${s.iqr[1]}]` : `${s.median ?? '--'}`;
    return `${meanSd} & ${medIqr}`;
  };

  return `% =========================================================
% Publication-Ready Visual Turing Test Tables (Q1 Format)
% Generated for Observer: ${expertId || 'All Experts'} (${new Date().toISOString().split('T')[0]})
% Requires \\usepackage{booktabs}
% =========================================================

% TABLE I: Classification & Visual Turing Test Performance
\\begin{table}[htbp]
\\centering
\\caption{Expert Visual Turing Test Classification Performance ($N=${metrics.totalEvaluated}$ Evaluated Scans)}
\\label{tab:vtt_performance}
\\begin{tabular}{lc}
\\toprule
\\textbf{Evaluation Metric} & \\textbf{Value (95\\% CI / Detail)} \\\\
\\midrule
Decisive Classification Accuracy & ${fmt(metrics.decisiveAccuracy, '\\%')} ${fmtCI(metrics.stats.accuracyCI95)} \\\\
Binomial Test vs. Random Chance (50\\%) & $p = ${metrics.stats.binomialPValueVsChance != null ? (metrics.stats.binomialPValueVsChance < 0.0001 ? '<0.0001' : metrics.stats.binomialPValueVsChance.toFixed(4)) : '--'}$ \\\\
Synthetic Image Fooling Rate & ${fmt(metrics.foolingRate, '\\%')} ${fmtCI(metrics.stats.foolingRateCI95)} \\\\
Overall Accuracy (incl. Uncertain) & ${fmt(metrics.overallAccuracy, '\\%')} \\\\
Uncertain Response Rate & ${metrics.uncertainRate}\\% ($n=${metrics.uncertainCount}$) \\\\
Sensitivity (Synthetic Detection) & ${fmt(metrics.diagnostic.sensitivity, '\\%')} \\\\
Specificity (Real Identification) & ${fmt(metrics.diagnostic.specificity, '\\%')} \\\\
F1-Score / Balanced Accuracy & ${fmt(metrics.diagnostic.f1Score, '\\%')} / ${fmt(metrics.diagnostic.balancedAccuracy, '\\%')} \\\\
Mean Decision Latency (Real vs. Syn) & ${fmt(metrics.decisionTime.realMeanSec, ' s')} vs. ${fmt(metrics.decisionTime.syntheticMeanSec, ' s')} \\\\
${
  interRater && interRater.expertCount >= 2
    ? `Inter-Rater Agreement (Fleiss' $\\kappa$ / Cohen's $\\kappa$) & ${interRater.fleissKappa ?? '--'} / ${interRater.pairwiseCohenKappaMean ?? '--'} (${interRater.percentAgreement ?? '--'}\\%) \\\\\n`
    : ''
}\\bottomrule
\\end{tabular}
\\end{table}

% TABLE II: Perceptual Quality & Artifact Comparison (Likert 1-5)
\\begin{table}[htbp]
\\centering
\\caption{Perceptual Quality Comparison Between Real and Synthetic Scans (Mann--Whitney $U$ Test)}
\\label{tab:likert_comparison}
\\begin{tabular}{lccccc}
\\toprule
\\textbf{Criterion (1--5)} & \\textbf{Real Mean$\\pm$SD} & \\textbf{Real Med [IQR]} & \\textbf{Syn Mean$\\pm$SD} & \\textbf{Syn Med [IQR]} & \\textbf{$p$-value} \\\\
\\midrule
Q2: Anatomical Realism & ${fmtLikert(metrics.likertStats.q2Real)} & ${fmtLikert(metrics.likertStats.q2Synthetic)} & ${fmtP(metrics.stats.mannWhitneyQ2?.pValue)} \\\\
Q3: Image Artifacts ($\\downarrow$) & ${fmtLikert(metrics.likertStats.q3Real)} & ${fmtLikert(metrics.likertStats.q3Synthetic)} & ${fmtP(metrics.stats.mannWhitneyQ3?.pValue)} \\\\
Q4: Clinical Plausibility & ${fmtLikert(metrics.likertStats.q4Real)} & ${fmtLikert(metrics.likertStats.q4Synthetic)} & ${fmtP(metrics.stats.mannWhitneyQ4?.pValue)} \\\\
\\bottomrule
\\end{tabular}
\\end{table}

% TABLE III: Ovarian Morphology Subgroup Analysis (PCOS vs. NON-PCOS)
\\begin{table}[htbp]
\\centering
\\caption{Subgroup Performance Stratified by Ovarian Morphology (PCOS vs. NON-PCOS)}
\\label{tab:subgroup_morphology}
\\begin{tabular}{lcccc}
\\toprule
\\textbf{Morphology Subgroup} & \\textbf{Evaluated} & \\textbf{Accuracy} & \\textbf{Fooling Rate} & \\textbf{Realism Q2 (Real vs. Syn)} \\\\
\\midrule
PCOS & ${metrics.subgroups.pcos.totalEvaluated}/${metrics.subgroups.pcos.totalScans} & ${fmt(metrics.subgroups.pcos.decisiveAccuracy, '\\%')} & ${fmt(metrics.subgroups.pcos.foolingRate, '\\%')} & ${fmt(metrics.subgroups.pcos.meanRealismReal)} vs. ${fmt(metrics.subgroups.pcos.meanRealismSynthetic)} \\\\
NON-PCOS (Normal) & ${metrics.subgroups.nonPcos.totalEvaluated}/${metrics.subgroups.nonPcos.totalScans} & ${fmt(metrics.subgroups.nonPcos.decisiveAccuracy, '\\%')} & ${fmt(metrics.subgroups.nonPcos.foolingRate, '\\%')} & ${fmt(metrics.subgroups.nonPcos.meanRealismReal)} vs. ${fmt(metrics.subgroups.nonPcos.meanRealismSynthetic)} \\\\
\\bottomrule
\\end{tabular}
\\end{table}
`;
}

export function exportEvaluationsToCSV(
  images: UltrasoundImageItem[],
  evaluations: Record<string, ImageEvaluationResponse>,
  expertId: string
): void {
  const metrics = calculateRealtimeMetrics(images, evaluations);

  const summaryHeaders = [
    '=== EXECUTIVE EVALUATION SUMMARY (Q1 JOURNAL FORMAT) ===',
    `Expert / Radiologist ID: ${expertId || 'Anonymous'}`,
    `Generated At: ${new Date().toISOString()}`,
    `Total Scans: ${metrics.totalScans}`,
    `Completed Evaluations: ${metrics.totalEvaluated} (${metrics.completionRate}%)`,
    `Decisive Classification Accuracy: ${metrics.decisiveAccuracy != null ? `${metrics.decisiveAccuracy}% (95% CI: ${metrics.stats.accuracyCI95?.[0]}%-${metrics.stats.accuracyCI95?.[1]}%)` : 'N/A'}`,
    `Binomial Test vs. 50% Chance p-value: ${metrics.stats.binomialPValueVsChance ?? 'N/A'}`,
    `Overall Classification Accuracy: ${metrics.overallAccuracy != null ? `${metrics.overallAccuracy}%` : 'N/A'}`,
    `Synthetic Image Fooling Rate: ${metrics.foolingRate != null ? `${metrics.foolingRate}% (${metrics.syntheticFooledCount}/${metrics.totalSyntheticEvaluated}, 95% CI: ${metrics.stats.foolingRateCI95?.[0]}%-${metrics.stats.foolingRateCI95?.[1]}%)` : 'N/A'}`,
    `Sensitivity / Specificity / F1: ${metrics.diagnostic.sensitivity ?? 'N/A'}% / ${metrics.diagnostic.specificity ?? 'N/A'}% / ${metrics.diagnostic.f1Score ?? 'N/A'}%`,
    `Uncertainty Rate: ${metrics.uncertainRate}% (${metrics.uncertainCount} scans)`,
    `Mean Anatomical Realism (Q2 - Real vs Syn): ${metrics.meanRealismReal ?? 'N/A'} vs ${metrics.meanRealismSynthetic ?? 'N/A'} (Mann-Whitney p=${metrics.stats.mannWhitneyQ2?.pValue ?? 'N/A'})`,
    `Mean Image Artifacts (Q3 - Real vs Syn): ${metrics.meanArtifactsReal ?? 'N/A'} vs ${metrics.meanArtifactsSynthetic ?? 'N/A'} (Mann-Whitney p=${metrics.stats.mannWhitneyQ3?.pValue ?? 'N/A'})`,
    `Mean Clinical Plausibility (Q4 - Real vs Syn): ${metrics.meanPlausibilityReal ?? 'N/A'} vs ${metrics.meanPlausibilitySynthetic ?? 'N/A'} (Mann-Whitney p=${metrics.stats.mannWhitneyQ4?.pValue ?? 'N/A'})`,
    `Mean Decision Time (Real vs Syn): ${metrics.decisionTime.realMeanSec ?? 'N/A'}s vs ${metrics.decisionTime.syntheticMeanSec ?? 'N/A'}s`,
    '======================================================',
    '',
  ];

  const headers = [
    'Scan_Number',
    'Page_Number',
    'Slot_On_Page',
    'Image_ID',
    'File_Name',
    'Morphology',
    'Ground_Truth',
    'Expert_ID',
    'Experience_Tier',
    'Q1_Classification',
    'Evaluation_Outcome',
    'Q2_Anatomical_Realism_1to5',
    'Q3_Image_Artifacts_1to5',
    'Q4_Clinical_Plausibility_1to5',
    'Decision_Time_Sec',
    'Artifact_Tags',
    'Clinical_Notes',
    'Evaluated_At',
  ];

  const rows = images.map((img, index) => {
    const pageNum = Math.floor(index / 10) + 1;
    const slotNum = (index % 10) + 1;
    const e = evaluations[img.id] || ({} as Partial<ImageEvaluationResponse>);
    const gt = img.groundTruth || 'Unknown';

    let outcome = 'Pending';
    if (e.q1_classification) {
      if (e.q1_classification === 'Uncertain') {
        outcome = 'Uncertain';
      } else if (gt === 'Unknown') {
        outcome = e.q1_classification;
      } else if (e.q1_classification === gt) {
        outcome = 'Correct';
      } else if (gt === 'Synthetic' && e.q1_classification === 'Real') {
        outcome = 'FOOLED (Synthetic labelled Real)';
      } else {
        outcome = 'Missed';
      }
    }

    const decisionSec =
      e.decisionTimeMs && e.decisionTimeMs > 0 && e.decisionTimeMs < 600000
        ? (e.decisionTimeMs / 1000).toFixed(2)
        : '';

    return [
      index + 1,
      pageNum,
      slotNum,
      `"${img.id}"`,
      `"${img.fileName || img.id}"`,
      `"${img.morphology || ''}"`,
      `"${gt}"`,
      `"${expertId || 'Anonymous'}"`,
      `"${e.experienceTier || ''}"`,
      `"${e.q1_classification || 'Not Rated'}"`,
      `"${outcome}"`,
      e.q2_realism ?? '',
      e.q3_artifacts ?? '',
      e.q4_plausibility ?? '',
      decisionSec,
      `"${(e.artifactTags || []).join('; ')}"`,
      `"${(e.clinicalNotes || '').replace(/"/g, '""')}"`,
      `"${e.evaluatedAt || ''}"`,
    ].join(',');
  });

  const csvContent = '\uFEFF' + [...summaryHeaders, headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `Ultrasound_Turing_Evaluation_${expertId || 'Results'}_${new Date().toISOString().split('T')[0]}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportEvaluationsToJSON(
  images: UltrasoundImageItem[],
  evaluations: Record<string, ImageEvaluationResponse>,
  expertId: string
): void {
  const metrics = calculateRealtimeMetrics(images, evaluations);

  const scanRecords = images
    .filter((img) => {
      const e = evaluations[img.id];
      return Boolean(
        img.imageUrl ||
          (e &&
            (e.q1_classification != null ||
              e.q2_realism != null ||
              e.q3_artifacts != null ||
              e.q4_plausibility != null))
      );
    })
    .map((img, index) => {
      const e = evaluations[img.id] || ({} as Partial<ImageEvaluationResponse>);
      const gt = img.groundTruth || 'Unknown';

      let outcome = 'Pending';
      if (e.q1_classification) {
        if (e.q1_classification === 'Uncertain') {
          outcome = 'Uncertain';
        } else if (gt === 'Unknown') {
          outcome = e.q1_classification;
        } else if (e.q1_classification === gt) {
          outcome = 'Correct';
        } else if (gt === 'Synthetic' && e.q1_classification === 'Real') {
          outcome = 'FOOLED';
        } else {
          outcome = 'Missed';
        }
      }

      return {
        scanNumber: img.slotNumber || index + 1,
        imageId: img.id,
        fileName: img.fileName || img.id,
        morphology: img.morphology || null,
        groundTruth: gt,
        q1_classification: e.q1_classification ?? null,
        outcome,
        q2_realism: e.q2_realism ?? null,
        q3_artifacts: e.q3_artifacts ?? null,
        q4_plausibility: e.q4_plausibility ?? null,
        decisionTimeMs: e.decisionTimeMs ?? null,
        artifactTags: e.artifactTags || [],
        experienceTier: e.experienceTier || null,
        clinicalNotes: e.clinicalNotes || '',
        evaluatedAt: e.evaluatedAt || null,
      };
    });

  const payload = {
    metadata: {
      platform: 'UltrasoundTuring Visual Turing Test',
      expertId: expertId || 'Anonymous',
      exportedAt: new Date().toISOString(),
      totalConfiguredScans: images.filter((i) => Boolean(i.imageUrl)).length,
      totalEvaluated: metrics.totalEvaluated,
    },
    metricsSummary: metrics,
    evaluations: scanRecords,
  };

  const jsonContent = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `Ultrasound_Turing_Evaluation_${expertId || 'Results'}_${new Date().toISOString().split('T')[0]}.json`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
