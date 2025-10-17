import Tesseract from 'tesseract.js';
import pdfParse from 'pdf-parse';
import fs from 'fs/promises';
import path from 'path';

export const extractTextFromPDF = async (filePath) => {
  try {
    console.log(' Extraction texte du PDF...');
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    console.log(` Texte extrait du PDF (${data.text.length} caractères)`);
    return data.text.trim();
  } catch (error) {
    console.error('❌ Erreur extraction PDF:', error.message);
    return '';
  }
};

export const extractTextFromImage = async (filePath) => {
  try {
    console.log(' OCR sur image en cours...');
    const { data: { text } } = await Tesseract.recognize(
      filePath,
      'fra+eng',
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );
    console.log(`✅ Texte extrait de l'image (${text.length} caractères)`);
    return text.trim();
  } catch (error) {
    console.error('❌ Erreur OCR image:', error.message);
    return '';
  }
};

export const extractText = async (filePath, mimeType) => {
  try {
    console.log(` Analyse du fichier: ${path.basename(filePath)}`);
    console.log(`   Type MIME: ${mimeType}`);

    if (mimeType === 'application/pdf') {
      return await extractTextFromPDF(filePath);
    }

    if (mimeType.startsWith('image/')) {
      return await extractTextFromImage(filePath);
    }

    console.log('ℹ Type de fichier non supporté pour OCR');
    return '';

  } catch (error) {
    console.error(' Erreur générale extraction texte:', error.message);
    return '';
  }
};

export const extractAndCleanText = async (filePath, mimeType) => {
  const text = await extractText(filePath, mimeType);
  
  if (!text) return '';

  const cleanedText = text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();

  const maxLength = 50000;
  if (cleanedText.length > maxLength) {
    console.log(` Texte tronqué (${cleanedText.length}  ${maxLength} caractères)`);
    return cleanedText.substring(0, maxLength) + '...';
  }

  return cleanedText;
};

export default {
  extractText,
  extractTextFromPDF,
  extractTextFromImage,
  extractAndCleanText
};