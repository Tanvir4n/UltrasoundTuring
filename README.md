# Expert Ultrasound Evaluation Platform
### Real vs. Synthetic Ovarian Ultrasound Image Classification (Visual Turing Test)

A specialized, medical-grade double-blind evaluation platform developed in **React with Next.js (App Router)** and **Tailwind CSS**, designed for the research study:

> **"Evaluating Diffusion-Based Synthetic Ultrasound Data for Ovarian Morphology Classification: CNN–Vision Transformer Fusion and Bidirectional Cross-Domain Generalization"**

---

## 🌟 Key Features

1. **Standardized Clinical Protocol**:
   - Implements the exact 4 standardized questions from the official evaluation questionnaire:
     - **Q1. Image Classification**: Real vs. Synthetic vs. Uncertain (Primary Turing Test outcome)
     - **Q2. Anatomical Realism**: 1 (Very unrealistic) to 5 (Highly realistic)
     - **Q3. Image Artifacts**: 1 (No noticeable artifacts) to 5 (Severe artifacts)
     - **Q4. Overall Clinical Plausibility**: 1 (Not at all) to 5 (Extremely closely)
   - Evaluator credentials tracking (Expert ID and Clinical Specialty).

2. **10 Image Slots Per Page**:
   - Structured strictly into **10 slots per page** (`Image -> Questions -> Image -> Questions`), allowing focused evaluation batches without cognitive overload.
   - Real-time slot navigation bar with interactive quick-jump buttons (#01 to #10) showing completion state.
   - Smooth pagination between Page 1 (Slots 1–10), Page 2 (Slots 11–20), Page 3 (Slots 21–30), etc.

3. **DICOM / Medical Ultrasound Inspection Controls**:
   - High-fidelity ultrasound viewer with B-mode simulation.
   - Interactive Gain / Brightness and Contrast fine-tuning.
   - Grayscale Inversion filter (hot-iron / negative acoustic view).
   - 10mm Medical calibration grid overlay.
   - Fullscreen Lightbox modal with deep zoom (up to 350%) and pan.

4. **Automated Research Metrics Calculation (Section 5 & 6 of Paper Protocol)**:
   - **Classification Accuracy**: `Correct Real/Synthetic classifications ÷ all evaluated × 100%`
   - **Synthetic-Image Fooling Rate**: `Synthetic images labelled "Real" ÷ all synthetic evaluated × 100%`
   - **Mean Realism Score**: Average of Q2 & Q4 scores calculated separately for real and synthetic scans.
   - **Mean Artifact Score**: Average Q3 score.
   - **Confusion Matrix**: Full 2x2 matrix (TP, FN, FP [Fooled], TN) plus Uncertain categorization.

5. **Data Management & Export**:
   - **Dataset Uploader**: Drag-and-drop local ultrasound scans (PNG, JPG, WebP) with batch label assignment.
   - **Export to CSV**: Formatted for direct import into R, Python (Pandas), SPSS, or Excel.
   - **Export to JSON**: Structured metadata with study parameters and individual ratings.
   - **Print Report**: Formatted clinical evaluation summary.
   - **Session Auto-Save**: Progress persisted in `localStorage`.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn / pnpm

### Run Locally
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or build for production
npm run build
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

