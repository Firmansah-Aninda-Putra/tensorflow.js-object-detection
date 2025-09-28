// rtsp-proxy.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const Stream = require('node-rtsp-stream');
const cors = require('cors');

const app = express();
app.use(cors());

// Buat HTTP server
const server = http.createServer(app);

// Ambil port dari environment variable atau gunakan 8888
const PORT = process.env.PORT || 8888;

// Konfigurasi RTSP stream
const streamConfig = {
  name: 'cctv-stream',
  streamUrl: 'rtsp://olean:cctvmadiun123@10.10.122.33:554/streaming/channels/2',
  wsPort: 9999,  // Port untuk WebSocket
  ffmpegOptions: {
    '-stats': '',
    '-r': 30, // frame rate
    '-q:v': 3, // kualitas video (lower is better)
  }
};

// Mulai stream
const stream = new Stream(streamConfig);

// Endpoint untuk memeriksa status server
app.get('/health', (req, res) => {
  res.json({ status: 'ok', stream: 'active' });
});

// Mulai server
server.listen(PORT, () => {
  console.log(`RTSP proxy server berjalan pada http://localhost:${PORT}`);
  console.log(`WebSocket stream tersedia pada ws://localhost:${streamConfig.wsPort}`);
});
// Di rtsp-proxy.js, tambahkan handler error
stream.on('error', (err) => {
  console.error('Stream error:', err);
});

// Di startDetection, tambahkan log
console.log("WebSocket URL:", wsUrl);
console.log("RTSP URL:", rtspUrl);

// Di JSMpeg Player, tambahkan callback
playerRef.current = new JSMpeg.Player(wsUrl, {
  canvas: canvas,
  autoplay: true,
  audio: false,
  loop: true,
  onPlay: () => console.log("Video mulai diputar"),
  onError: (err) => console.error("JSMpeg error:", err)
});