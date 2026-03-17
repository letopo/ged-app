// backend/src/services/ocrService.js - VERSION 100% COMPLÈTE ET CORRIGÉE
import pkg from "pdf-poppler"; // 1. Importer le paquet par défaut
const { Poppler } = pkg;       // 2. Extraire 'Poppler' de l'objet importé
import { createWorker } from 'tesseract.js';
import path from 'path';
import fs from 'fs/promises';

const SIGNATURE_KEYWORDS = ['signature', 'signé', 'approuvé', 'validateur', 'accepté', 'responsable', 'vérifié', 'direction'];

export const extractTextAndDetectSignatureZones = async (filePath, mimeType) => {
    if (mimeType !== 'application/pdf') {
        console.log(`ℹ️ Type de fichier '${mimeType}' non supporté pour l'analyse.`);
        return { extractedText: "", signatureZones: [] };
    }

    console.log(`🔎 Démarrage de l'analyse OCR pour le PDF : ${path.basename(filePath)}`);
    const tempImageFile = path.join(path.dirname(filePath), `${path.basename(filePath, '.pdf')}_ocr_temp`);

    try {
        const poppler = new Poppler(); 
        const options = {
            firstPageToConvert: 1,
            lastPageToConvert: 1,
            pngFile: true,
        };
        
        await poppler.pdfToCairo(filePath, tempImageFile, options);
        
        const generatedImageFile = `${tempImageFile}-1.png`;

        console.log('🖼️ PDF converti en image, démarrage de l\'OCR...');
        const worker = await createWorker('fra+eng');
        const { data } = await worker.recognize(generatedImageFile);
        await worker.terminate();

        const signatureZones = data.words
            .filter(word => SIGNATURE_KEYWORDS.some(kw => word.text.toLowerCase().includes(kw)))
            .map(word => ({ text: word.text, bbox: word.bbox }));
        
        console.log(`✅ Analyse terminée. ${signatureZones.length} zone(s) de signature trouvée(s).`);
        
        return { extractedText: data.text, signatureZones };

    } catch (error) {
        console.error("❌ Erreur critique dans le service OCR avec Poppler/Tesseract:", error);
        return { extractedText: "", signatureZones: [] };
    } finally {
        try { await fs.unlink(`${tempImageFile}-1.png`); } catch (e) { /* Ignorer */ }
    }
};

export default {
    extractTextAndDetectSignatureZones,
};