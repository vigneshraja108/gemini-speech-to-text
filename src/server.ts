import express, { Request, Response } from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";

import { downloadYoutubeAudio } from "./downloadYoutubeAudio";
import { transcribeAudio } from "./transcribeWithGemini";

dotenv.config();

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());

// Transcribe from YouTube
app.post("/api/transcribe/youtube", async (req: Request, res: Response): Promise<void> => {
    console.log("✅ Received YouTube request with body:", req.body);

  try {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ error: "YouTube URL missing" });
      return;
    }

    const audioPath = await downloadYoutubeAudio(url);
        console.log("✅ audioPath:", audioPath);
    const transcript = await transcribeAudio(audioPath);
            console.log("✅ audioPath:", audioPath);

    fs.rmSync(audioPath, { force: true });

    res.json({ transcript });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Transcribe from uploaded audio
app.post("/api/transcribe/upload", upload.single("file"), async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    
    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const transcript = await transcribeAudio(file.path);
    fs.rmSync(file.path, { force: true });

    res.json({ transcript });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.listen(3000, () => {
  console.log("✅ Server running at http://localhost:3000");
});
