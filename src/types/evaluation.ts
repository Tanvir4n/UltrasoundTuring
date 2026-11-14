export type ClassificationResponse = 'Real' | 'Synthetic' | 'Uncertain';

export interface UltrasoundImageItem {
  id: string;
  fileName?: string;
  imageUrl: string;
  slotNumber: number; // 1 to 10 on its page
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
