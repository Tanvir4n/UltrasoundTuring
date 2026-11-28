import type jsPDF from 'jspdf';
import {
  ImageEvaluationResponse,
  UltrasoundImageItem,
} from '../types/evaluation';
import { calculateRealtimeMetrics } from './metrics';
import { calculateExpertBreakdown, calculateInterRaterMetrics } from './statistics';

function getOutcomeLabel(
  gt: string,
  q1: string | null | undefined
): string {
  if (!q1) return 'Pending';
  if (q1 === 'Uncertain') return 'Uncertain';
  if (gt === 'Unknown') return q1;
  if (q1 === gt) return 'Correct';
  if (gt === 'Synthetic' && q1 === 'Real') return 'FOOLED';
  return 'Missed';
}

function getLastAutoTableY(doc: jsPDF, fallbackY: number): number {
  const internal = doc as unknown as { lastAutoTable?: { finalY?: number } };
  return internal.lastAutoTable?.finalY ?? fallbackY;
}

/**
 * Exports all Visual Turing Test metrics, hypothesis tests, subgroup breakdowns,
 * multi-reader Kappa, and image-by-image logs into a crisp, multi-page vector PDF.
 * Uses dynamic imports so jsPDF only loads when exporting (keeping initial bundle fast & low-memory).
 */
