
import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus = "off" | "starting" | "live" | "error";

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestIdRef = useRef(0);

  const [status, setStatus] = useState<CameraStatus>("off");
  const [error, setError] = useState("");

  const stopCamera = useCallback(() => {
    // Invalidate any camera request that is still pending.
    requestIdRef.current += 1;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setError("");
    setStatus("off");
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Camera access is not supported. Use a current browser over HTTPS or localhost."
      );
      setStatus("error");
      return;
    }

    const requestId = ++requestIdRef.current;

    // Stop the previous stream before starting another one.
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    setError("");
    setStatus("starting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      // Ignore a stale request if the user stopped/restarted the camera.
      if (requestId !== requestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      const video = videoRef.current;

      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setStatus("off");
        return;
      }

      video.srcObject = stream;
      await video.play();

      if (requestId === requestIdRef.current) {
        setStatus("live");
      } else {
        stream.getTracks().forEach((track) => track.stop());
        if (video.srcObject === stream) {
          video.srcObject = null;
        }
      }
    } catch (cause) {
      if (requestId !== requestIdRef.current) return;

      const cameraError = cause as DOMException;

      const messages: Record<string, string> = {
        NotAllowedError:
          "Camera permission was denied. Allow camera access in your browser settings.",
        NotFoundError: "No camera was found on this device.",
        NotReadableError:
          "The camera is busy in another application. Close that app and try again.",
        OverconstrainedError:
          "The camera cannot satisfy the requested settings.",
        AbortError: "Camera startup was interrupted. Please try again.",
      };

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      setError(
        messages[cameraError.name] ??
        "Could not start the camera. Check your camera connection and browser permissions."
      );
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  return {
    videoRef,
    status,
    error,
    startCamera,
    stopCamera,
  };
}
