import React, { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import JSMpeg from '@cycjimmy/jsmpeg-player';

const App = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const playerRef = useRef(null);
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fps, setFps] = useState(0);
  const [detections, setDetections] = useState([]);
  const [rtspUrl, setRtspUrl] = useState("rtsp://olean:cctvmadiun123@10.10.122.33:554/streaming/channels/2");
  const [wsUrl, setWsUrl] = useState("ws://localhost:9999");
  const [isDetecting, setIsDetecting] = useState(false);
  const videoWrapperRef = useRef(null);

  // Warna untuk bounding box berdasarkan jenis objek
  const colors = {
    car: 'rgba(255, 0, 0, 0.6)',
    truck: 'rgba(0, 255, 0, 0.6)',
    bus: 'rgba(0, 0, 255, 0.6)',
    motorcycle: 'rgba(255, 255, 0, 0.6)',
    bicycle: 'rgba(255, 0, 255, 0.6)',
    person: 'rgba(0, 255, 255, 0.6)',
    default: 'rgba(200, 200, 200, 0.6)'
  };

  // Load model saat komponen mount
  useEffect(() => {
    const loadModel = async () => {
      try {
        setLoading(true);
        const loadedModel = await cocoSsd.load();
        setModel(loadedModel);
        setLoading(false);
        console.log("Model COCO-SSD berhasil dimuat");
      } catch (err) {
        console.error("Gagal memuat model:", err);
        setError("Gagal memuat model deteksi objek. Silakan muat ulang halaman.");
        setLoading(false);
      }
    };

    loadModel();

    // Cleanup
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, []);

  // Fungsi untuk memulai streaming dan deteksi
  const startDetection = async () => {
    try {
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      // Setup JSMpeg player for RTSP stream via WebSocket
      const videoWrapper = videoWrapperRef.current;
      if (videoWrapper) {
        // Hapus semua elemen anak sebelum menambahkan player baru
        while (videoWrapper.firstChild) {
          videoWrapper.removeChild(videoWrapper.firstChild);
        }

        playerRef.current = new JSMpeg.Player(wsUrl, {
          canvas: canvasRef.current,
          autoplay: true,
          audio: false,
          loop: true
        });

        setIsDetecting(true);
        setTimeout(() => {
          detectFrame();
        }, 1000); // Delay to ensure video is playing
      }
    } catch (err) {
      console.error("Gagal mengakses RTSP stream:", err);
      setError("Gagal mengakses RTSP stream. Pastikan RTSP URL benar dan server proxy berjalan.");
    }
  };

  // Fungsi untuk menghentikan deteksi
  const stopDetection = () => {
    setIsDetecting(false);
    if (playerRef.current) {
      playerRef.current.pause();
    }
  };

  // Fungsi untuk mendeteksi objek dalam frame
  const detectFrame = async () => {
    if (!isDetecting || !model || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const startTime = performance.now();
    
    try {
      // Deteksi objek pada canvas yang menampilkan video
      const predictions = await model.detect(canvas);
      
      // Filter untuk hanya kendaraan dan orang
      const vehicleClasses = ['car', 'truck', 'bus', 'motorcycle', 'bicycle', 'person'];
      const filteredPredictions = predictions.filter(prediction => 
        vehicleClasses.includes(prediction.class)
      );
      
      setDetections(filteredPredictions);
      
      // Hitung FPS
      const endTime = performance.now();
      setFps(Math.round(1000 / (endTime - startTime)));
      
      // Simpan gambar asli
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Gambar bounding box untuk setiap deteksi
      filteredPredictions.forEach(prediction => {
        const [x, y, width, height] = prediction.bbox;
        const color = colors[prediction.class] || colors.default;
        
        // Gambar bounding box
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, width, height);
        
        // Gambar background untuk label
        ctx.fillStyle = color;
        ctx.fillRect(x, y - 30, width, 30);
        
        // Gambar label teks
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.fillText(
          `${prediction.class} ${Math.round(prediction.score * 100)}%`, 
          x + 5, 
          y - 10
        );
      });
      
      // Restore gambar asli untuk frame berikutnya
      setTimeout(() => {
        if (isDetecting) {
          ctx.putImageData(imageData, 0, 0);
        }
      }, 50);
      
      // Lanjutkan deteksi frame berikutnya
      if (isDetecting) {
        requestAnimationFrame(detectFrame);
      }
    } catch (err) {
      console.error("Error pada deteksi:", err);
      if (isDetecting) {
        requestAnimationFrame(detectFrame);
      }
    }
  };

  // Ubah URL WebSocket saat RTSP URL berubah
  const updateWsUrl = () => {
    // URL WebSocket sudah tetap di port 9999
    setWsUrl("ws://localhost:9999");
  };

  return (
    <div className="container">
      <header>
        <h1>CCTV Vehicle and Person Detection</h1>
      </header>
      
      <main>
        {loading ? (
          <div className="loading-container">
            <p className="loading-text">Memuat model deteksi...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>{error}</p>
          </div>
        ) : (
          <div className="grid-container">
            <div>
              <div ref={videoWrapperRef} className="video-wrapper">
                <canvas 
                  ref={canvasRef}
                />
                
                <div className="fps-counter">
                  <p>{fps} FPS</p>
                </div>
              </div>
              
              <div className="controls">
                <input
                  type="text"
                  value={rtspUrl}
                  onChange={(e) => setRtspUrl(e.target.value)}
                  onBlur={updateWsUrl}
                  placeholder="RTSP URL"
                />
                {isDetecting ? (
                  <button
                    onClick={stopDetection}
                    className="btn btn-red"
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={startDetection}
                    className="btn btn-green"
                  >
                    Start
                  </button>
                )}
              </div>
            </div>
            
            <div className="detection-panel">
              <h2>Deteksi Objek</h2>
              
              <div>
                {detections.map((detection, index) => (
                  <div 
                    key={index} 
                    className="detection-item" 
                    style={{ backgroundColor: colors[detection.class] || colors.default }}
                  >
                    <p>
                      {detection.class.charAt(0).toUpperCase() + detection.class.slice(1)}: {Math.round(detection.score * 100)}%
                    </p>
                  </div>
                ))}
                
                {detections.length === 0 && <p className="no-detections">Tidak ada objek terdeteksi</p>}
              </div>
              
              <div className="summary">
                <h3>Ringkasan</h3>
                <div>
                  {Object.entries(
                    detections.reduce((acc, detection) => {
                      acc[detection.class] = (acc[detection.class] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([className, count]) => (
                    <p key={className} className="summary-item">
                      {className.charAt(0).toUpperCase() + className.slice(1)}: {count}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      
      <footer>
        <p>Vehicle and Person Detection System - Powered by TensorFlow.js and COCO-SSD</p>
      </footer>
    </div>
  );
};

export default App;