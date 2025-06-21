import { VertexAI, HarmCategory, HarmBlockThreshold } from "@google-cloud/vertexai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { v4 as uuidv4 } from "uuid";
import fsExtra from "fs-extra";

dotenv.config();

const project = process.env.VERTEX_PROJECT_ID!;
const location = "us-central1";

const vertexAI = new VertexAI({ project, location });

const model = vertexAI.getGenerativeModel({
  model: "models/gemini-2.5-flash",
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ],
  generationConfig: {
    maxOutputTokens: 8192,
  },
});

// Set FFmpeg path if needed (optional: only if ffmpeg not in PATH)
ffmpeg.setFfmpegPath('C:\\Users\\DELL\\Downloads\\ffmpeg-7.1.1-essentials_build\\ffmpeg-7.1.1-essentials_build\\bin\\ffmpeg.exe');

function splitAudio(filePath: string): Promise<{ chunkPaths: string[], outputDir: string }> {
  const outputDir = path.join("chunks", uuidv4());
  fs.mkdirSync(outputDir, { recursive: true });

  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .output(path.join(outputDir, "chunk-%03d.mp3"))
      .audioCodec("copy")
      .format("segment")
      .outputOptions(["-segment_time 60", "-reset_timestamps 1"])
      .on("end", () => {
        const chunkPaths = fs.readdirSync(outputDir)
          .map((f) => path.join(outputDir, f))
          .filter((f) => f.endsWith(".mp3"));
        resolve({ chunkPaths, outputDir });
      })
      .on("error", reject)
      .run();
  });
}

async function transcribeSingleChunk(filePath: string): Promise<string> {
  const audioBuffer = fs.readFileSync(filePath);
  const base64Audio = audioBuffer.toString("base64");

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: "Transcribe this audio clearly. Ignore background noise. Return text in the original language.",
          },
          {
            inlineData: {
              mimeType: "audio/mpeg",
              data: base64Audio,
            },
          },
        ],
      },
    ],
  });

  return result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export async function transcribeAudio(filePath: string): Promise<string> {
  try {
    const { chunkPaths, outputDir } = await splitAudio(filePath);
    console.log(`✅ Split into ${chunkPaths.length} chunks`);

    const allChunks: string[] = [];

    for (let i = 0; i < chunkPaths.length; i++) {
      console.log(`🔄 Transcribing chunk ${i + 1}/${chunkPaths.length}...`);
      const text = await transcribeSingleChunk(chunkPaths[i]);
      allChunks.push(`--- Chunk ${i + 1} ---\n${text}`);
    }

    // Cleanup
    fsExtra.removeSync(outputDir);
    console.log(`🧹 Cleaned up temp files in ${outputDir}`);

    return allChunks.join("\n\n");
  } catch (error) {
    console.error("❌ Error during transcription:", error);
    return "❌ Transcription failed: " + String(error);
  }
}