export async function exportFullReportToPDF(
  images: UltrasoundImageItem[],
  evaluations: Record<string, ImageEvaluationResponse>,
  expertId: string,
  experienceTier?: string,
  byExpert?: Record<string, Record<string, ImageEvaluationResponse>>
): Promise<void> {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const metrics = calculateRealtimeMetrics(images, evaluations);

  const activeKey = (expertId || 'Anonymous').trim() || 'Anonymous';
  const mergedByExpert: Record<string, Record<string, ImageEvaluationResponse>> = {
    ...(byExpert || {}),
    ...(Object.keys(evaluations).length > 0 ? { [activeKey]: evaluations } : {}),
  };
  const expertRows = calculateExpertBreakdown(images, mergedByExpert);
  const interRater = calculateInterRaterMetrics(mergedByExpert);

  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  const fmt = (v: number | null | undefined, suffix = '') =>
    v != null ? `${v}${suffix}` : '--';
  const fmtCI = (ci: [number, number] | null) =>
    ci ? `[${ci[0]}%, ${ci[1]}%]` : '--';
  const fmtP = (p: number | null | undefined) =>
    p == null ? '--' : p < 0.0001 ? '< 0.0001' : p.toFixed(4);
  const fmtLikert = (s: {
    mean: number | null;
    sd: number | null;
    median: number | null;
    iqr: [number, number] | null;
  }) => {
    if (s.mean == null) return '--';
    return `${s.mean.toFixed(2)} ± ${(s.sd ?? 0).toFixed(2)} (Med ${s.median}, IQR ${s.iqr?.[0]}-${s.iqr?.[1]})`;
  };

  // ==================== HEADER BANNER ====================
  doc.setFillColor(156, 219, 250); // #9CDBFA Neobrutalist Sky Blue
  doc.rect(margin, 12, pageWidth - margin * 2, 24, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.rect(margin, 12, pageWidth - margin * 2, 24, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('UltrasoundTuring: Visual Turing Test Evaluation Report', margin + 4, 21);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Observer ID: ${activeKey}  |  Role: ${experienceTier || 'Not Specified'}  |  Generated: ${new Date().toISOString().split('T')[0]}`,
    margin + 4,
    27
  );
  doc.text(
    `Study Protocol: Double-Blind Randomized 50/50 (${metrics.totalScans} Total Scans | ${metrics.totalEvaluated} Evaluated, ${metrics.completionRate}%)`,
    margin + 4,
    32
  );

  let cursorY = 43;

  // ==================== SECTION 1: CORE VTT & DIAGNOSTIC METRICS ====================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1. Classification & Diagnostic Performance Summary', margin, cursorY);

  autoTable(doc, {
    startY: cursorY + 3,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: { fillColor: [11, 19, 43], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, textColor: [17, 24, 39] },
    head: [['Evaluation Metric', 'Result', '95% CI / Detail']],
    body: [
      [
        'Decisive Classification Accuracy',
        fmt(metrics.decisiveAccuracy, '%'),
        `95% Wilson CI: ${fmtCI(metrics.stats.accuracyCI95)} (${metrics.correctPredictions}/${metrics.decisiveEvaluations})`,
      ],
      [
        'Binomial Test vs. 50% Chance (H0: p = 0.5)',
        `p = ${fmtP(metrics.stats.binomialPValueVsChance)}`,
        metrics.stats.binomialPValueVsChance != null
          ? metrics.stats.binomialPValueVsChance > 0.05
            ? 'Non-significant (Experts fooled at chance level)'
            : 'Statistically significant deviation from 50% chance'
          : '--',
      ],
      [
        'Synthetic Image Fooling Rate',
        fmt(metrics.foolingRate, '%'),
        `95% Wilson CI: ${fmtCI(metrics.stats.foolingRateCI95)} (${metrics.syntheticFooledCount}/${metrics.totalSyntheticEvaluated} fooled)`,
      ],
      ['Overall Accuracy (incl. Uncertain)', fmt(metrics.overallAccuracy, '%'), 'Includes inconclusive responses in denominator'],
      ['Uncertain Response Rate', `${metrics.uncertainRate}%`, `${metrics.uncertainCount} inconclusive scans`],
      ['Sensitivity (Synthetic Detection TPR)', fmt(metrics.diagnostic.sensitivity, '%'), 'Proportion of synthetic scans detected'],
      ['Specificity (Real Identification TNR)', fmt(metrics.diagnostic.specificity, '%'), 'Proportion of real scans identified'],
      ['PPV / NPV / F1-Score / Balanced Acc', `${fmt(metrics.diagnostic.ppv, '%')} / ${fmt(metrics.diagnostic.npv, '%')}`, `F1: ${fmt(metrics.diagnostic.f1Score, '%')} | Bal Acc: ${fmt(metrics.diagnostic.balancedAccuracy, '%')}`],
      [
        'Mean Decision Latency',
        metrics.decisionTime.overallMeanSec != null ? `${metrics.decisionTime.overallMeanSec} s/scan` : '--',
        `Real: ${fmt(metrics.decisionTime.realMeanSec, ' s')} | Synthetic: ${fmt(metrics.decisionTime.syntheticMeanSec, ' s')} | Fooled: ${fmt(metrics.decisionTime.fooledMeanSec, ' s')}`,
      ],
    ],
  });

  cursorY = getLastAutoTableY(doc, cursorY + 60) + 8;

  // ==================== SECTION 2: CONFUSION MATRIX ====================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. Confusion Matrix (Actual Ground Truth vs. Observer Decision)', margin, cursorY);

  autoTable(doc, {
    startY: cursorY + 3,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: { fillColor: [11, 19, 43], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, textColor: [17, 24, 39] },
    head: [['Actual Ground Truth', 'Labelled Real', 'Labelled Synthetic', 'Labelled Uncertain']],
    body: [
      [
        'Actual Real Scans',
        `${metrics.confusionMatrix.realAsReal} (Correct)`,
        `${metrics.confusionMatrix.realAsSynthetic} (Type I Error)`,
        `${metrics.confusionMatrix.realAsUncertain}`,
      ],
      [
        'Actual Synthetic Scans',
        `${metrics.confusionMatrix.syntheticAsReal} (FOOLED: ${metrics.foolingRate ?? 0}%)`,
        `${metrics.confusionMatrix.syntheticAsSynthetic} (Correct Detection)`,
        `${metrics.confusionMatrix.syntheticAsUncertain}`,
      ],
    ],
  });

  cursorY = getLastAutoTableY(doc, cursorY + 30) + 8;

  // ==================== SECTION 3: LIKERT & MANN-WHITNEY U ====================
  if (cursorY > 235) {
    doc.addPage();
    cursorY = 16;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3. Perceptual Quality & Artifact Comparison (Mann-Whitney U Test)', margin, cursorY);

  autoTable(doc, {
    startY: cursorY + 3,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: { fillColor: [11, 19, 43], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [17, 24, 39] },
    head: [['Criterion (1-5 Scale)', 'Real Scans (Mean ± SD / Med IQR)', 'Synthetic Scans (Mean ± SD / Med IQR)', 'U Stat', 'p-value']],
    body: [
      [
        'Q2: Anatomical Realism',
        fmtLikert(metrics.likertStats.q2Real),
        fmtLikert(metrics.likertStats.q2Synthetic),
        String(metrics.stats.mannWhitneyQ2?.uStatistic ?? '--'),
        fmtP(metrics.stats.mannWhitneyQ2?.pValue),
      ],
      [
        'Q3: Image Artifacts (lower=better)',
        fmtLikert(metrics.likertStats.q3Real),
        fmtLikert(metrics.likertStats.q3Synthetic),
        String(metrics.stats.mannWhitneyQ3?.uStatistic ?? '--'),
        fmtP(metrics.stats.mannWhitneyQ3?.pValue),
      ],
      [
        'Q4: Clinical Plausibility',
        fmtLikert(metrics.likertStats.q4Real),
        fmtLikert(metrics.likertStats.q4Synthetic),
        String(metrics.stats.mannWhitneyQ4?.uStatistic ?? '--'),
        fmtP(metrics.stats.mannWhitneyQ4?.pValue),
      ],
      [
        'Decision Latency (seconds)',
        fmt(metrics.decisionTime.realMeanSec, ' s'),
        fmt(metrics.decisionTime.syntheticMeanSec, ' s'),
        String(metrics.stats.mannWhitneyDecisionTime?.uStatistic ?? '--'),
        fmtP(metrics.stats.mannWhitneyDecisionTime?.pValue),
      ],
    ],
  });

  cursorY = getLastAutoTableY(doc, cursorY + 40) + 8;

  // ==================== SECTION 4: PCOS VS NON-PCOS SUBGROUPS ====================
  if (cursorY > 235) {
    doc.addPage();
    cursorY = 16;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('4. Ovarian Morphology Subgroup Analysis (PCOS vs. NON-PCOS)', margin, cursorY);

  autoTable(doc, {
    startY: cursorY + 3,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: { fillColor: [11, 19, 43], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [17, 24, 39] },
    head: [['Subgroup', 'Evaluated', 'Accuracy', 'Fooling Rate', 'Q2 Realism (R/S)', 'Q3 Artifacts (R/S)', 'Q4 Plaus. (R/S)']],
    body: [
      [
        'PCOS Morphology',
        `${metrics.subgroups.pcos.totalEvaluated}/${metrics.subgroups.pcos.totalScans}`,
        fmt(metrics.subgroups.pcos.decisiveAccuracy, '%'),
        fmt(metrics.subgroups.pcos.foolingRate, '%'),
        `${fmt(metrics.subgroups.pcos.meanRealismReal)} / ${fmt(metrics.subgroups.pcos.meanRealismSynthetic)}`,
        `${fmt(metrics.subgroups.pcos.meanArtifactsReal)} / ${fmt(metrics.subgroups.pcos.meanArtifactsSynthetic)}`,
        `${fmt(metrics.subgroups.pcos.meanPlausibilityReal)} / ${fmt(metrics.subgroups.pcos.meanPlausibilitySynthetic)}`,
      ],
      [
        'NON-PCOS (Normal)',
        `${metrics.subgroups.nonPcos.totalEvaluated}/${metrics.subgroups.nonPcos.totalScans}`,
        fmt(metrics.subgroups.nonPcos.decisiveAccuracy, '%'),
        fmt(metrics.subgroups.nonPcos.foolingRate, '%'),
        `${fmt(metrics.subgroups.nonPcos.meanRealismReal)} / ${fmt(metrics.subgroups.nonPcos.meanRealismSynthetic)}`,
        `${fmt(metrics.subgroups.nonPcos.meanArtifactsReal)} / ${fmt(metrics.subgroups.nonPcos.meanArtifactsSynthetic)}`,
        `${fmt(metrics.subgroups.nonPcos.meanPlausibilityReal)} / ${fmt(metrics.subgroups.nonPcos.meanPlausibilitySynthetic)}`,
      ],
    ],
  });

  cursorY = getLastAutoTableY(doc, cursorY + 35) + 8;

  // ==================== SECTION 5: ARTIFACT TAXONOMY & MULTI-READER ====================
  if (cursorY > 230) {
    doc.addPage();
    cursorY = 16;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('5. Artifact Failure Mode Taxonomy', margin, cursorY);

  autoTable(doc, {
    startY: cursorY + 3,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: { fillColor: [11, 19, 43], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [17, 24, 39] },
    head: [['Observed Diffusion / Ultrasound Artifact Category', 'Real Scans', 'Synthetic Scans', 'Total Mentions']],
    body: Object.entries(metrics.artifactTagCounts).map(([tag, c]) => [
      tag,
      String(c.real),
      String(c.synthetic),
      String(c.total),
    ]),
  });

  cursorY = getLastAutoTableY(doc, cursorY + 35) + 8;

  if (expertRows.length > 0) {
    if (cursorY > 225) {
      doc.addPage();
      cursorY = 16;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(
      `6. Multi-Reader Performance & Agreement (Fleiss kappa: ${interRater.fleissKappa ?? '--'}, Cohen kappa: ${interRater.pairwiseCohenKappaMean ?? '--'}, Agree: ${fmt(interRater.percentAgreement, '%')})`,
      margin,
      cursorY
    );

    autoTable(doc, {
      startY: cursorY + 3,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [11, 19, 43], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      bodyStyles: { fontSize: 7.5, textColor: [17, 24, 39] },
      head: [['Expert ID', 'Role', 'Eval.', 'Acc.', 'Fooling', 'Uncert.', 'Q2/Q3/Q4', 'Latency']],
      body: expertRows.map((r) => [
        r.expertId,
        r.experienceTier || '--',
        String(r.totalEvaluated),
        fmt(r.decisiveAccuracy, '%'),
        fmt(r.foolingRate, '%'),
        `${r.uncertainRate}%`,
        `${r.meanRealism ?? '-'}/${r.meanArtifacts ?? '-'}/${r.meanPlausibility ?? '-'}`,
        r.meanDecisionSec != null ? `${r.meanDecisionSec}s` : '--',
      ]),
    });

    cursorY = getLastAutoTableY(doc, cursorY + 35) + 8;
  }

  // ==================== SECTION 7: SCAN-BY-SCAN APPENDIX (ALL 100 SCANS) ====================
  const evaluatedScans = images.filter((img) => {
    const e = evaluations[img.id];
    return Boolean(
      e &&
        (e.q1_classification != null ||
          e.q2_realism != null ||
          e.q3_artifacts != null ||
          e.q4_plausibility != null)
    );
  });

  if (images.length > 0) {
    doc.addPage();
    cursorY = 16;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(
      `Appendix: Entire Dataset Scan-by-Scan Log (${evaluatedScans.length} Evaluated / ${images.length} Total Across Pages 1-10)`,
      margin,
      cursorY
    );

    autoTable(doc, {
      startY: cursorY + 3,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [11, 19, 43], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.5 },
      bodyStyles: { fontSize: 6.5, textColor: [17, 24, 39] },
      head: [['#', 'Pg', 'Scan ID', 'Pathology', 'Truth', 'Answer', 'Outcome', 'Q2/Q3/Q4', 'Time', 'Tags & Notes']],
      body: images.map((img, idx) => {
        const pageNum = Math.floor(idx / 10) + 1;
        const e = evaluations[img.id];
        const gt = img.groundTruth || 'Unknown';
        const outcome = getOutcomeLabel(gt, e?.q1_classification);
        const lat = e?.decisionTimeMs ? `${(e.decisionTimeMs / 1000).toFixed(1)}s` : '--';
        const notesParts = [...(e?.artifactTags || []), e?.clinicalNotes || ''].filter(Boolean).join('; ');
        return [
          String(idx + 1),
          `P${pageNum}`,
          img.id,
          img.morphology || '--',
          gt,
          e?.q1_classification || '--',
          outcome,
          `${e?.q2_realism ?? '-'}/${e?.q3_artifacts ?? '-'}/${e?.q4_plausibility ?? '-'}`,
          lat,
          notesParts || '--',
        ];
      }),
    });
  }

  // Add page numbers to every page footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `UltrasoundTuring Visual Turing Test Report  •  Page ${i} of ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  const fileName = `Ultrasound_Turing_Full_Report_${activeKey}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

/**
 * Exports all results, statistical tables, charts summary, and image-by-image logs
 * into a styled Microsoft Word / Google Docs (.doc) document ready for manuscript editing.
 */
export function exportFullReportToWord(
  images: UltrasoundImageItem[],
  evaluations: Record<string, ImageEvaluationResponse>,
  expertId: string,
  experienceTier?: string,
  byExpert?: Record<string, Record<string, ImageEvaluationResponse>>
): void {
  const metrics = calculateRealtimeMetrics(images, evaluations);
  const activeKey = (expertId || 'Anonymous').trim() || 'Anonymous';
  const mergedByExpert: Record<string, Record<string, ImageEvaluationResponse>> = {
    ...(byExpert || {}),
    ...(Object.keys(evaluations).length > 0 ? { [activeKey]: evaluations } : {}),
  };
  const expertRows = calculateExpertBreakdown(images, mergedByExpert);
  const interRater = calculateInterRaterMetrics(mergedByExpert);

  const fmt = (v: number | null | undefined, suffix = '') =>
    v != null ? `${v}${suffix}` : '--';
  const fmtCI = (ci: [number, number] | null) =>
    ci ? `[${ci[0]}%, ${ci[1]}%]` : '--';
  const fmtP = (p: number | null | undefined) =>
    p == null ? '--' : p < 0.0001 ? '< 0.0001' : p.toFixed(4);
  const fmtLikert = (s: {
    mean: number | null;
    sd: number | null;
    median: number | null;
    iqr: [number, number] | null;
  }) => {
    if (s.mean == null) return '--';
    return `${s.mean.toFixed(2)} ± ${(s.sd ?? 0).toFixed(2)} (Med ${s.median}, IQR ${s.iqr?.[0]}–${s.iqr?.[1]})`;
  };

  const evaluatedScans = images.filter((img) => {
    const e = evaluations[img.id];
    return Boolean(
      e &&
        (e.q1_classification != null ||
          e.q2_realism != null ||
          e.q3_artifacts != null ||
          e.q4_plausibility != null)
    );
  });

  const html = `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>UltrasoundTuring Visual Turing Test Report</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; color: #111827; line-height: 1.45; margin: 24px; }
  .header-box { background: #9CDBFA; border: 2px solid #000000; padding: 16px; margin-bottom: 18px; }
  h1 { margin: 0 0 6px 0; font-size: 20pt; color: #000000; }
  h2 { font-size: 13pt; color: #0B132B; border-bottom: 2px solid #000000; padding-bottom: 4px; margin-top: 22px; }
  .meta { font-size: 10pt; color: #111827; margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 14px; font-size: 9.5pt; }
  th { background-color: #0B132B; color: #FFFFFF; font-weight: bold; text-align: left; padding: 7px 8px; border: 1px solid #000000; }
  td { padding: 6px 8px; border: 1px solid #334155; vertical-align: top; }
  tr:nth-child(even) td { background-color: #F8FAFC; }
  .badge-correct { background-color: #DCFCE7; color: #14532D; font-weight: bold; }
  .badge-fooled { background-color: #E0F2FE; color: #0369A1; font-weight: bold; }
  .badge-uncertain { background-color: #FEF9C3; color: #713F12; font-weight: bold; }
  .badge-missed { background-color: #FFE4E6; color: #881337; font-weight: bold; }
</style>
</head>
<body>
  <div class="header-box">
    <h1>UltrasoundTuring: Visual Turing Test Full Report</h1>
    <p class="meta"><strong>Observer ID:</strong> ${activeKey} &nbsp;|&nbsp; <strong>Role:</strong> ${experienceTier || 'Not Specified'} &nbsp;|&nbsp; <strong>Date:</strong> ${new Date().toISOString().split('T')[0]}</p>
    <p class="meta"><strong>Study Design:</strong> Double-Blind Randomized 50/50 Ovarian Ultrasound Assessment (${metrics.totalScans} Scans &bull; ${metrics.totalEvaluated} Evaluated, ${metrics.completionRate}%)</p>
  </div>

  <h2>1. Classification &amp; Diagnostic Performance Summary</h2>
  <table>
    <thead>
      <tr><th>Metric</th><th>Value</th><th>95% CI / Statistical Interpretation</th></tr>
    </thead>
    <tbody>
      <tr><td>Decisive Classification Accuracy</td><td><strong>${fmt(metrics.decisiveAccuracy, '%')}</strong></td><td>95% Wilson CI: ${fmtCI(metrics.stats.accuracyCI95)} (${metrics.correctPredictions}/${metrics.decisiveEvaluations})</td></tr>
      <tr><td>Binomial Test vs. Random Chance (50%)</td><td><strong>p = ${fmtP(metrics.stats.binomialPValueVsChance)}</strong></td><td>${metrics.stats.binomialPValueVsChance != null ? (metrics.stats.binomialPValueVsChance > 0.05 ? 'Non-significant (experts unable to distinguish above chance)' : 'Statistically different from 50% chance') : '--'}</td></tr>
      <tr><td>Synthetic Image Fooling Rate</td><td><strong>${fmt(metrics.foolingRate, '%')}</strong></td><td>95% Wilson CI: ${fmtCI(metrics.stats.foolingRateCI95)} (${metrics.syntheticFooledCount}/${metrics.totalSyntheticEvaluated} fooled)</td></tr>
      <tr><td>Overall Accuracy (incl. Uncertain)</td><td>${fmt(metrics.overallAccuracy, '%')}</td><td>Includes uncertain responses</td></tr>
      <tr><td>Uncertain Response Rate</td><td>${metrics.uncertainRate}%</td><td>${metrics.uncertainCount} inconclusive scans</td></tr>
      <tr><td>Sensitivity / Specificity / F1 / Bal. Acc</td><td>${fmt(metrics.diagnostic.sensitivity, '%')} / ${fmt(metrics.diagnostic.specificity, '%')}</td><td>PPV: ${fmt(metrics.diagnostic.ppv, '%')} | NPV: ${fmt(metrics.diagnostic.npv, '%')} | F1: ${fmt(metrics.diagnostic.f1Score, '%')} | Bal Acc: ${fmt(metrics.diagnostic.balancedAccuracy, '%')}</td></tr>
      <tr><td>Mean Decision Latency</td><td>${fmt(metrics.decisionTime.overallMeanSec, ' s')}</td><td>Real: ${fmt(metrics.decisionTime.realMeanSec, ' s')} vs. Synthetic: ${fmt(metrics.decisionTime.syntheticMeanSec, ' s')} (Fooled: ${fmt(metrics.decisionTime.fooledMeanSec, ' s')})</td></tr>
    </tbody>
  </table>

  <h2>2. Confusion Matrix</h2>
  <table>
    <thead>
      <tr><th>Actual Ground Truth</th><th>Labelled Real</th><th>Labelled Synthetic</th><th>Labelled Uncertain</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Actual Real Scans</strong></td>
        <td class="badge-correct">${metrics.confusionMatrix.realAsReal} (Correct)</td>
        <td class="badge-missed">${metrics.confusionMatrix.realAsSynthetic} (Type I Error)</td>
        <td class="badge-uncertain">${metrics.confusionMatrix.realAsUncertain}</td>
      </tr>
      <tr>
        <td><strong>Actual Synthetic Scans</strong></td>
        <td class="badge-fooled">${metrics.confusionMatrix.syntheticAsReal} (FOOLED: ${metrics.foolingRate ?? 0}%)</td>
        <td class="badge-correct">${metrics.confusionMatrix.syntheticAsSynthetic} (Correct Detection)</td>
        <td class="badge-uncertain">${metrics.confusionMatrix.syntheticAsUncertain}</td>
      </tr>
    </tbody>
  </table>

  <h2>3. Perceptual Quality &amp; Mann–Whitney U Hypothesis Testing</h2>
  <table>
    <thead>
      <tr><th>Criterion (1–5 Scale)</th><th>Real Scans (Mean &plusmn; SD / Med [IQR])</th><th>Synthetic Scans (Mean &plusmn; SD / Med [IQR])</th><th>Mann–Whitney U</th><th>p-value</th></tr>
    </thead>
    <tbody>
      <tr><td>Q2: Anatomical Realism (&uarr; better)</td><td>${fmtLikert(metrics.likertStats.q2Real)}</td><td>${fmtLikert(metrics.likertStats.q2Synthetic)}</td><td>${metrics.stats.mannWhitneyQ2?.uStatistic ?? '--'}</td><td><strong>${fmtP(metrics.stats.mannWhitneyQ2?.pValue)}</strong></td></tr>
      <tr><td>Q3: Image Artifacts (&darr; cleaner)</td><td>${fmtLikert(metrics.likertStats.q3Real)}</td><td>${fmtLikert(metrics.likertStats.q3Synthetic)}</td><td>${metrics.stats.mannWhitneyQ3?.uStatistic ?? '--'}</td><td><strong>${fmtP(metrics.stats.mannWhitneyQ3?.pValue)}</strong></td></tr>
      <tr><td>Q4: Clinical Plausibility (&uarr; better)</td><td>${fmtLikert(metrics.likertStats.q4Real)}</td><td>${fmtLikert(metrics.likertStats.q4Synthetic)}</td><td>${metrics.stats.mannWhitneyQ4?.uStatistic ?? '--'}</td><td><strong>${fmtP(metrics.stats.mannWhitneyQ4?.pValue)}</strong></td></tr>
      <tr><td>Decision Latency (seconds)</td><td>${fmt(metrics.decisionTime.realMeanSec, ' s')}</td><td>${fmt(metrics.decisionTime.syntheticMeanSec, ' s')}</td><td>${metrics.stats.mannWhitneyDecisionTime?.uStatistic ?? '--'}</td><td><strong>${fmtP(metrics.stats.mannWhitneyDecisionTime?.pValue)}</strong></td></tr>
    </tbody>
  </table>

  <h2>4. Ovarian Morphology Subgroup Analysis (PCOS vs. NON-PCOS)</h2>
  <table>
    <thead>
      <tr><th>Subgroup</th><th>Evaluated</th><th>Accuracy</th><th>Fooling Rate</th><th>Q2 Realism (R / S)</th><th>Q3 Artifacts (R / S)</th><th>Q4 Plausibility (R / S)</th></tr>
    </thead>
    <tbody>
      <tr><td><strong>PCOS Morphology</strong></td><td>${metrics.subgroups.pcos.totalEvaluated}/${metrics.subgroups.pcos.totalScans}</td><td>${fmt(metrics.subgroups.pcos.decisiveAccuracy, '%')}</td><td>${fmt(metrics.subgroups.pcos.foolingRate, '%')}</td><td>${fmt(metrics.subgroups.pcos.meanRealismReal)} / ${fmt(metrics.subgroups.pcos.meanRealismSynthetic)}</td><td>${fmt(metrics.subgroups.pcos.meanArtifactsReal)} / ${fmt(metrics.subgroups.pcos.meanArtifactsSynthetic)}</td><td>${fmt(metrics.subgroups.pcos.meanPlausibilityReal)} / ${fmt(metrics.subgroups.pcos.meanPlausibilitySynthetic)}</td></tr>
      <tr><td><strong>NON-PCOS (Normal)</strong></td><td>${metrics.subgroups.nonPcos.totalEvaluated}/${metrics.subgroups.nonPcos.totalScans}</td><td>${fmt(metrics.subgroups.nonPcos.decisiveAccuracy, '%')}</td><td>${fmt(metrics.subgroups.nonPcos.foolingRate, '%')}</td><td>${fmt(metrics.subgroups.nonPcos.meanRealismReal)} / ${fmt(metrics.subgroups.nonPcos.meanRealismSynthetic)}</td><td>${fmt(metrics.subgroups.nonPcos.meanArtifactsReal)} / ${fmt(metrics.subgroups.nonPcos.meanArtifactsSynthetic)}</td><td>${fmt(metrics.subgroups.nonPcos.meanPlausibilityReal)} / ${fmt(metrics.subgroups.nonPcos.meanPlausibilitySynthetic)}</td></tr>
    </tbody>
  </table>

  <h2>5. Artifact Failure Mode Taxonomy</h2>
  <table>
    <thead>
      <tr><th>Artifact Category</th><th>Real Scans</th><th>Synthetic Scans</th><th>Total</th></tr>
    </thead>
    <tbody>
      ${Object.entries(metrics.artifactTagCounts)
        .map(
          ([tag, c]) =>
            `<tr><td>${tag}</td><td>${c.real}</td><td>${c.synthetic}</td><td><strong>${c.total}</strong></td></tr>`
        )
        .join('')}
    </tbody>
  </table>

  ${
    expertRows.length > 0
      ? `
  <h2>6. Multi-Reader Stratification &amp; Inter-Rater Agreement</h2>
  <p class="meta"><strong>Fleiss' &kappa;:</strong> ${interRater.fleissKappa ?? '--'} &nbsp;|&nbsp; <strong>Mean Pairwise Cohen's &kappa;:</strong> ${interRater.pairwiseCohenKappaMean ?? '--'} &nbsp;|&nbsp; <strong>Raw Agreement:</strong> ${fmt(interRater.percentAgreement, '%')} (${interRater.sharedScansCount} shared scans)</p>
  <table>
    <thead>
      <tr><th>Expert ID</th><th>Experience Role</th><th>Evaluated</th><th>Accuracy</th><th>Fooling Rate</th><th>Uncertain %</th><th>Mean Q2/Q3/Q4</th><th>Latency</th></tr>
    </thead>
    <tbody>
      ${expertRows
        .map(
          (r) =>
            `<tr><td><strong>${r.expertId}</strong></td><td>${r.experienceTier || '--'}</td><td>${r.totalEvaluated}</td><td>${fmt(r.decisiveAccuracy, '%')}</td><td>${fmt(r.foolingRate, '%')}</td><td>${r.uncertainRate}%</td><td>${r.meanRealism ?? '--'} / ${r.meanArtifacts ?? '--'} / ${r.meanPlausibility ?? '--'}</td><td>${r.meanDecisionSec != null ? `${r.meanDecisionSec}s` : '--'}</td></tr>`
        )
        .join('')}
    </tbody>
  </table>
  `
      : ''
  }

  <h2>7. Entire Dataset Scan-by-Scan Log (${evaluatedScans.length} Evaluated / ${images.length} Total Across Pages 1–10)</h2>
  <table>
    <thead>
      <tr><th>#</th><th>Page</th><th>Scan ID</th><th>Pathology</th><th>Ground Truth</th><th>Q1 Answer</th><th>Outcome</th><th>Q2/Q3/Q4</th><th>Latency</th><th>Artifact Tags &amp; Notes</th></tr>
    </thead>
    <tbody>
      ${images
        .map((img, idx) => {
          const pageNum = Math.floor(idx / 10) + 1;
          const e = evaluations[img.id];
          const gt = img.groundTruth || 'Unknown';
          const outcome = getOutcomeLabel(gt, e?.q1_classification);
          const badgeClass =
            outcome === 'Correct'
              ? 'badge-correct'
              : outcome === 'FOOLED'
              ? 'badge-fooled'
              : outcome === 'Uncertain'
              ? 'badge-uncertain'
              : outcome === 'Missed'
              ? 'badge-missed'
              : '';
          const lat = e?.decisionTimeMs ? `${(e.decisionTimeMs / 1000).toFixed(1)}s` : '--';
          const notesParts = [...(e?.artifactTags || []), e?.clinicalNotes || ''].filter(Boolean).join('; ');
          return `<tr><td>${idx + 1}</td><td>P${pageNum}</td><td><strong>${img.id}</strong></td><td>${img.morphology || '--'}</td><td>${gt}</td><td>${e?.q1_classification || '--'}</td><td class="${badgeClass}">${outcome}</td><td>${e?.q2_realism ?? '-'}/${e?.q3_artifacts ?? '-'}/${e?.q4_plausibility ?? '-'}</td><td>${lat}</td><td>${notesParts || '--'}</td></tr>`;
        })
        .join('')}
    </tbody>
  </table>
</body>
</html>
`;

  const blob = new Blob(['\uFEFF', html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `Ultrasound_Turing_Full_Report_${activeKey}_${new Date().toISOString().split('T')[0]}.doc`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
