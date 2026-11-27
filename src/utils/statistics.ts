import {
  ConfusionMatrix,
  DiagnosticMetrics,
  ExpertPerformanceRow,
  ImageEvaluationResponse,
  InterRaterMetrics,
  LikertStats,
  StatisticalTestResult,
  UltrasoundImageItem,
} from '../types/evaluation';

/**
 * Wilson Score 95% Confidence Interval for a binomial proportion (returned as [low%, high%]).
 */
export function wilsonCI95(k: number, n: number): [number, number] | null {
  if (n <= 0) return null;
  const z = 1.959964;
  const p = k / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  const low = Math.max(0, Math.round((center - margin) * 1000) / 10);
  const high = Math.min(100, Math.round((center + margin) * 1000) / 10);
  return [low, high];
}

function logFactorial(n: number): number {
  let sum = 0;
  for (let i = 2; i <= n; i++) {
    sum += Math.log(i);
  }
  return sum;
}

function logBinomialCoeff(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity;
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
}

/**
 * Exact two-tailed Binomial Test p-value against H0: p = 0.50 (random chance).
 * Returns null if n === 0.
 */
export function exactBinomialPValueVsHalf(k: number, n: number): number | null {
  if (n <= 0) return null;
  const tailCutoff = Math.min(k, n - k);
  const logHalfN = n * Math.log(0.5);
  let oneTail = 0;

  for (let i = 0; i <= tailCutoff; i++) {
    oneTail += Math.exp(logBinomialCoeff(n, i) + logHalfN);
  }

  const pVal = Math.min(1, 2 * oneTail);
  return Number(pVal.toFixed(4));
}

/**
 * Standard normal complementary error function erfc(x) approximation (Abramowitz & Stegun).
 */
function erfcApprox(x: number): number {
  const absX = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * absX);
  const poly =
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t);
  const res = poly * Math.exp(-absX * absX);
  return x >= 0 ? res : 2 - res;
}

function quantileSorted(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

/**
 * Computes Mean, Sample SD, Median, and IQR [Q1, Q3] for ordinal/continuous samples.
 */
export function computeLikertStats(values: number[]): LikertStats {
  const n = values.length;
  if (n === 0) {
    return { count: 0, mean: null, sd: null, median: null, iqr: null };
  }

  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = n > 1 ? values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1) : 0;
  const sd = Math.sqrt(variance);

  const sorted = [...values].sort((a, b) => a - b);
  const median = quantileSorted(sorted, 0.5);
  const q1 = quantileSorted(sorted, 0.25);
  const q3 = quantileSorted(sorted, 0.75);

  return {
    count: n,
    mean: Math.round(mean * 100) / 100,
    sd: Math.round(sd * 100) / 100,
    median: Math.round(median * 100) / 100,
    iqr: [Math.round(q1 * 100) / 100, Math.round(q3 * 100) / 100],
  };
}

/**
 * Non-parametric Mann-Whitney U test with tie correction for ordinal Likert / skewed latency scores.
 */
export function mannWhitneyU(sampleA: number[], sampleB: number[]): StatisticalTestResult | null {
  const n1 = sampleA.length;
  const n2 = sampleB.length;
  if (n1 < 2 || n2 < 2) return null;

  const combined = [
    ...sampleA.map((val) => ({ val, group: 1 })),
    ...sampleB.map((val) => ({ val, group: 2 })),
  ].sort((a, b) => a.val - b.val);

  const N = n1 + n2;
  const ranks = new Array<number>(N);
  const tieCounts: number[] = [];

  let i = 0;
  while (i < N) {
    let j = i;
    while (j + 1 < N && combined[j + 1].val === combined[i].val) {
      j++;
    }
    const avgRank = (i + 1 + (j + 1)) / 2;
    for (let k = i; k <= j; k++) {
      ranks[k] = avgRank;
    }
    const tieLen = j - i + 1;
    if (tieLen > 1) tieCounts.push(tieLen);
    i = j + 1;
  }

  let r1 = 0;
  for (let idx = 0; idx < N; idx++) {
    if (combined[idx].group === 1) r1 += ranks[idx];
  }

  const u1 = r1 - (n1 * (n1 + 1)) / 2;
  const u2 = n1 * n2 - u1;
  const uStat = Math.min(u1, u2);

  const muU = (n1 * n2) / 2;
  const tieSum = tieCounts.reduce((acc, t) => acc + (t * t * t - t), 0);
  const denomTerm = N * (N - 1);
  const sigmaU = Math.sqrt(
    Math.max(0, ((n1 * n2) / 12) * (N + 1 - (denomTerm > 0 ? tieSum / denomTerm : 0)))
  );

  if (sigmaU === 0) {
    return { uStatistic: Math.round(uStat * 10) / 10, zScore: 0, pValue: 1 };
  }

  const z = (uStat - muU) / sigmaU;
  const pVal = Math.min(1, erfcApprox(Math.abs(z) / Math.SQRT2));

  return {
    uStatistic: Math.round(uStat * 10) / 10,
    zScore: Math.round(z * 1000) / 1000,
    pValue: Number(pVal.toFixed(4)),
  };
}

