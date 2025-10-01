"use client";

import { useEffect, useRef, useState } from "react";

interface DitheredVideoFilterProps {
  videoSrc: string;
  pixelSize?: number;
  ditherStrength?: number;
  className?: string;
  useXPattern?: boolean;
}

export default function DitheredVideoFilter({
  videoSrc,
  pixelSize = 4,
  ditherStrength = 1,
  className = "",
  useXPattern = false,
}: DitheredVideoFilterProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const applyXPatternDithering = (
      imageData: ImageData,
      width: number,
      height: number,
    ) => {
      const data = imageData.data;
      const errorBuffer = new Float32Array(width * height);

      // Convert to grayscale and store in error buffer
      for (let i = 0; i < data.length; i += 4) {
        const gray =
          data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        errorBuffer[i / 4] = gray;
      }

      // X-pattern dithering with crosshatch effect
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          const oldPixel = errorBuffer[idx];

          // Create X-pattern threshold based on position
          const xPattern = Math.sin((x + y) * 0.3) * Math.cos((x - y) * 0.3);
          const threshold = 128 + xPattern * 30 * ditherStrength;

          const newPixel = oldPixel < threshold ? 0 : 255;
          errorBuffer[idx] = newPixel;

          const error = (oldPixel - newPixel) * ditherStrength;

          // X-pattern error distribution (creates crosshatch effect)
          if (x + 1 < width) errorBuffer[idx + 1] += (error * 6) / 16;
          if (x - 1 >= 0) errorBuffer[idx - 1] += (error * 2) / 16;
          if (y + 1 < height) {
            if (x > 0) errorBuffer[idx + width - 1] += (error * 2) / 16;
            errorBuffer[idx + width] += (error * 4) / 16;
            if (x + 1 < width) errorBuffer[idx + width + 1] += (error * 2) / 16;
          }
          if (y - 1 >= 0) {
            if (x > 0) errorBuffer[idx - width - 1] += (error * 1) / 16;
            errorBuffer[idx - width] += (error * 1) / 16;
            if (x + 1 < width) errorBuffer[idx - width + 1] += (error * 1) / 16;
          }

          // Set pixel to black or white
          const dataIdx = idx * 4;
          data[dataIdx] = data[dataIdx + 1] = data[dataIdx + 2] = newPixel;
          data[dataIdx + 3] = 255;
        }
      }

      return imageData;
    };

    const applyDithering = (
      imageData: ImageData,
      width: number,
      height: number,
    ) => {
      if (useXPattern) {
        return applyXPatternDithering(imageData, width, height);
      }

      const data = imageData.data;
      const errorBuffer = new Float32Array(width * height);

      // Convert to grayscale and store in error buffer
      for (let i = 0; i < data.length; i += 4) {
        const gray =
          data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        errorBuffer[i / 4] = gray;
      }

      // Floyd-Steinberg dithering
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          const oldPixel = errorBuffer[idx];
          const newPixel = oldPixel < 128 ? 0 : 255;
          errorBuffer[idx] = newPixel;

          const error = (oldPixel - newPixel) * ditherStrength;

          // Distribute error to neighboring pixels
          if (x + 1 < width) errorBuffer[idx + 1] += (error * 7) / 16;
          if (y + 1 < height) {
            if (x > 0) errorBuffer[idx + width - 1] += (error * 3) / 16;
            errorBuffer[idx + width] += (error * 5) / 16;
            if (x + 1 < width) errorBuffer[idx + width + 1] += (error * 1) / 16;
          }

          // Set pixel to black or white
          const dataIdx = idx * 4;
          data[dataIdx] = data[dataIdx + 1] = data[dataIdx + 2] = newPixel;
          data[dataIdx + 3] = 255;
        }
      }

      return imageData;
    };

    const processFrame = () => {
      if (video.paused || video.ended) {
        setIsPlaying(false);
        return;
      }

      const w = video.videoWidth;
      const h = video.videoHeight;

      // Check if video dimensions are available
      if (w === 0 || h === 0) {
        animationRef.current = requestAnimationFrame(processFrame);
        return;
      }

      canvas.width = w;
      canvas.height = h;

      // Draw video frame scaled down for pixelation
      const scaledW = Math.floor(w / pixelSize);
      const scaledH = Math.floor(h / pixelSize);

      ctx.drawImage(video, 0, 0, scaledW, scaledH);
      const imageData = ctx.getImageData(0, 0, scaledW, scaledH);

      // Apply dithering
      const dithered = applyDithering(imageData, scaledW, scaledH);
      ctx.putImageData(dithered, 0, 0);

      // Scale back up for pixelated effect
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(canvas, 0, 0, scaledW, scaledH, 0, 0, w, h);

      animationRef.current = requestAnimationFrame(processFrame);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      processFrame();
    };

    const handleLoadedMetadata = () => {
      // Video metadata is loaded, we can start processing
      if (!video.paused) {
        processFrame();
      }
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("playing", handlePlay);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("playing", handlePlay);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [pixelSize, ditherStrength, useXPattern]);

  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        src={videoSrc}
        className="absolute inset-0 w-full h-full object-cover invisible"
        autoPlay
        loop
        muted
        playsInline
        onError={(e) => console.error("Video error:", e)}
        onLoadStart={() => console.log("Video loading started")}
        onLoadedMetadata={() => console.log("Video metadata loaded")}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
