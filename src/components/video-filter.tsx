"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface DitheredVideoFilterProps {
  videoSrc: string;
  pixelSize?: number;
  ditherStrength?: number;
  className?: string;
  maxFPS?: number;
  maxWidth?: number;
}

export default function DitheredVideoFilter({
  videoSrc,
  pixelSize = 4,
  ditherStrength = 1,
  className = "",
  // maxFPS = 15, // Significantly reduced from 30fps
  maxWidth = 640, // Limit maximum processing width
}: DitheredVideoFilterProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const canvasContextRef = useRef<CanvasRenderingContext2D | null>(null);

  // Reusable buffers to avoid memory allocations
  const errorBufferRef = useRef<Float32Array | null>(null);
  const lastDimensionsRef = useRef<{ width: number; height: number } | null>(
    null,
  );

  // Performance optimization refs
  const isProcessingRef = useRef(false);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(0);
  const frameSkipRef = useRef(0);

  // Reduced motion support
  const [reducedMotion, setReducedMotion] = useState(false);
  const staticFrameRef = useRef<ImageData | null>(null);
  const lastProcessedTimeRef = useRef(0);

  // Error state for CORS issues
  const [hasVideoError, setHasVideoError] = useState(false);

  // Check for reduced motion preference
  const checkReducedMotion = useCallback(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mediaQuery.matches);

      // Listen for changes to the preference
      const handleChange = (e: MediaQueryListEvent) => {
        setReducedMotion(e.matches);
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
    return () => {};
  }, []);

  // Simplified dithering function with reduced memory usage
  const applyDithering = useCallback(
    (
      imageData: ImageData,
      width: number,
      height: number,
      useStaticPattern = false,
    ) => {
      const data = imageData.data;
      const pixelCount = width * height;

      // Use a smaller buffer for error diffusion (only store grayscale values)
      if (
        !errorBufferRef.current ||
        errorBufferRef.current.length !== pixelCount
      ) {
        errorBufferRef.current = new Float32Array(pixelCount);
      }

      const errorBuffer = errorBufferRef.current;
      errorBuffer.fill(0);

      // Convert to grayscale and apply dithering
      for (let i = 0; i < data.length; i += 4) {
        const gray =
          data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        const pixelIndex = i >> 2;
        errorBuffer[pixelIndex] = gray;

        let newPixel: number;

        if (useStaticPattern) {
          // For reduced motion, use a consistent pattern based on position
          const x = (i / 4) % width;
          const y = Math.floor(i / 4 / width);
          const patternValue = (x + y) % 2;
          const threshold = 128 + (patternValue - 0.5) * ditherStrength * 10;
          newPixel = gray < threshold ? 0 : 255;
        } else {
          // Normal dithering with noise
          const threshold = 128 + (Math.random() - 0.5) * ditherStrength * 20;
          newPixel = gray < threshold ? 0 : 255;
        }

        // Set pixel directly
        data[i] = data[i + 1] = data[i + 2] = newPixel;
        data[i + 3] = 255;
      }

      return imageData;
    },
    [ditherStrength],
  );

  // Highly optimized processFrame function with aggressive frame skipping
  const processFrame = useCallback(() => {
    // Don't process anything if reduced motion is enabled or there's a video error
    if (reducedMotion || hasVideoError) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Prevent multiple simultaneous processing
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    if (video.paused || video.ended) {
      isProcessingRef.current = false;
      return;
    }

    const w = video.videoWidth;
    const h = video.videoHeight;

    // Check if video dimensions are available
    if (w === 0 || h === 0) {
      isProcessingRef.current = false;
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Aggressive frame skipping - process every 4th frame for 15fps target
    frameSkipRef.current++;
    if (frameSkipRef.current % 4 !== 0) {
      isProcessingRef.current = false;
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Limit maximum processing resolution to reduce memory usage
    const maxW = Math.min(w, maxWidth);
    const maxH = Math.floor((h * maxW) / w);

    // Only resize canvas if dimensions changed
    if (canvas.width !== maxW || canvas.height !== maxH) {
      canvas.width = maxW;
      canvas.height = maxH;
      canvasContextRef.current = null;
    }

    // Get or cache canvas context
    if (!canvasContextRef.current) {
      canvasContextRef.current = canvas.getContext("2d", {
        willReadFrequently: true,
        alpha: false, // Disable alpha for better performance
      });
    }

    const ctx = canvasContextRef.current;
    if (!ctx) {
      isProcessingRef.current = false;
      return;
    }

    // Draw video frame scaled down for pixelation (further reduced)
    const scaledW = Math.floor(maxW / pixelSize);
    const scaledH = Math.floor(maxH / pixelSize);

    // Ensure minimum size to avoid errors
    if (scaledW < 1 || scaledH < 1) {
      isProcessingRef.current = false;
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }

    let imageData: ImageData;
    try {
      ctx.drawImage(video, 0, 0, scaledW, scaledH);
      imageData = ctx.getImageData(0, 0, scaledW, scaledH);
    } catch (error) {
      // Handle CORS errors or other canvas manipulation issues
      console.warn("Canvas manipulation blocked due to CORS policy:", error);
      setHasVideoError(true);
      isProcessingRef.current = false;
      return;
    }

    // Apply dithering with reduced motion support
    const dithered = applyDithering(imageData, scaledW, scaledH, reducedMotion);
    ctx.putImageData(dithered, 0, 0);

    // Store static frame for reduced motion
    if (reducedMotion) {
      staticFrameRef.current = dithered;
    }

    // Scale back up for pixelated effect
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvas, 0, 0, scaledW, scaledH, 0, 0, maxW, maxH);

    isProcessingRef.current = false;
    animationRef.current = requestAnimationFrame(processFrame);
  }, [pixelSize, maxWidth, applyDithering, reducedMotion]);

  // Optimized event handlers with useCallback for better performance
  const handlePlay = useCallback(() => {
    if (!isProcessingRef.current && !reducedMotion && !hasVideoError) {
      frameSkipRef.current = 0; // Reset frame skip counter
      processFrame();
    }
  }, [processFrame, reducedMotion, hasVideoError]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (
      video &&
      !video.paused &&
      !isProcessingRef.current &&
      !reducedMotion &&
      !hasVideoError
    ) {
      frameSkipRef.current = 0; // Reset frame skip counter
      processFrame();
    }
  }, [processFrame, reducedMotion, hasVideoError]);

  const handleEnded = useCallback(() => {
    // Video ended, restart processing for loop
    const video = videoRef.current;
    if (video && video.loop && !reducedMotion && !hasVideoError) {
      // Reset frame counters for smooth loop
      frameCountRef.current = 0;
      frameSkipRef.current = 0;
      // Small delay to ensure video is ready to loop
      setTimeout(() => {
        if (!video.paused && !isProcessingRef.current) {
          processFrame();
        }
      }, 16); // ~1 frame at 60fps
    }
  }, [processFrame, reducedMotion, hasVideoError]);

  // Enhanced cleanup function with memory management
  const cleanup = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }

    // Clear canvas context
    if (canvasContextRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvasContextRef.current;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      canvasContextRef.current = null;
    }

    // Clear error buffer to free memory
    if (errorBufferRef.current) {
      errorBufferRef.current = null;
    }

    // Reset all refs
    isProcessingRef.current = false;
    frameCountRef.current = 0;
    frameSkipRef.current = 0;
    lastTimeRef.current = 0;
    lastDimensionsRef.current = null;
  }, []);

  // Initialize reduced motion detection
  useEffect(() => {
    const cleanup = checkReducedMotion();
    return cleanup;
  }, [checkReducedMotion]);

  // Create static background for reduced motion
  const createStaticBackground = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const width = 640;
    const height = 360;
    canvas.width = width;
    canvas.height = height;

    // Create a static dithered pattern
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % width;
      const y = Math.floor(i / 4 / width);

      // Create a simple checkerboard pattern with some variation
      const patternValue = (x + y) % 2;
      const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.3;
      const gray = 128 + patternValue * 50 + noise * 30;

      const threshold = 128 + (patternValue - 0.5) * ditherStrength * 10;
      const newPixel = gray < threshold ? 0 : 255;

      data[i] = data[i + 1] = data[i + 2] = newPixel;
      data[i + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
  }, [ditherStrength]);

  // Handle reduced motion state changes
  useEffect(() => {
    if (reducedMotion) {
      // Stop ALL video processing and show static background
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = 0;
      }
      isProcessingRef.current = false;
      createStaticBackground();
    } else {
      // Resume normal processing
      frameSkipRef.current = 0;
      lastProcessedTimeRef.current = 0;
      isProcessingRef.current = false;
      if (!isProcessingRef.current) {
        processFrame();
      }
    }
  }, [reducedMotion, processFrame, createStaticBackground]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Add event listeners
    video.addEventListener("play", handlePlay);
    video.addEventListener("playing", handlePlay);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("ended", handleEnded);

    // Pause processing when tab becomes hidden to save memory
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cleanup();
      } else if (!video.paused && !reducedMotion) {
        frameSkipRef.current = 0;
        processFrame();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cleanup();
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("playing", handlePlay);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("ended", handleEnded);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    handlePlay,
    handleLoadedMetadata,
    handleEnded,
    cleanup,
    processFrame,
    reducedMotion,
  ]);

  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        src={videoSrc}
        crossOrigin="anonymous"
        className={`absolute inset-0 w-full h-full object-cover ${
          hasVideoError ? "opacity-50" : "invisible"
        } ${reducedMotion ? "reduced-motion" : ""}`}
        autoPlay
        loop
        muted
        playsInline
        onError={(e) => {
          console.error("Video error:", e);
          setHasVideoError(true);
        }}
        onLoadStart={() => console.log("Video loading started")}
        onLoadedMetadata={() => console.log("Video metadata loaded")}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ imageRendering: "pixelated" }}
      />
      {hasVideoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white text-sm opacity-75">
          Video filter unavailable (CORS)
        </div>
      )}
    </div>
  );
}
