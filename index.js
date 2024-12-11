const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
require('dotenv').config(); // Load environment variables
const app = express();
const port = process.env.PORT || 3000;

// Default static image path (absolute path to the image file)
const defaultStaticImagePath = './Image.png'; // Update this with your actual image path

let ffmpegProcess = null; // Variable to store the FFmpeg process

// Endpoint to start FFmpeg stream
app.get('/', (req, res) => {
  res.send("Get request");
});



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

  // Respond to the client immediately
  res.send('Streaming will start in 1 minute.');

  // Delay the FFmpeg process start by 1 minute (60000 ms)
  setTimeout(() => {
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

    ffmpegProcess.stdout.on('data', (data) => {
      console.log(`FFmpeg stdout: ${data}`);
    });

    ffmpegProcess.stderr.on('data', (data) => {
      console.error(`FFmpeg stderr: ${data}`);
    });

    ffmpegProcess.on('close', (code) => {
      console.log(`FFmpeg process exited with code ${code}`);
      ffmpegProcess = null; // Reset the process variable when FFmpeg exits
    });

    console.log('Streaming has started after 1-minute delay.');
  }, 60000); // 1-minute delay
});


// app.post('/start-stream', (req, res) => {
//   if (ffmpegProcess) {
//     return res.status(400).send('Streaming is already running.');
//   }

//   const streamKey = process.env.YOUTUBE_STREAM_KEY; // Use the stream key from .env
//   if (!streamKey) {
//     return res.status(400).send('Stream key is not configured.');
//   }

//   const audioStreamUrl = 'http://air.pc.cdn.bitgravity.com/air/live/pbaudio001/playlist.m3u8';
//   const youtubeRtmpUrl = `rtmp://a.rtmp.youtube.com/live2/${streamKey}`;

//   // Verify that the static image file exists
//   if (!fs.existsSync(defaultStaticImagePath)) {
//     return res.status(500).send('Default static image is missing.');
//   }

//   // Start FFmpeg process
//   ffmpegProcess = spawn('ffmpeg', [
//     '-re', '-i', audioStreamUrl,
//     '-loop', '1', '-i', defaultStaticImagePath,
//     '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', // Ensure dimensions are divisible by 2
//     '-c:v', 'libx264', '-tune', 'stillimage',
//     '-c:a', 'aac', '-b:a', '128k',
//     '-pix_fmt', 'yuv420p', '-shortest',
//     '-f', 'flv', youtubeRtmpUrl,
//     '-rtmp_buffer', '1000k', // Set buffer size for RTMP
//     '-rtmp_live', 'live',
//   ]);

//   ffmpegProcess.stdout.on('data', (data) => {
//     console.log(`FFmpeg stdout: ${data}`);
//   });

//   ffmpegProcess.stderr.on('data', (data) => {
//     console.error(`FFmpeg stderr: ${data}`);
//   });

//   ffmpegProcess.on('close', (code) => {
//     console.log(`FFmpeg process exited with code ${code}`);
//     ffmpegProcess = null; // Reset the process variable when FFmpeg exits
//   });

//   res.send('Streaming started!');
// });



// Endpoint to stop FFmpeg stream
app.get('/stop-stream', (req, res) => {
  // if (!ffmpegProcess) {
  //   return res.status(400).send('No streaming process is currently running.');
  // }

  ffmpegProcess.kill('SIGINT'); // Gracefully terminate the FFmpeg process
  ffmpegProcess = null; // Reset the process variable
  res.send('Streaming stopped!');
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});