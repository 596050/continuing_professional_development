"use client";

import { useRef, useState, useCallback } from "react";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setError("Camera access denied. Please allow camera permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    setCaptured(true);
    stopCamera();
  }, [stopCamera]);

  const confirm = useCallback(() => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `evidence-${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapture(file);
      }
    }, "image/jpeg", 0.9);
  }, [onCapture]);

  const retake = useCallback(() => {
    setCaptured(false);
    startCamera();
  }, [startCamera]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between p-4 bg-black/80">
        <h2 className="text-white font-semibold">Capture Evidence</h2>
        <button
          onClick={() => { stopCamera(); onClose(); }}
          className="text-white text-2xl leading-none"
          aria-label="Close camera"
        >
          x
        </button>
      </div>

      <div className="flex-1 relative">
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-white p-4 text-center">
            <div>
              <p className="mb-4">{error}</p>
              <button onClick={startCamera} className="bg-blue-600 text-white px-4 py-2 rounded">
                Try Again
              </button>
            </div>
          </div>
        )}

        {!captured && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
            onLoadedMetadata={() => videoRef.current?.play()}
          />
        )}

        <canvas
          ref={canvasRef}
          className={captured ? "w-full h-full object-contain" : "hidden"}
        />
      </div>

      <div className="p-4 bg-black/80 flex justify-center gap-4">
        {!captured && !stream && (
          <button onClick={startCamera} className="bg-blue-600 text-white px-6 py-3 rounded-full font-medium">
            Open Camera
          </button>
        )}
        {!captured && stream && (
          <button onClick={capture} className="bg-white text-black px-6 py-3 rounded-full font-medium">
            Take Photo
          </button>
        )}
        {captured && (
          <>
            <button onClick={retake} className="bg-gray-600 text-white px-6 py-3 rounded-full font-medium">
              Retake
            </button>
            <button onClick={confirm} className="bg-green-600 text-white px-6 py-3 rounded-full font-medium">
              Use Photo
            </button>
          </>
        )}
      </div>
    </div>
  );
}
