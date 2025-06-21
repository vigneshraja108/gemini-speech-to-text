import youtubedl from "youtube-dl-exec";
import path from "path";
import os from "os";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import ffmpegPath from "ffmpeg-static";

export async function downloadYoutubeAudio(url: string): Promise<string> {
      console.log("✅ Received YouTube request with url:", url);

  const tempDir = path.join(os.tmpdir(), uuidv4());
  fs.mkdirSync(tempDir, { recursive: true });
  const temp = "Audios"
  const outputPath = path.join(temp, "audio.mp3");
  console.log("outputPath",outputPath)
  try {
    await youtubedl(url, {
      extractAudio: true,
      audioFormat: "mp3",
      output: outputPath,
      ffmpegLocation: ffmpegPath ?? "ffmpeg",
      quiet: true,
    });
  } catch (err: any) {
    throw new Error(`yt-dlp error: ${err.message}`);
  }

  if (!fs.existsSync(outputPath)) {
    throw new Error("Failed to download audio.");
  }

  return outputPath;
}