/**
 * Calculates Sensitivity (Synthetic Detection TPR), Specificity (Real TNR), PPV, NPV, F1, Balanced Accuracy.
 * Positive class = Synthetic, Negative class = Real (among decisive responses).
 */
export function calculateDiagnosticMetrics(m: ConfusionMatrix): DiagnosticMetrics {
  const tp = m.syntheticAsSynthetic;
  const fn = m.syntheticAsReal; // Fooled!
  const tn = m.realAsReal;
  const fp = m.realAsSynthetic;

  const sensitivity = tp + fn > 0 ? Math.round((tp / (tp + fn)) * 1000) / 10 : null;
  const specificity = tn + fp > 0 ? Math.round((tn / (tn + fp)) * 1000) / 10 : null;
  const ppv = tp + fp > 0 ? Math.round((tp / (tp + fp)) * 1000) / 10 : null;
  const npv = tn + fn > 0 ? Math.round((tn / (tn + fn)) * 1000) / 10 : null;

  const f1Score =
    2 * tp + fp + fn > 0 ? Math.round(((2 * tp) / (2 * tp + fp + fn)) * 1000) / 10 : null;

  const balancedAccuracy =
    sensitivity != null && specificity != null
      ? Math.round(((sensitivity + specificity) / 2) * 10) / 10
      : null;

  return { sensitivity, specificity, ppv, npv, f1Score, balancedAccuracy };
}

function cohenKappaTwoRaters(pairs: Array<[string, string]>): number | null {
  const n = pairs.length;
  if (n === 0) return null;

  const categories = ['Real', 'Synthetic', 'Uncertain'];
  let agree = 0;
  const countA: Record<string, number> = { Real: 0, Synthetic: 0, Uncertain: 0 };
  const countB: Record<string, number> = { Real: 0, Synthetic: 0, Uncertain: 0 };

  for (const [a, b] of pairs) {
    if (a === b) agree++;
    if (countA[a] !== undefined) countA[a]++;
    if (countB[b] !== undefined) countB[b]++;
  }

  const po = agree / n;
  let pe = 0;
  for (const c of categories) {
    pe += (countA[c] / n) * (countB[c] / n);
  }

  if (pe >= 1) return po >= 1 ? 1 : 0;
  return (po - pe) / (1 - pe);
}

/**
 * Computes Fleiss' Kappa, mean pairwise Cohen's Kappa, and Percent Agreement across multiple experts.
 */
export function calculateInterRaterMetrics(
  byExpert: Record<string, Record<string, ImageEvaluationResponse>>
): InterRaterMetrics {
  const expertIds = Object.keys(byExpert).filter(
    (eid) => Object.keys(byExpert[eid] || {}).length > 0
  );

  if (expertIds.length < 2) {
    return {
      expertCount: expertIds.length,
      sharedScansCount: 0,
      percentAgreement: null,
      fleissKappa: null,
      pairwiseCohenKappaMean: null,
    };
  }

  // Gather all image IDs evaluated by at least 2 experts
  const scanVotes = new Map<string, Record<string, string>>();
  for (const eid of expertIds) {
    const evalMap = byExpert[eid] || {};
    for (const [imgId, resp] of Object.entries(evalMap)) {
      if (resp?.q1_classification) {
        if (!scanVotes.has(imgId)) scanVotes.set(imgId, {});
        scanVotes.get(imgId)![eid] = resp.q1_classification;
      }
    }
  }

  const sharedScans = Array.from(scanVotes.entries()).filter(
    ([, votes]) => Object.keys(votes).length >= 2
  );

  if (sharedScans.length === 0) {
    return {
      expertCount: expertIds.length,
      sharedScansCount: 0,
      percentAgreement: null,
      fleissKappa: null,
      pairwiseCohenKappaMean: null,
    };
  }

  // Pairwise percent agreement & pairwise Cohen's Kappa
  const kappas: number[] = [];
  let pairwiseAgreeTotal = 0;
  let pairwisePairsTotal = 0;

  for (let i = 0; i < expertIds.length; i++) {
    for (let j = i + 1; j < expertIds.length; j++) {
      const eA = expertIds[i];
      const eB = expertIds[j];
      const pairs: Array<[string, string]> = [];
      for (const [, votes] of sharedScans) {
        if (votes[eA] && votes[eB]) {
          pairs.push([votes[eA], votes[eB]]);
        }
      }
      if (pairs.length > 0) {
        const agreeCount = pairs.filter(([a, b]) => a === b).length;
        pairwiseAgreeTotal += agreeCount;
        pairwisePairsTotal += pairs.length;
        const k = cohenKappaTwoRaters(pairs);
        if (k != null) kappas.push(k);
      }
    }
  }

  // Fleiss' Kappa for scans rated by all experts (or using uniform largest subset where >= 2)
  // Standard Fleiss' Kappa requires fixed number of raters m per subject
  const categories = ['Real', 'Synthetic', 'Uncertain'];
  const maxRaters = Math.max(...sharedScans.map(([, v]) => Object.keys(v).length));
  const fleissSubjects = sharedScans.filter(([, v]) => Object.keys(v).length === maxRaters);

  let fleissKappa: number | null = null;
  if (fleissSubjects.length >= 2 && maxRaters >= 2) {
    const N = fleissSubjects.length;
    const n = maxRaters;
    const catTotals: Record<string, number> = { Real: 0, Synthetic: 0, Uncertain: 0 };
    let pBarSum = 0;

    for (const [, votes] of fleissSubjects) {
      const vals = Object.values(votes);
      const subjectCounts: Record<string, number> = { Real: 0, Synthetic: 0, Uncertain: 0 };
      for (const v of vals) {
        if (subjectCounts[v] !== undefined) {
          subjectCounts[v]++;
          catTotals[v]++;
        }
      }
      let sumSq = 0;
      for (const c of categories) {
        sumSq += subjectCounts[c] * subjectCounts[c];
      }
      const pSubj = (sumSq - n) / (n * (n - 1));
      pBarSum += pSubj;
    }

    const pBar = pBarSum / N;
    let pE = 0;
    for (const c of categories) {
      const pj = catTotals[c] / (N * n);
      pE += pj * pj;
    }
    if (pE < 1) {
      fleissKappa = Math.round(((pBar - pE) / (1 - pE)) * 1000) / 1000;
    }
  }

  const percentAgreement =
    pairwisePairsTotal > 0 ? Math.round((pairwiseAgreeTotal / pairwisePairsTotal) * 1000) / 10 : null;
  const pairwiseCohenKappaMean =
    kappas.length > 0
      ? Math.round((kappas.reduce((a, b) => a + b, 0) / kappas.length) * 1000) / 1000
      : null;

  return {
    expertCount: expertIds.length,
    sharedScansCount: sharedScans.length,
    percentAgreement,
    fleissKappa,
    pairwiseCohenKappaMean,
  };
}

