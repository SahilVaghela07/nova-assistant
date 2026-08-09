import express from 'express';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

const router = express.Router();
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

router.post('/', (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({ error: 'No files were uploaded.' });
  }

  const uploadedFile = req.files.file;
  const tempPath = path.join(UPLOAD_DIR, uploadedFile.name);

  try {
    // Ensure upload dir exists
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR);
    }
    
    // Clear old uploads so the AI doesn't get confused reading 100 old files
    fs.readdirSync(UPLOAD_DIR).forEach(file => {
      fs.unlinkSync(path.join(UPLOAD_DIR, file));
    });

    uploadedFile.mv(tempPath, (err) => {
      if (err) return res.status(500).send(err);

      let extractedFiles = [];

      // If it's a ZIP archive (like ChatGPT/Gemini exports)
      if (uploadedFile.name.endsWith('.zip')) {
        try {
          const zip = new AdmZip(tempPath);
          const zipEntries = zip.getEntries();
          
          zipEntries.forEach(entry => {
            // We only care about text/json files from the export
            if (!entry.isDirectory && (entry.entryName.endsWith('.txt') || entry.entryName.endsWith('.json') || entry.entryName.endsWith('.md'))) {
              const content = zip.readAsText(entry);
              const extractPath = path.join(UPLOAD_DIR, entry.name);
              fs.writeFileSync(extractPath, content);
              extractedFiles.push(entry.name);
            }
          });
          
          fs.unlinkSync(tempPath); // delete the original zip to save space
          return res.json({ success: true, message: `Successfully extracted ${extractedFiles.length} readable files from the archive. NOVA can now read them.`, files: extractedFiles });
        } catch (zipErr) {
          console.error("ZIP Error:", zipErr);
          return res.status(500).json({ error: 'Failed to extract ZIP file' });
        }
      }

      // If it's just a normal text/pdf/code file
      return res.json({ success: true, message: 'File uploaded successfully. NOVA can now read it.', files: [uploadedFile.name] });
    });

  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
