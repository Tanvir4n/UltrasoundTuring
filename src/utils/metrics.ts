import { UltrasoundImageItem, ImageEvaluationResponse } from '../types/evaluation';

export function exportEvaluationsToCSV(
  images: UltrasoundImageItem[],
  evaluations: Record<string, ImageEvaluationResponse>,
  expertId: string
): void {
  const headers = [
    'Image_Number',
    'Page_Number',
    'Slot_On_Page',
    'Image_ID',
    'File_Name',
    'Expert_ID',
    'Q1_Classification',
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

    return [
      index + 1,
      pageNum,
      slotNum,
      `"${img.id}"`,
      `"${img.fileName || img.id}"`,
      `"${expertId || 'Anonymous'}"`,
      `"${e.q1_classification || 'Not Rated'}"`,
      e.q2_realism ?? '',
      e.q3_artifacts ?? '',
      e.q4_plausibility ?? '',
      `"${(e.clinicalNotes || '').replace(/"/g, '""')}"`,
      `"${e.evaluatedAt || ''}"`,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Ultrasound_Assessment_${expertId || 'Results'}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
