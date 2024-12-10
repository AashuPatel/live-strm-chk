const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
require('dotenv').config(); // Load environment variables

const app = express();
const port = process.env.PORT || 3000;

// Default static image path (absolute path to the image file)
const defaultStaticImagePath = './Image.png'; // Update this with your actual image path

// Endpoint to start FFmpeg stream
app.post('/start-stream', (req, res) => {
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
  const ffmpeg = spawn('ffmpeg', [
    '-re', '-i', audioStreamUrl,
    '-loop', '1', '-i', defaultStaticImagePath,
    '-vf', 'scale=256:-2', // Set resolution to 144p (256x144)
    '-c:v', 'libx264',
    '-preset', 'veryfast', // Faster encoding for lower latency
    '-b:v', '300k', // Set video bitrate for 144p quality
    '-bufsize', '500k', // Buffer size for smoother streaming
    '-c:a', 'aac',
    '-b:a', '128k', // Maintain lower audio bitrate for minimal quality
    '-ar', '44100', // Audio sampling rate
    '-pix_fmt', 'yuv420p',
    '-f', 'flv',
    '-rtmp_buffer', '500k', // Buffer setting for RTMP transmission
    '-rtmp_live', 'live', // Ensure live streaming compatibility
    youtubeRtmpUrl,
  ]);
  
  

  ffmpeg.stdout.on('data', (data) => {
    console.log(`FFmpeg stdout: ${data}`);
  });

  ffmpeg.stderr.on('data', (data) => {
    console.error(`FFmpeg stderr: ${data}`);
  });

  ffmpeg.on('close', (code) => {
    console.log(`FFmpeg process exited with code ${code}`);
  });

  res.send('Streaming started!');
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
