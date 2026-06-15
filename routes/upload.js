const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const Document = require('../models/Document');
const User = require('../models/User');

// Configure Multer for PDF uploads
const upload = multer({ dest: 'uploads/' });

// Configure Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

router.post('/', upload.single('document'), async (req, res) => {
  try {
    const { firebaseUid } = req.body;
    
    if (!firebaseUid) {
      return res.status(400).json({ error: 'firebaseUid is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    // Find the user in MongoDB
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database. Please sync first.' });
    }

    // Read the PDF
    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;

    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'Could not extract text from PDF.' });
    }

    // Call Gemini to summarize the text
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Summarize the following study material, extracting the key concepts and creating brief study notes. If the material is very long, provide a high-level summary:\n\n${text.substring(0, 30000)}`;
    
    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    // Save to Database
    const newDoc = new Document({
      userId: user._id,
      filename: req.file.originalname,
      originalText: text.substring(0, 50000), // Keep some of the text for reference
      aiSummary: summary
    });

    await newDoc.save();

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({ message: 'Document processed successfully', document: newDoc });
  } catch (error) {
    console.error('Error processing document:', error);
    res.status(500).json({ error: 'Failed to process document' });
  }
});

module.exports = router;
