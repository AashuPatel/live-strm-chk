const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
require('dotenv').config(); // Load environment variables

const app = express();
const port = process.env.PORT || 3000;

// Default static image path (absolute path to the image file)
const defaultStaticImagePath = './Image.png'; // Update this with your actual image path

// Variable to track if streaming is active
let isStreaming = false;
let ffmpegProcess = null;

// Endpoint to start FFmpeg stream
app.post('/start-stream', (req, res) => {
  if (isStreaming) {
    // If streaming is already active, kill the existing process
    console.log('Stream is already running. Terminating the existing stream...');
    ffmpegProcess.kill('SIGINT');
    isStreaming = false; // Reset streaming status
    ffmpegProcess = null; // Clear the process reference
  }

  const streamKey = process.env.YOUTUBE_STREAM_KEY; // Use the stream key from .env
  if (!streamKey) {
    return res.status(400).send('Stream key is not configured.');
  }

  const audioStreamUrl = 'http://air.pc.cdn.bitgravity.com/air/live/pbaudio001/playlist.m3u8';
  const youtubeRtmpUrl = `rtmp://a.rtmp.youtube.com/live2/${streamKey}`;

  // Verify that the static image file exists
  if (!fs.existsSync(defaultStaticImagePath)) {
    return res.status(500).send('Default static image is missing.');
  }

  // Start FFmpeg process
  ffmpegProcess = spawn('ffmpeg', [
    '-re', '-i', audioStreamUrl,
    '-loop', '1', '-i', defaultStaticImagePath,
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', // Ensure dimensions are divisible by 2
    '-c:v', 'libx264', '-tune', 'stillimage',
    '-c:a', 'aac', '-b:a', '128k',
    '-pix_fmt', 'yuv420p', '-shortest',
    '-f', 'flv', youtubeRtmpUrl,
    '-rtmp_buffer', '1000k', // Set buffer size for RTMP
    '-rtmp_live', 'live',
  ]);

  // Set streaming status to true
  isStreaming = true;

  ffmpegProcess.stdout.on('data', (data) => {
    console.log(`FFmpeg stdout: ${data}`);
  });

  ffmpegProcess.stderr.on('data', (data) => {
    console.error(`FFmpeg stderr: ${data}`);
  });

  ffmpegProcess.on('close', (code) => {
    console.log(`FFmpeg process exited with code ${code}`);
    isStreaming = false; // Reset the flag when the stream stops
    ffmpegProcess = null; // Clear the process reference
  });

  res.send('Streaming started!');
});

// Endpoint to stop the streaming
app.post('/stop-stream', (req, res) => {
  if (!isStreaming) {
    return res.status(400).send('No stream is currently running.');
  }

  // Kill the streaming process
  ffmpegProcess.kill('SIGINT');
  isStreaming = false;
  ffmpegProcess = null;

  res.send('Streaming stopped!');
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
