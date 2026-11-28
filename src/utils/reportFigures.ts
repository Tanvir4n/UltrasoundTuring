import type jsPDF from 'jspdf';
import {
  ImageEvaluationResponse,
  RealtimeMetrics,
  UltrasoundImageItem,
} from '../types/evaluation';

function getQ3Distribution(
  images: UltrasoundImageItem[],
  evaluations: Record<string, ImageEvaluationResponse>
): Array<{ score: number; real: number; synthetic: number }> {
  return [1, 2, 3, 4, 5].map((score) => ({
    score,
    real: images.filter(
      (i) => i.groundTruth === 'Real' && evaluations[i.id]?.q3_artifacts === score
    ).length,
    synthetic: images.filter(
      (i) => i.groundTruth === 'Synthetic' && evaluations[i.id]?.q3_artifacts === score
    ).length,
  }));
}

function fmtP(p: number | null | undefined): string {
  if (p == null) return 'p = --';
  return p < 0.0001 ? 'p < 0.0001' : `p = ${p.toFixed(4)}`;
}

/**
 * Draws crisp, publication-ready vector figures directly into jsPDF:
 * - Figure 1: Real vs. Synthetic Mean Score Comparison (Q2, Q4, Q3) + Q3 Artifact Distribution (1-5)
 * - Figure 2: Confusion Matrix Heatmap + PCOS vs. NON-PCOS Subgroup Performance
 */
