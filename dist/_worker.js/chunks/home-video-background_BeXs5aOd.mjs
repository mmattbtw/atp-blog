globalThis.process ??= {}; globalThis.process.env ??= {};
import { j as jsxRuntimeExports } from './jsx-runtime_DoH26EBh.mjs';
import { a as reactExports } from './_@astro-renderers_C0jZesLU.mjs';

function DitheredVideoFilter({
  videoSrc,
  pixelSize = 4,
  ditherStrength = 1,
  className = "",
  // maxFPS = 15, // Significantly reduced from 30fps
  maxWidth = 640
  // Limit maximum processing width
}) {
  const videoRef = reactExports.useRef(null);
  const canvasRef = reactExports.useRef(null);
  const animationRef = reactExports.useRef(0);
  const canvasContextRef = reactExports.useRef(null);
  const errorBufferRef = reactExports.useRef(null);
  const lastDimensionsRef = reactExports.useRef(
    null
  );
  const isProcessingRef = reactExports.useRef(false);
  const frameCountRef = reactExports.useRef(0);
  const lastTimeRef = reactExports.useRef(0);
  const frameSkipRef = reactExports.useRef(0);
  const [reducedMotion, setReducedMotion] = reactExports.useState(false);
  const staticFrameRef = reactExports.useRef(null);
  const lastProcessedTimeRef = reactExports.useRef(0);
  const [hasVideoError, setHasVideoError] = reactExports.useState(false);
  const checkReducedMotion = reactExports.useCallback(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mediaQuery.matches);
      const handleChange = (e) => {
        setReducedMotion(e.matches);
      };
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
    return () => {
    };
  }, []);
  const applyDithering = reactExports.useCallback(
    (imageData, width, height, useStaticPattern = false) => {
      const data = imageData.data;
      const pixelCount = width * height;
      if (!errorBufferRef.current || errorBufferRef.current.length !== pixelCount) {
        errorBufferRef.current = new Float32Array(pixelCount);
      }
      const errorBuffer = errorBufferRef.current;
      errorBuffer.fill(0);
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        const pixelIndex = i >> 2;
        errorBuffer[pixelIndex] = gray;
        let newPixel;
        if (useStaticPattern) {
          const x = i / 4 % width;
          const y = Math.floor(i / 4 / width);
          const patternValue = (x + y) % 2;
          const threshold = 128 + (patternValue - 0.5) * ditherStrength * 10;
          newPixel = gray < threshold ? 0 : 255;
        } else {
          const threshold = 128 + (Math.random() - 0.5) * ditherStrength * 20;
          newPixel = gray < threshold ? 0 : 255;
        }
        data[i] = data[i + 1] = data[i + 2] = newPixel;
        data[i + 3] = 255;
      }
      return imageData;
    },
    [ditherStrength]
  );
  const processFrame = reactExports.useCallback(() => {
    if (reducedMotion || hasVideoError) {
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    if (video.paused || video.ended) {
      isProcessingRef.current = false;
      return;
    }
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w === 0 || h === 0) {
      isProcessingRef.current = false;
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }
    frameSkipRef.current++;
    if (frameSkipRef.current % 4 !== 0) {
      isProcessingRef.current = false;
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }
    const maxW = Math.min(w, maxWidth);
    const maxH = Math.floor(h * maxW / w);
    if (canvas.width !== maxW || canvas.height !== maxH) {
      canvas.width = maxW;
      canvas.height = maxH;
      canvasContextRef.current = null;
    }
    if (!canvasContextRef.current) {
      canvasContextRef.current = canvas.getContext("2d", {
        willReadFrequently: true,
        alpha: false
        // Disable alpha for better performance
      });
    }
    const ctx = canvasContextRef.current;
    if (!ctx) {
      isProcessingRef.current = false;
      return;
    }
    const scaledW = Math.floor(maxW / pixelSize);
    const scaledH = Math.floor(maxH / pixelSize);
    if (scaledW < 1 || scaledH < 1) {
      isProcessingRef.current = false;
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }
    let imageData;
    try {
      ctx.drawImage(video, 0, 0, scaledW, scaledH);
      imageData = ctx.getImageData(0, 0, scaledW, scaledH);
    } catch (error) {
      console.warn("Canvas manipulation blocked due to CORS policy:", error);
      setHasVideoError(true);
      isProcessingRef.current = false;
      return;
    }
    const dithered = applyDithering(imageData, scaledW, scaledH, reducedMotion);
    ctx.putImageData(dithered, 0, 0);
    if (reducedMotion) {
      staticFrameRef.current = dithered;
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvas, 0, 0, scaledW, scaledH, 0, 0, maxW, maxH);
    isProcessingRef.current = false;
    animationRef.current = requestAnimationFrame(processFrame);
  }, [pixelSize, maxWidth, applyDithering, reducedMotion, hasVideoError]);
  const handlePlay = reactExports.useCallback(() => {
    if (!isProcessingRef.current && !reducedMotion && !hasVideoError) {
      frameSkipRef.current = 0;
      processFrame();
    }
  }, [processFrame, reducedMotion, hasVideoError]);
  const handleLoadedMetadata = reactExports.useCallback(() => {
    const video = videoRef.current;
    if (video && !video.paused && !isProcessingRef.current && !reducedMotion && !hasVideoError) {
      frameSkipRef.current = 0;
      processFrame();
    }
  }, [processFrame, reducedMotion, hasVideoError]);
  const handleEnded = reactExports.useCallback(() => {
    const video = videoRef.current;
    if (video && video.loop && !reducedMotion && !hasVideoError) {
      frameCountRef.current = 0;
      frameSkipRef.current = 0;
      setTimeout(() => {
        if (!video.paused && !isProcessingRef.current) {
          processFrame();
        }
      }, 16);
    }
  }, [processFrame, reducedMotion, hasVideoError]);
  const cleanup = reactExports.useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }
    if (canvasContextRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvasContextRef.current;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      canvasContextRef.current = null;
    }
    if (errorBufferRef.current) {
      errorBufferRef.current = null;
    }
    isProcessingRef.current = false;
    frameCountRef.current = 0;
    frameSkipRef.current = 0;
    lastTimeRef.current = 0;
    lastDimensionsRef.current = null;
  }, []);
  reactExports.useEffect(() => {
    const cleanup2 = checkReducedMotion();
    return cleanup2;
  }, [checkReducedMotion]);
  const createStaticBackground = reactExports.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const width = 640;
    const height = 360;
    canvas.width = width;
    canvas.height = height;
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const x = i / 4 % width;
      const y = Math.floor(i / 4 / width);
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
  reactExports.useEffect(() => {
    if (reducedMotion) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = 0;
      }
      isProcessingRef.current = false;
      createStaticBackground();
    } else {
      frameSkipRef.current = 0;
      lastProcessedTimeRef.current = 0;
      isProcessingRef.current = false;
      if (!isProcessingRef.current) {
        processFrame();
      }
    }
  }, [reducedMotion, processFrame, createStaticBackground]);
  reactExports.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.addEventListener("play", handlePlay);
    video.addEventListener("playing", handlePlay);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("ended", handleEnded);
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
    reducedMotion
  ]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `relative ${className}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "video",
      {
        ref: videoRef,
        src: videoSrc,
        crossOrigin: "anonymous",
        className: `absolute inset-0 w-full h-full object-cover ${hasVideoError ? "opacity-50" : "invisible"} ${reducedMotion ? "reduced-motion" : ""}`,
        autoPlay: true,
        loop: true,
        muted: true,
        playsInline: true,
        onError: (e) => {
          console.error("Video error:", e);
          setHasVideoError(true);
        },
        onLoadStart: () => console.log("Video loading started"),
        onLoadedMetadata: () => console.log("Video metadata loaded")
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "canvas",
      {
        ref: canvasRef,
        className: "absolute inset-0 w-full h-full object-cover",
        style: { imageRendering: "pixelated" }
      }
    ),
    hasVideoError && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-gray-900 text-white text-sm opacity-75", children: "Video filter unavailable (CORS)" })
  ] });
}

function HomeVideoBackground() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    DitheredVideoFilter,
    {
      videoSrc: "https://wh9xsi1isi.ufs.sh/f/3pCuYtORE70iQcTd1tzKQmgchpDLvW6HRVeJosuUikOnjwbf",
      pixelSize: 3,
      maxFPS: 12,
      maxWidth: 1e3,
      className: "fixed inset-0 w-screen h-screen object-cover -z-10 invert dark:invert-0"
    }
  );
}
function BlogVideoBackground() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    DitheredVideoFilter,
    {
      videoSrc: "https://wh9xsi1isi.ufs.sh/f/3pCuYtORE70iFh1vC2kQTmgCPNMpYynkzK4WXJelbq527Zjo",
      pixelSize: 4,
      maxFPS: 12,
      maxWidth: 1e3,
      className: "fixed inset-0 w-screen h-screen object-cover -z-10 invert dark:invert-0"
    }
  );
}

export { BlogVideoBackground as B, HomeVideoBackground as H };
