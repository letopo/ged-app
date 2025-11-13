// backend/src/utils/pdfMerger.js
import { PDFDocument } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

/**
 * Fusionne deux fichiers PDF en un seul
 * @param {string} pdfPath1 - Chemin du premier PDF (Ordre de Mission)
 * @param {string} pdfPath2 - Chemin du second PDF (Pièce de Caisse)
 * @returns {Promise<Uint8Array>} - Buffer du PDF fusionné
 */
export async function mergePDFs(pdfPath1, pdfPath2) {
  try {
    console.log('📄 Fusion des PDFs...');
    console.log('   PDF 1 (OM):', pdfPath1);
    console.log('   PDF 2 (PC):', pdfPath2);

    // Lire les deux fichiers PDF
    const pdf1Bytes = await fs.readFile(pdfPath1);
    const pdf2Bytes = await fs.readFile(pdfPath2);

    // Charger les documents PDF
    const pdf1 = await PDFDocument.load(pdf1Bytes);
    const pdf2 = await PDFDocument.load(pdf2Bytes);

    // Créer un nouveau document PDF
    const mergedPdf = await PDFDocument.create();

    // Copier toutes les pages du premier PDF (Ordre de Mission)
    const pages1 = await mergedPdf.copyPages(pdf1, pdf1.getPageIndices());
    pages1.forEach((page) => {
      mergedPdf.addPage(page);
    });

    // Copier toutes les pages du second PDF (Pièce de Caisse)
    const pages2 = await mergedPdf.copyPages(pdf2, pdf2.getPageIndices());
    pages2.forEach((page) => {
      mergedPdf.addPage(page);
    });

    // Sauvegarder le PDF fusionné
    const mergedPdfBytes = await mergedPdf.save();
    
    console.log('✅ PDFs fusionnés avec succès!');
    console.log(`   Total pages: ${mergedPdf.getPageCount()}`);
    
    return mergedPdfBytes;
  } catch (error) {
    console.error('❌ Erreur lors de la fusion des PDFs:', error);
    throw new Error('Impossible de fusionner les PDFs: ' + error.message);
  }
}

/**
 * Vérifie si un fichier PDF existe et est valide
 * @param {string} pdfPath - Chemin du fichier PDF
 * @returns {Promise<boolean>}
 */
export async function validatePDF(pdfPath) {
  try {
    await fs.access(pdfPath);
    const pdfBytes = await fs.readFile(pdfPath);
    await PDFDocument.load(pdfBytes);
    return true;
  } catch (error) {
    console.error('❌ PDF invalide:', pdfPath, error.message);
    return false;
  }
}