export function drawVectorFiguresInPDF(
  doc: jsPDF,
  images: UltrasoundImageItem[],
  evaluations: Record<string, ImageEvaluationResponse>,
  metrics: RealtimeMetrics,
  startY: number,
  pageWidth: number,
  margin: number
): number {
  const usableWidth = pageWidth - margin * 2;
  const colGap = 5;
  const boxW = (usableWidth - colGap) / 2;
  const boxH = 64;

  let cursorY = startY;
  const pageHeight = doc.internal.pageSize.getHeight();
  if (cursorY + boxH + 14 > pageHeight - 14) {
    doc.addPage();
    cursorY = 16;
  }

  // Section Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('Publication-Ready Visual Figures', margin, cursorY);
  cursorY += 4;

  // ==================== FIGURE 1A (LEFT): REAL VS SYNTHETIC MEAN SCORES ====================
  const x1 = margin;
  const y1 = cursorY;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.roundedRect(x1, y1, boxW, boxH, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Fig. 1A: Real vs. Synthetic Mean Scores (1-5)', x1 + 3.5, y1 + 6);

  const barRows = [
    {
      label: 'Q2: Realism (higher = better)',
      r: metrics.meanRealismReal,
      s: metrics.meanRealismSynthetic,
      p: metrics.stats.mannWhitneyQ2?.pValue,
      rRgb: [134, 239, 172] as [number, number, number],
      sRgb: [156, 219, 250] as [number, number, number],
    },
    {
      label: 'Q4: Plausibility (higher = better)',
      r: metrics.meanPlausibilityReal,
      s: metrics.meanPlausibilitySynthetic,
      p: metrics.stats.mannWhitneyQ4?.pValue,
      rRgb: [134, 239, 172] as [number, number, number],
      sRgb: [156, 219, 250] as [number, number, number],
    },
    {
      label: 'Q3: Artifacts (lower = cleaner)',
      r: metrics.meanArtifactsReal,
      s: metrics.meanArtifactsSynthetic,
      p: metrics.stats.mannWhitneyQ3?.pValue,
      rRgb: [254, 240, 138] as [number, number, number],
      sRgb: [245, 158, 11] as [number, number, number],
    },
  ];

  const barTrackX = x1 + 19;
  const barTrackW = boxW - 31;
  let rowY = y1 + 13;

  for (const row of barRows) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(17, 24, 39);
    doc.text(row.label, x1 + 3.5, rowY);

    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(fmtP(row.p), x1 + boxW - 3.5, rowY, { align: 'right' });

    // Real bar
    rowY += 2.2;
    doc.setFont('courier', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(4, 120, 87);
    doc.text('Real', x1 + 3.5, rowY + 2.8);

    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.25);
    doc.roundedRect(barTrackX, rowY, barTrackW, 3.5, 1, 1, 'FD');
    if (row.r != null && row.r > 0) {
      const fillW = Math.max(1.5, (row.r / 5) * barTrackW);
      doc.setFillColor(...row.rRgb);
      doc.roundedRect(barTrackX, rowY, fillW, 3.5, 1, 1, 'FD');
    }
    doc.setTextColor(0, 0, 0);
    doc.text(row.r != null ? String(row.r) : '--', x1 + boxW - 3.5, rowY + 2.8, { align: 'right' });

    // Synthetic bar
    rowY += 4.8;
    doc.setTextColor(2, 132, 199);
    doc.text('Syn', x1 + 3.5, rowY + 2.8);

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(barTrackX, rowY, barTrackW, 3.5, 1, 1, 'FD');
    if (row.s != null && row.s > 0) {
      const fillW = Math.max(1.5, (row.s / 5) * barTrackW);
      doc.setFillColor(...row.sRgb);
      doc.roundedRect(barTrackX, rowY, fillW, 3.5, 1, 1, 'FD');
    }
    doc.setTextColor(0, 0, 0);
    doc.text(row.s != null ? String(row.s) : '--', x1 + boxW - 3.5, rowY + 2.8, { align: 'right' });

    rowY += 9;
  }

  // ==================== FIGURE 1B (RIGHT): Q3 ARTIFACT DISTRIBUTION ====================
  const x2 = margin + boxW + colGap;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.roundedRect(x2, y1, boxW, boxH, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Fig. 1B: Q3 Artifact Score Distribution (1-5)', x2 + 3.5, y1 + 6);

  const dist = getQ3Distribution(images, evaluations);
  const maxBar = Math.max(1, ...dist.map((d) => Math.max(d.real, d.synthetic)));
  const chartBottom = y1 + boxH - 13;
  const maxBarH = 34;
  const groupW = (boxW - 10) / 5;

  dist.forEach((d, idx) => {
    const gx = x2 + 5 + idx * groupW + groupW / 2;
    const realH = d.real > 0 ? Math.max(3, (d.real / maxBar) * maxBarH) : 1.5;
    const synH = d.synthetic > 0 ? Math.max(3, (d.synthetic / maxBar) * maxBarH) : 1.5;

    doc.setLineWidth(0.25);
    doc.setDrawColor(0, 0, 0);

    // Real bar
    doc.setFillColor(134, 239, 172);
    doc.rect(gx - 5.2, chartBottom - realH, 4.5, realH, 'FD');
    if (d.real > 0) {
      doc.setFont('courier', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(0, 0, 0);
      doc.text(String(d.real), gx - 3, chartBottom - realH - 1, { align: 'center' });
    }

    // Synthetic bar
    doc.setFillColor(156, 219, 250);
    doc.rect(gx + 0.7, chartBottom - synH, 4.5, synH, 'FD');
    if (d.synthetic > 0) {
      doc.setFont('courier', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(0, 0, 0);
      doc.text(String(d.synthetic), gx + 3, chartBottom - synH - 1, { align: 'center' });
    }

    // X-axis label box
    doc.setFillColor(250, 249, 246);
    doc.roundedRect(gx - 3.5, chartBottom + 1.5, 7, 4.5, 0.8, 0.8, 'FD');
    doc.setFont('courier', 'bold');
    doc.setFontSize(6.5);
    doc.text(String(d.score), gx, chartBottom + 4.8, { align: 'center' });
  });

  // Legend
  doc.setFillColor(134, 239, 172);
  doc.rect(x2 + 4, y1 + boxH - 5.5, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Real Scans', x2 + 8.5, y1 + boxH - 3);

  doc.setFillColor(156, 219, 250);
  doc.rect(x2 + 25, y1 + boxH - 5.5, 3, 3, 'FD');
  doc.text('Synthetic Scans', x2 + 29.5, y1 + boxH - 3);

  doc.setFont('courier', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('1:Clean  5:Severe', x2 + boxW - 3.5, y1 + boxH - 3, { align: 'right' });

  cursorY += boxH + 5;

  // ==================== FIGURE 2: CONFUSION MATRIX HEATMAP + SUBGROUP CHART ====================
  if (cursorY + boxH + 6 > pageHeight - 14) {
    doc.addPage();
    cursorY = 16;
  }

  const y2 = cursorY;
  // Fig 2A: Confusion Matrix Heatmap
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.roundedRect(x1, y2, boxW, boxH, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Fig. 2A: Confusion Matrix Heatmap', x1 + 3.5, y2 + 6);

  const cm = metrics.confusionMatrix;
  const realTotal = Math.max(1, cm.realAsReal + cm.realAsSynthetic + cm.realAsUncertain);
  const synTotal = Math.max(1, cm.syntheticAsReal + cm.syntheticAsSynthetic + cm.syntheticAsUncertain);

  const cellW = (boxW - 26) / 3;
  const cellH = 16;
  const cmStartX = x1 + 22;
  const cmStartY = y2 + 17;

  // Column headers
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  ['Pred: Real', 'Pred: Syn', 'Uncertain'].forEach((hdr, i) => {
    doc.text(hdr, cmStartX + i * cellW + cellW / 2, cmStartY - 2.5, { align: 'center' });
  });

  // Row labels
  doc.text('True: Real', x1 + 3.5, cmStartY + cellH / 2 + 1);
  doc.text('True: Syn', x1 + 3.5, cmStartY + cellH + cellH / 2 + 1);

  const cmCells = [
    [
      { val: cm.realAsReal, pct: Math.round((cm.realAsReal / realTotal) * 100), rgb: [134, 239, 172] as [number, number, number], sub: 'Correct' },
      { val: cm.realAsSynthetic, pct: Math.round((cm.realAsSynthetic / realTotal) * 100), rgb: [254, 205, 211] as [number, number, number], sub: 'Type I' },
      { val: cm.realAsUncertain, pct: Math.round((cm.realAsUncertain / realTotal) * 100), rgb: [254, 240, 138] as [number, number, number], sub: 'Uncert.' },
    ],
    [
      { val: cm.syntheticAsReal, pct: Math.round((cm.syntheticAsReal / synTotal) * 100), rgb: [156, 219, 250] as [number, number, number], sub: 'FOOLED' },
      { val: cm.syntheticAsSynthetic, pct: Math.round((cm.syntheticAsSynthetic / synTotal) * 100), rgb: [134, 239, 172] as [number, number, number], sub: 'Detected' },
      { val: cm.syntheticAsUncertain, pct: Math.round((cm.syntheticAsUncertain / synTotal) * 100), rgb: [254, 240, 138] as [number, number, number], sub: 'Uncert.' },
    ],
  ];

  cmCells.forEach((row, rIdx) => {
    row.forEach((cell, cIdx) => {
      const cx = cmStartX + cIdx * cellW;
      const cy = cmStartY + rIdx * cellH;
      doc.setFillColor(...cell.rgb);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.35);
      doc.rect(cx, cy, cellW, cellH, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(`${cell.val}`, cx + cellW / 2, cy + 6.8, { align: 'center' });

      doc.setFont('courier', 'normal');
      doc.setFontSize(6);
      doc.text(`${cell.pct}% (${cell.sub})`, cx + cellW / 2, cy + 12.2, { align: 'center' });
    });
  });

  // Fig 2B: Subgroup & Diagnostic Performance Chart
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.roundedRect(x2, y2, boxW, boxH, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Fig. 2B: Diagnostic & Subgroup Performance (%)', x2 + 3.5, y2 + 6);

  const perfBars = [
    { label: 'Overall Acc.', val: metrics.decisiveAccuracy, rgb: [132, 204, 22] as [number, number, number] },
    { label: 'Fooling Rate', val: metrics.foolingRate, rgb: [156, 219, 250] as [number, number, number] },
    { label: 'PCOS Acc.', val: metrics.subgroups.pcos.decisiveAccuracy, rgb: [134, 239, 172] as [number, number, number] },
    { label: 'PCOS Fooling', val: metrics.subgroups.pcos.foolingRate, rgb: [156, 219, 250] as [number, number, number] },
    { label: 'NON-PCOS Acc.', val: metrics.subgroups.nonPcos.decisiveAccuracy, rgb: [134, 239, 172] as [number, number, number] },
    { label: 'NON-PCOS Fool', val: metrics.subgroups.nonPcos.foolingRate, rgb: [156, 219, 250] as [number, number, number] },
  ];

  const pTrackX = x2 + 27;
  const pTrackW = boxW - 39;
  let py = y2 + 12;

  for (const pb of perfBars) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(17, 24, 39);
    doc.text(pb.label, x2 + 3.5, py + 3);

    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.25);
    doc.roundedRect(pTrackX, py, pTrackW, 4, 1, 1, 'FD');

    if (pb.val != null && pb.val > 0) {
      const w = Math.max(1.5, (pb.val / 100) * pTrackW);
      doc.setFillColor(...pb.rgb);
      doc.roundedRect(pTrackX, py, w, 4, 1, 1, 'FD');
    }

    doc.setFont('courier', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(0, 0, 0);
    doc.text(pb.val != null ? `${pb.val}%` : '--%', x2 + boxW - 3.5, py + 3, { align: 'right' });

    py += 8;
  }

  return y2 + boxH + 7;
}

function drawRoundedRectCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Generates high-DPI (2x Retina) PNG images of Figure 1 and Figure 2
 * for embedding directly into editable Word (.doc) / Google Docs reports.
 */
export function generateHighResFigureDataUrls(
  images: UltrasoundImageItem[],
  evaluations: Record<string, ImageEvaluationResponse>,
  metrics: RealtimeMetrics
): { fig1DataUrl: string; fig2DataUrl: string } | null {
  if (typeof document === 'undefined') return null;

  const W = 1200;
  const H = 420;

  // ==================== FIGURE 1 CANVAS (MEAN SCORES + Q3 HISTOGRAM) ====================
  const c1 = document.createElement('canvas');
  c1.width = W;
  c1.height = H;
  const ctx1 = c1.getContext('2d');
  if (!ctx1) return null;

  ctx1.fillStyle = '#FFFFFF';
  ctx1.fillRect(0, 0, W, H);

  const cardW = 576;
  const cardH = 396;

  // Left card: Mean Score Comparison
  drawRoundedRectCanvas(ctx1, 12, 12, cardW, cardH, 16);
  ctx1.fillStyle = '#FFFFFF';
  ctx1.fill();
  ctx1.lineWidth = 3;
  ctx1.strokeStyle = '#000000';
  ctx1.stroke();

  ctx1.fillStyle = '#000000';
  ctx1.font = 'bold 20px Arial, sans-serif';
  ctx1.fillText('Fig. 1A: Real vs. Synthetic Mean Score Comparison', 32, 46);
  ctx1.fillStyle = '#64748B';
  ctx1.font = '13px Arial, sans-serif';
  ctx1.fillText('Side-by-side comparison across Q2 Realism, Q4 Plausibility, and Q3 Artifacts (1-5 scale).', 32, 68);

  const rows = [
    {
      title: 'Q2: Anatomical Realism (Higher = Better)',
      r: metrics.meanRealismReal,
      s: metrics.meanRealismSynthetic,
      p: metrics.stats.mannWhitneyQ2?.pValue,
      rCol: '#86EFAC',
      sCol: '#9CDBFA',
    },
    {
      title: 'Q4: Clinical Plausibility (Higher = Better)',
      r: metrics.meanPlausibilityReal,
      s: metrics.meanPlausibilitySynthetic,
      p: metrics.stats.mannWhitneyQ4?.pValue,
      rCol: '#86EFAC',
      sCol: '#9CDBFA',
    },
    {
      title: 'Q3: Artifacts (Lower = Cleaner)',
      r: metrics.meanArtifactsReal,
      s: metrics.meanArtifactsSynthetic,
      p: metrics.stats.mannWhitneyQ3?.pValue,
      rCol: '#FEF08A',
      sCol: '#F59E0B',
    },
  ];

  let ry = 104;
  for (const row of rows) {
    ctx1.fillStyle = '#000000';
    ctx1.font = 'bold 14px Arial, sans-serif';
    ctx1.fillText(row.title, 32, ry);

    ctx1.fillStyle = '#64748B';
    ctx1.font = '13px monospace';
    ctx1.textAlign = 'right';
    ctx1.fillText(fmtP(row.p), 564, ry);
    ctx1.textAlign = 'left';

    // Real Bar
    ry += 14;
    ctx1.fillStyle = '#047857';
    ctx1.font = 'bold 13px monospace';
    ctx1.fillText('Real', 32, ry + 15);
    drawRoundedRectCanvas(ctx1, 115, ry, 390, 20, 10);
    ctx1.fillStyle = '#F1F5F9';
    ctx1.fill();
    ctx1.lineWidth = 1.5;
    ctx1.strokeStyle = '#000000';
    ctx1.stroke();
    if (row.r != null && row.r > 0) {
      drawRoundedRectCanvas(ctx1, 115, ry, Math.max(12, (row.r / 5) * 390), 20, 10);
      ctx1.fillStyle = row.rCol;
      ctx1.fill();
      ctx1.stroke();
    }
    ctx1.fillStyle = '#000000';
    ctx1.textAlign = 'right';
    ctx1.fillText(row.r != null ? String(row.r) : '--', 564, ry + 15);
    ctx1.textAlign = 'left';

    // Synthetic Bar
    ry += 28;
    ctx1.fillStyle = '#0284C7';
    ctx1.fillText('Synthetic', 32, ry + 15);
    drawRoundedRectCanvas(ctx1, 115, ry, 390, 20, 10);
    ctx1.fillStyle = '#F1F5F9';
    ctx1.fill();
    ctx1.stroke();
    if (row.s != null && row.s > 0) {
      drawRoundedRectCanvas(ctx1, 115, ry, Math.max(12, (row.s / 5) * 390), 20, 10);
      ctx1.fillStyle = row.sCol;
      ctx1.fill();
      ctx1.stroke();
    }
    ctx1.fillStyle = '#000000';
    ctx1.textAlign = 'right';
    ctx1.fillText(row.s != null ? String(row.s) : '--', 564, ry + 15);
    ctx1.textAlign = 'left';

    ry += 56;
  }

  // Right card: Q3 Artifact Score Distribution
  const rx = 612;
  drawRoundedRectCanvas(ctx1, rx, 12, cardW, cardH, 16);
  ctx1.fillStyle = '#FFFFFF';
  ctx1.fill();
  ctx1.lineWidth = 3;
  ctx1.strokeStyle = '#000000';
  ctx1.stroke();

  ctx1.fillStyle = '#000000';
  ctx1.font = 'bold 20px Arial, sans-serif';
  ctx1.fillText('Fig. 1B: Q3 Artifact Score Distribution (1-5)', rx + 20, 46);
  ctx1.fillStyle = '#64748B';
  ctx1.font = '13px Arial, sans-serif';
  ctx1.fillText('Frequency breakdown of visual artifacts across Real vs. Synthetic scans.', rx + 20, 68);

  const dist = getQ3Distribution(images, evaluations);
  const maxBar = Math.max(1, ...dist.map((d) => Math.max(d.real, d.synthetic)));
  const cBottom = 325;
  const maxBarH = 205;
  const gStep = (cardW - 60) / 5;

  dist.forEach((d, idx) => {
    const gx = rx + 30 + idx * gStep + gStep / 2;
    const rH = d.real > 0 ? Math.max(14, (d.real / maxBar) * maxBarH) : 8;
    const sH = d.synthetic > 0 ? Math.max(14, (d.synthetic / maxBar) * maxBarH) : 8;

    ctx1.lineWidth = 1.5;
    ctx1.strokeStyle = '#000000';

    ctx1.fillStyle = '#86EFAC';
    ctx1.fillRect(gx - 28, cBottom - rH, 24, rH);
    ctx1.strokeRect(gx - 28, cBottom - rH, 24, rH);
    if (d.real > 0) {
      ctx1.fillStyle = '#000000';
      ctx1.font = 'bold 13px monospace';
      ctx1.textAlign = 'center';
      ctx1.fillText(String(d.real), gx - 16, cBottom - rH - 6);
    }

    ctx1.fillStyle = '#9CDBFA';
    ctx1.fillRect(gx + 4, cBottom - sH, 24, sH);
    ctx1.strokeRect(gx + 4, cBottom - sH, 24, sH);
    if (d.synthetic > 0) {
      ctx1.fillStyle = '#000000';
      ctx1.font = 'bold 13px monospace';
      ctx1.textAlign = 'center';
      ctx1.fillText(String(d.synthetic), gx + 16, cBottom - sH - 6);
    }

    drawRoundedRectCanvas(ctx1, gx - 16, cBottom + 10, 32, 24, 6);
    ctx1.fillStyle = '#FAF9F6';
    ctx1.fill();
    ctx1.stroke();
    ctx1.fillStyle = '#000000';
    ctx1.font = 'bold 14px monospace';
    ctx1.textAlign = 'center';
    ctx1.fillText(String(d.score), gx, cBottom + 27);
  });

  // Legend
  ctx1.textAlign = 'left';
  ctx1.fillStyle = '#86EFAC';
  ctx1.fillRect(rx + 24, 375, 16, 16);
  ctx1.strokeRect(rx + 24, 375, 16, 16);
  ctx1.fillStyle = '#000000';
  ctx1.font = 'bold 13px Arial, sans-serif';
  ctx1.fillText('Real Scans', rx + 48, 388);

  ctx1.fillStyle = '#9CDBFA';
  ctx1.fillRect(rx + 145, 375, 16, 16);
  ctx1.strokeRect(rx + 145, 375, 16, 16);
  ctx1.fillStyle = '#000000';
  ctx1.fillText('Synthetic Scans', rx + 169, 388);

  ctx1.fillStyle = '#64748B';
  ctx1.font = '13px monospace';
  ctx1.textAlign = 'right';
  ctx1.fillText('1: Clean  •  5: Severe', rx + cardW - 24, 388);

  // ==================== FIGURE 2 CANVAS (CONFUSION MATRIX + SUBGROUPS) ====================
  const c2 = document.createElement('canvas');
  c2.width = W;
  c2.height = H;
  const ctx2 = c2.getContext('2d');
  if (!ctx2) return null;

  ctx2.fillStyle = '#FFFFFF';
  ctx2.fillRect(0, 0, W, H);

  // Left card: Confusion Matrix Heatmap
  drawRoundedRectCanvas(ctx2, 12, 12, cardW, cardH, 16);
  ctx2.fillStyle = '#FFFFFF';
  ctx2.fill();
  ctx2.lineWidth = 3;
  ctx2.strokeStyle = '#000000';
  ctx2.stroke();

  ctx2.fillStyle = '#000000';
  ctx2.font = 'bold 20px Arial, sans-serif';
  ctx2.fillText('Fig. 2A: Confusion Matrix Heatmap', 32, 46);
  ctx2.fillStyle = '#64748B';
  ctx2.font = '13px Arial, sans-serif';
  ctx2.fillText('Actual Ground Truth vs. Observer Decision (counts & row percentages).', 32, 68);

  const cm = metrics.confusionMatrix;
  const rTot = Math.max(1, cm.realAsReal + cm.realAsSynthetic + cm.realAsUncertain);
  const sTot = Math.max(1, cm.syntheticAsReal + cm.syntheticAsSynthetic + cm.syntheticAsUncertain);

  const cw = 135;
  const ch = 110;
  const sx = 152;
  const sy = 128;

  ctx2.fillStyle = '#000000';
  ctx2.font = 'bold 13px Arial, sans-serif';
  ctx2.textAlign = 'center';
  ['Labelled Real', 'Labelled Synthetic', 'Uncertain'].forEach((h, i) => {
    ctx2.fillText(h, sx + i * cw + cw / 2, sy - 14);
  });

  ctx2.textAlign = 'right';
  ctx2.fillText('True: Real', sx - 12, sy + ch / 2 + 5);
  ctx2.fillText('True: Synthetic', sx - 12, sy + ch + ch / 2 + 5);

  const matrixGrid = [
    [
      { val: cm.realAsReal, pct: Math.round((cm.realAsReal / rTot) * 100), bg: '#86EFAC', sub: 'Correct' },
      { val: cm.realAsSynthetic, pct: Math.round((cm.realAsSynthetic / rTot) * 100), bg: '#FECDD3', sub: 'Type I Error' },
      { val: cm.realAsUncertain, pct: Math.round((cm.realAsUncertain / rTot) * 100), bg: '#FEF08A', sub: 'Uncertain' },
    ],
    [
      { val: cm.syntheticAsReal, pct: Math.round((cm.syntheticAsReal / sTot) * 100), bg: '#9CDBFA', sub: 'FOOLED' },
      { val: cm.syntheticAsSynthetic, pct: Math.round((cm.syntheticAsSynthetic / sTot) * 100), bg: '#86EFAC', sub: 'Detected' },
      { val: cm.syntheticAsUncertain, pct: Math.round((cm.syntheticAsUncertain / sTot) * 100), bg: '#FEF08A', sub: 'Uncertain' },
    ],
  ];

  matrixGrid.forEach((row, rIdx) => {
    row.forEach((cell, cIdx) => {
      const cx = sx + cIdx * cw;
      const cy = sy + rIdx * ch;
      ctx2.fillStyle = cell.bg;
      ctx2.fillRect(cx, cy, cw, ch);
      ctx2.lineWidth = 2;
      ctx2.strokeStyle = '#000000';
      ctx2.strokeRect(cx, cy, cw, ch);

      ctx2.fillStyle = '#000000';
      ctx2.textAlign = 'center';
      ctx2.font = 'bold 28px Arial, sans-serif';
      ctx2.fillText(String(cell.val), cx + cw / 2, cy + 54);
      ctx2.font = 'bold 12px monospace';
      ctx2.fillText(`${cell.pct}% (${cell.sub})`, cx + cw / 2, cy + 82);
    });
  });

  // Right card: Diagnostic & Subgroup Performance
  drawRoundedRectCanvas(ctx2, rx, 12, cardW, cardH, 16);
  ctx2.fillStyle = '#FFFFFF';
  ctx2.fill();
  ctx2.lineWidth = 3;
  ctx2.strokeStyle = '#000000';
  ctx2.stroke();

  ctx2.textAlign = 'left';
  ctx2.fillStyle = '#000000';
  ctx2.font = 'bold 20px Arial, sans-serif';
  ctx2.fillText('Fig. 2B: Diagnostic & Subgroup Performance (%)', rx + 20, 46);
  ctx2.fillStyle = '#64748B';
  ctx2.font = '13px Arial, sans-serif';
  ctx2.fillText('Overall accuracy, synthetic fooling rate, and PCOS vs. NON-PCOS subgroups.', rx + 20, 68);

  const pBars = [
    { label: 'Decisive Accuracy', val: metrics.decisiveAccuracy, col: '#84CC16' },
    { label: 'Synthetic Fooling Rate', val: metrics.foolingRate, col: '#9CDBFA' },
    { label: 'PCOS Accuracy', val: metrics.subgroups.pcos.decisiveAccuracy, col: '#86EFAC' },
    { label: 'PCOS Fooling Rate', val: metrics.subgroups.pcos.foolingRate, col: '#9CDBFA' },
    { label: 'NON-PCOS Accuracy', val: metrics.subgroups.nonPcos.decisiveAccuracy, col: '#86EFAC' },
    { label: 'NON-PCOS Fooling Rate', val: metrics.subgroups.nonPcos.foolingRate, col: '#9CDBFA' },
  ];

  let py = 104;
  for (const pb of pBars) {
    ctx2.fillStyle = '#000000';
    ctx2.font = 'bold 13px Arial, sans-serif';
    ctx2.textAlign = 'left';
    ctx2.fillText(pb.label, rx + 22, py + 17);

    drawRoundedRectCanvas(ctx2, rx + 195, py, 300, 24, 12);
    ctx2.fillStyle = '#F1F5F9';
    ctx2.fill();
    ctx2.lineWidth = 1.5;
    ctx2.strokeStyle = '#000000';
    ctx2.stroke();

    if (pb.val != null && pb.val > 0) {
      drawRoundedRectCanvas(ctx2, rx + 195, py, Math.max(12, (pb.val / 100) * 300), 24, 12);
      ctx2.fillStyle = pb.col;
      ctx2.fill();
      ctx2.stroke();
    }

    ctx2.fillStyle = '#000000';
    ctx2.font = 'bold 13px monospace';
    ctx2.textAlign = 'right';
    ctx2.fillText(pb.val != null ? `${pb.val}%` : '--%', rx + cardW - 22, py + 17);
    py += 46;
  }

  return {
    fig1DataUrl: c1.toDataURL('image/png'),
    fig2DataUrl: c2.toDataURL('image/png'),
  };
}
