export type ClassificationResponse = 'Real' | 'Synthetic' | 'Uncertain';
export type GroundTruthType = 'Real' | 'Synthetic' | 'Unknown';
export type MorphologyType = 'PCOS' | 'NON_PCOS';
export type ExpertExperienceTier =
  | 'Senior (>10 yrs)'
  | 'Specialist (5–10 yrs)'
  | 'Resident (<5 yrs)'
  | 'Researcher / Other';

export const ARTIFACT_TAXONOMY_TAGS = [
  'Blurred Follicle Wall',
  'Abnormal Speckle Texture',
  'Unrealistic Ovarian Stroma',
  'Acoustic Shadowing Error',
  'Boundary Distortion',
] as const;

export type ArtifactTaxonomyTag = (typeof ARTIFACT_TAXONOMY_TAGS)[number];

export interface UltrasoundImageItem {
  id: string;
  fileName?: string;
  imageUrl: string;
  slotNumber: number; // 1 to 10 on its page
  groundTruth?: GroundTruthType;
  morphology?: MorphologyType;
}

export interface ImageEvaluationResponse {
  imageId: string;
  q1_classification: ClassificationResponse | null;
  q2_realism: number | null; // 1 to 5
  q3_artifacts: number | null; // 1 to 5
  q4_plausibility: number | null; // 1 to 5
  clinicalNotes?: string;
  artifactTags?: string[];
  decisionTimeMs?: number;
  experienceTier?: ExpertExperienceTier;
  evaluatedAt?: string;
}

export interface ConfusionMatrix {
  realAsReal: number;
  realAsSynthetic: number;
  realAsUncertain: number;
  syntheticAsReal: number; // Fooling
  syntheticAsSynthetic: number;
  syntheticAsUncertain: number;
}

export interface LikertStats {
  count: number;
  mean: number | null;
  sd: number | null;
  median: number | null;
  iqr: [number, number] | null; // [Q1, Q3]
}

export interface DiagnosticMetrics {
  sensitivity: number | null; // Synthetic detection TPR %
  specificity: number | null; // Real detection TNR %
  ppv: number | null; // Precision for synthetic %
  npv: number | null; // Negative predictive value %
  f1Score: number | null; // Harmonic mean (0-100 scale)
  balancedAccuracy: number | null; // %
}

export interface StatisticalTestResult {
  uStatistic: number;
  zScore: number;
  pValue: number;
}

export interface StatisticalTests {
  accuracyCI95: [number, number] | null;
  foolingRateCI95: [number, number] | null;
  binomialPValueVsChance: number | null;
  mannWhitneyQ2: StatisticalTestResult | null;
  mannWhitneyQ3: StatisticalTestResult | null;
  mannWhitneyQ4: StatisticalTestResult | null;
  mannWhitneyDecisionTime: StatisticalTestResult | null;
}

export interface SubgroupMetricsSummary {
  totalScans: number;
  totalEvaluated: number;
  decisiveEvaluations: number;
  decisiveAccuracy: number | null;
  foolingRate: number | null;
  meanRealismReal: number | null;
  meanRealismSynthetic: number | null;
  meanArtifactsReal: number | null;
  meanArtifactsSynthetic: number | null;
  meanPlausibilityReal: number | null;
  meanPlausibilitySynthetic: number | null;
}

export interface SubgroupMetrics {
  pcos: SubgroupMetricsSummary;
  nonPcos: SubgroupMetricsSummary;
}

export interface DecisionTimeMetrics {
  overallMeanSec: number | null;
  realMeanSec: number | null;
  syntheticMeanSec: number | null;
  fooledMeanSec: number | null;
}

export interface ExpertPerformanceRow {
  expertId: string;
  experienceTier?: string;
  totalEvaluated: number;
  decisiveEvaluations: number;
  decisiveAccuracy: number | null;
  foolingRate: number | null;
  uncertainRate: number;
  meanRealism: number | null;
  meanArtifacts: number | null;
  meanPlausibility: number | null;
  meanDecisionSec: number | null;
}

export interface InterRaterMetrics {
  expertCount: number;
  sharedScansCount: number;
  percentAgreement: number | null;
  fleissKappa: number | null;
  pairwiseCohenKappaMean: number | null;
}

export interface RealtimeMetrics {
  totalScans: number;
  totalEvaluated: number;
  completionRate: number; // %

  // A. Classification Accuracy
  decisiveEvaluations: number;
  correctPredictions: number;
  decisiveAccuracy: number | null; // % (excluding uncertain from denominator)
  overallAccuracy: number | null; // % (including uncertain in denominator)

  // B. Synthetic Image Fooling Rate
  totalSyntheticEvaluated: number;
  syntheticFooledCount: number; // Synthetic labelled Real
  foolingRate: number | null; // %

  // Uncertainties
  uncertainCount: number;
  uncertainRate: number; // %

  // C. Mean Realism Score (Q2 & Q4)
  meanRealismReal: number | null;
  meanRealismSynthetic: number | null;
  meanRealismOverall: number | null;

  meanPlausibilityReal: number | null;
  meanPlausibilitySynthetic: number | null;
  meanPlausibilityOverall: number | null;

  // D. Mean Artifact Score (Q3)
  meanArtifactsReal: number | null;
  meanArtifactsSynthetic: number | null;
  meanArtifactsOverall: number | null;

  confusionMatrix: ConfusionMatrix;

  // Q1 Journal Publication Extensions
  diagnostic: DiagnosticMetrics;
  likertStats: {
    q2Real: LikertStats;
    q2Synthetic: LikertStats;
    q3Real: LikertStats;
    q3Synthetic: LikertStats;
    q4Real: LikertStats;
    q4Synthetic: LikertStats;
  };
  stats: StatisticalTests;
  subgroups: SubgroupMetrics;
  decisionTime: DecisionTimeMetrics;
  artifactTagCounts: Record<string, { real: number; synthetic: number; total: number }>;
}
