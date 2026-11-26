import { 
  UltrasoundImageItem, 
  ImageEvaluationResponse, 
  RealtimeMetrics, 
  ConfusionMatrix 
} from '../types/evaluation';

export function calculateRealtimeMetrics(
  images: UltrasoundImageItem[],
  evaluations: Record<string, ImageEvaluationResponse>
): RealtimeMetrics {
  const imageMap = new Map<string, UltrasoundImageItem>();
  images.forEach((img) => imageMap.set(img.id, img));

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
        decisiveEvaluations++;

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
            // Fooled!
            syntheticFooledCount++;
            matrix.syntheticAsReal++;
          }
        }
      }

      // If ground truth is synthetic and uncertain, track total evaluated synthetic
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
  });

  const avg = (arr: number[]): number | null =>
    arr.length > 0 ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : null;

  const totalScans = images.filter((i) => Boolean(i.imageUrl)).length || images.length;
  const completionRate = totalScans > 0 ? Number(((totalEvaluated / totalScans) * 100).toFixed(1)) : 0;

  // Accuracy:
  // Decisive accuracy = Correct / (Decisive Predictions) * 100
  const decisiveAccuracy =
    decisiveEvaluations > 0 ? Number(((correctPredictions / decisiveEvaluations) * 100).toFixed(1)) : null;

  // Overall accuracy = Correct / (Total Q1 Evaluations with known GT) * 100
  const knownGtCount = images.filter(
    (img) => (img.groundTruth === 'Real' || img.groundTruth === 'Synthetic') && evaluations[img.id]?.q1_classification != null
  ).length;
  const overallAccuracy =
    knownGtCount > 0 ? Number(((correctPredictions / knownGtCount) * 100).toFixed(1)) : null;

  // Fooling Rate = (Synthetic images labelled Real) / (Total Synthetic Images Evaluated) * 100
  const foolingRate =
    totalSyntheticEvaluated > 0 ? Number(((syntheticFooledCount / totalSyntheticEvaluated) * 100).toFixed(1)) : null;

  // Uncertain Rate = Uncertain / Total Evaluated * 100
  const uncertainRate =
    totalEvaluated > 0 ? Number(((uncertainCount / totalEvaluated) * 100).toFixed(1)) : 0;

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
  };
}

export function exportEvaluationsToCSV(
  images: UltrasoundImageItem[],
  evaluations: Record<string, ImageEvaluationResponse>,
  expertId: string
): void {
  const metrics = calculateRealtimeMetrics(images, evaluations);

  const summaryHeaders = [
    '=== EXECUTIVE EVALUATION SUMMARY ===',
    `Expert / Radiologist ID: ${expertId || 'Anonymous'}`,
    `Generated At: ${new Date().toISOString()}`,
    `Total Scans: ${metrics.totalScans}`,
    `Completed Evaluations: ${metrics.totalEvaluated} (${metrics.completionRate}%)`,
    `Decisive Classification Accuracy: ${metrics.decisiveAccuracy != null ? `${metrics.decisiveAccuracy}%` : 'N/A (Set Ground Truth)'}`,
    `Overall Classification Accuracy: ${metrics.overallAccuracy != null ? `${metrics.overallAccuracy}%` : 'N/A'}`,
    `Synthetic Image Fooling Rate: ${metrics.foolingRate != null ? `${metrics.foolingRate}% (${metrics.syntheticFooledCount}/${metrics.totalSyntheticEvaluated})` : 'N/A'}`,
    `Uncertainty Rate: ${metrics.uncertainRate}% (${metrics.uncertainCount} scans)`,
    `Mean Anatomical Realism (Q2 - Real): ${metrics.meanRealismReal ?? 'N/A'}/5`,
    `Mean Anatomical Realism (Q2 - Synthetic): ${metrics.meanRealismSynthetic ?? 'N/A'}/5`,
    `Mean Clinical Plausibility (Q4 - Real): ${metrics.meanPlausibilityReal ?? 'N/A'}/5`,
    `Mean Clinical Plausibility (Q4 - Synthetic): ${metrics.meanPlausibilitySynthetic ?? 'N/A'}/5`,
    `Mean Image Artifacts (Q3 - Real): ${metrics.meanArtifactsReal ?? 'N/A'}/5`,
    `Mean Image Artifacts (Q3 - Synthetic): ${metrics.meanArtifactsSynthetic ?? 'N/A'}/5`,
    '====================================',
    '',
  ];

  const headers = [
    'Scan_Number',
    'Page_Number',
    'Slot_On_Page',
    'Image_ID',
    'File_Name',
    'Ground_Truth',
    'Expert_ID',
    'Q1_Classification',
    'Evaluation_Outcome',
    'Q2_Anatomical_Realism_1to5',
    'Q3_Image_Artifacts_1to5',
    'Q4_Clinical_Plausibility_1to5',
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

    return [
      index + 1,
      pageNum,
      slotNum,
      `"${img.id}"`,
      `"${img.fileName || img.id}"`,
      `"${gt}"`,
      `"${expertId || 'Anonymous'}"`,
      `"${e.q1_classification || 'Not Rated'}"`,
      `"${outcome}"`,
      e.q2_realism ?? '',
      e.q3_artifacts ?? '',
      e.q4_plausibility ?? '',
      `"${(e.clinicalNotes || '').replace(/"/g, '""')}"`,
      `"${e.evaluatedAt || ''}"`,
    ].join(',');
  });

  const csvContent = [...summaryHeaders, headers.join(','), ...rows].join('\n');
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
        groundTruth: gt,
        q1_classification: e.q1_classification ?? null,
        outcome,
        q2_realism: e.q2_realism ?? null,
        q3_artifacts: e.q3_artifacts ?? null,
        q4_plausibility: e.q4_plausibility ?? null,
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