/**
 * Generates an Expert-wise performance comparison table from multi-reader data.
 */
export function calculateExpertBreakdown(
  images: UltrasoundImageItem[],
  byExpert: Record<string, Record<string, ImageEvaluationResponse>>
): ExpertPerformanceRow[] {
  const imageMap = new Map<string, UltrasoundImageItem>();
  images.forEach((img) => imageMap.set(img.id, img));

  const rows: ExpertPerformanceRow[] = [];

  for (const [expertId, evalMap] of Object.entries(byExpert)) {
    const responses = Object.values(evalMap || {});
    if (responses.length === 0) continue;

    let totalEvaluated = 0;
    let decisive = 0;
    let correct = 0;
    let uncertain = 0;
    let synEval = 0;
    let synFooled = 0;
    let experienceTier: string | undefined;

    const q2: number[] = [];
    const q3: number[] = [];
    const q4: number[] = [];
    const timesSec: number[] = [];

    for (const resp of responses) {
      const hasAny =
        resp.q1_classification != null ||
        resp.q2_realism != null ||
        resp.q3_artifacts != null ||
        resp.q4_plausibility != null;
      if (!hasAny) continue;

      totalEvaluated++;
      if (resp.experienceTier) experienceTier = resp.experienceTier;

      const gt = imageMap.get(resp.imageId)?.groundTruth || 'Unknown';

      if (resp.q1_classification) {
        if (resp.q1_classification === 'Uncertain') {
          uncertain++;
          if (gt === 'Synthetic') synEval++;
        } else {
          if (gt === 'Real' || gt === 'Synthetic') {
            decisive++;
            if (resp.q1_classification === gt) correct++;
          }
          if (gt === 'Synthetic') {
            synEval++;
            if (resp.q1_classification === 'Real') synFooled++;
          }
        }
      }

      if (resp.q2_realism != null) q2.push(resp.q2_realism);
      if (resp.q3_artifacts != null) q3.push(resp.q3_artifacts);
      if (resp.q4_plausibility != null) q4.push(resp.q4_plausibility);
      if (resp.decisionTimeMs && resp.decisionTimeMs > 0 && resp.decisionTimeMs < 600000) {
        timesSec.push(resp.decisionTimeMs / 1000);
      }
    }

    const avgArr = (arr: number[]) =>
      arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100 : null;

    rows.push({
      expertId,
      experienceTier,
      totalEvaluated,
      decisiveEvaluations: decisive,
      decisiveAccuracy: decisive > 0 ? Math.round((correct / decisive) * 1000) / 10 : null,
      foolingRate: synEval > 0 ? Math.round((synFooled / synEval) * 1000) / 10 : null,
      uncertainRate: totalEvaluated > 0 ? Math.round((uncertain / totalEvaluated) * 1000) / 10 : 0,
      meanRealism: avgArr(q2),
      meanArtifacts: avgArr(q3),
      meanPlausibility: avgArr(q4),
      meanDecisionSec: avgArr(timesSec),
    });
  }

  return rows.sort((a, b) => b.totalEvaluated - a.totalEvaluated);
}
