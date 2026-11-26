export type ClassificationResponse = 'Real' | 'Synthetic' | 'Uncertain';
export type GroundTruthType = 'Real' | 'Synthetic' | 'Unknown';

export interface UltrasoundImageItem {
  id: string;
  fileName?: string;
  imageUrl: string;
  slotNumber: number; // 1 to 10 on its page
  groundTruth?: GroundTruthType;
}

export interface ImageEvaluationResponse {
  imageId: string;
  q1_classification: ClassificationResponse | null;
  q2_realism: number | null; // 1 to 5
  q3_artifacts: number | null; // 1 to 5
  q4_plausibility: number | null; // 1 to 5
  clinicalNotes?: string;
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
}
