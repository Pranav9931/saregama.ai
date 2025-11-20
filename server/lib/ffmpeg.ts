import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';

export interface ChunkInfo {
  sequence: number;
  filePath: string;
  sizeBytes: number;
}

export interface ProcessingResult {
  playlistPath: string;
  chunks: ChunkInfo[];
  durationSeconds: number;
}

/**
 * Convert audio/video file to HLS format with small chunks (<100KB)
 * @param inputPath Path to input media file
 * @param outputDir Directory to store output files
 * @returns Processing result with playlist and chunk info
 */
export async function convertToHLS(
  inputPath: string,
  outputDir: string
): Promise<ProcessingResult> {
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  const jobId = nanoid(10);
  const playlistName = `playlist_${jobId}.m3u8`;
  const playlistPath = path.join(outputDir, playlistName);
  const chunkPattern = path.join(outputDir, `chunk_${jobId}_%03d.ts`);

  return new Promise((resolve, reject) => {
    let durationSeconds = 0;

    ffmpeg(inputPath)
      // Get duration first
      .on('codecData', (data: any) => {
        durationSeconds = Math.floor(data.duration ? parseFloat(data.duration.split(':').reduce((acc: number, time: string) => (60 * acc) + +time, 0)) : 0);
      })
      .on('end', async () => {
        try {
          // Read generated playlist
          const playlistContent = await fs.readFile(playlistPath, 'utf-8');
          
          // Find all generated chunk files
          const files = await fs.readdir(outputDir);
          const chunkFiles = files.filter(f => f.startsWith(`chunk_${jobId}_`) && f.endsWith('.ts'));
          
          // Get chunk info with sizes
          const chunks: ChunkInfo[] = await Promise.all(
            chunkFiles.map(async (file, idx) => {
              const filePath = path.join(outputDir, file);
              const stats = await fs.stat(filePath);
              return {
                sequence: idx,
                filePath,
                sizeBytes: stats.size,
              };
            })
          );

          // Sort by sequence number
          chunks.sort((a, b) => a.sequence - b.sequence);

          console.log(`✅ HLS conversion complete: ${chunks.length} chunks, total duration: ${durationSeconds}s`);
          
          // Check if any chunks exceed 100KB
          const largeChunks = chunks.filter(c => c.sizeBytes > 100 * 1024);
          if (largeChunks.length > 0) {
            console.warn(`⚠️  ${largeChunks.length} chunks exceed 100KB - may need smaller segment duration`);
          }

          resolve({
            playlistPath,
            chunks,
            durationSeconds,
          });
        } catch (error) {
          reject(new Error(`Failed to process HLS output: ${error}`));
        }
      })
      .on('error', (err: any) => {
        reject(new Error(`ffmpeg error: ${err.message}`));
      })
      .on('progress', (progress: any) => {
        console.log(`Processing: ${progress.percent?.toFixed(1) || 0}% done`);
      })
      // HLS output options optimized for small chunks
      .outputOptions([
        '-codec: copy', // Copy without re-encoding when possible
        '-start_number 0',
        '-hls_time 2', // 2 second segments (adjust if chunks still too large)
        '-hls_list_size 0',
        '-hls_segment_type mpegts',
        '-f hls',
        // Additional compression if needed
        '-b:a 64k', // Lower audio bitrate for smaller chunks
        '-maxrate 128k', // Max bitrate
        '-bufsize 256k', // Buffer size
      ])
      .output(playlistPath)
      .run();
  });
}

/**
 * Clean up temporary files
 */
export async function cleanup(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
    console.log(`🧹 Cleaned up: ${dir}`);
  } catch (error) {
    console.error(`Failed to cleanup ${dir}:`, error);
  }
}
