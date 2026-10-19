import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { GarmentKind } from '../types';

export interface GarmentTransform {
  x: number;
  y: number;
  angle: number;
  scaleX: number;
  scaleY: number;
}

export type PoseStatus = 'idle' | 'loading' | 'tracking' | 'searching' | 'unavailable';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

function calculateTransform(landmarks: NormalizedLandmark[], video: HTMLVideoElement, kind: GarmentKind): GarmentTransform | null {
  const visible = (index: number) => Boolean(landmarks[index]) && (landmarks[index].visibility ?? 1) > 0.5;
  const aspect = video.videoWidth / video.videoHeight;
  const point = (index: number) => {
    const landmark = landmarks[index];
    let x = landmark.x;
    let y = landmark.y;
    if (aspect > 0.8) {
      const visibleWidth = 0.8 / aspect;
      x = (x - (1 - visibleWidth) / 2) / visibleWidth;
    } else {
      const visibleHeight = aspect / 0.8;
      y = (y - (1 - visibleHeight) / 2) / visibleHeight;
    }
    // The preview is mirrored, so mirror the landmark coordinates too.
    return { x: (1 - x) * 400, y: y * 500 };
  };
  const midpoint = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
  const angle = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;

  if (kind === 'top' || kind === 'dress') {
    if (!visible(11) || !visible(12)) return null;
    const left = point(11);
    const right = point(12);
    const center = midpoint(left, right);
    const width = distance(left, right);
    const scaleX = width * (kind === 'top' ? 1.5 : 1.4) / 100;
    let scaleY = scaleX;
    if (kind === 'dress') {
      if (!visible(25) || !visible(26)) return null;
      scaleY = distance(center, midpoint(point(25), point(26))) / 110;
    }
    return { x: center.x, y: center.y, angle: angle(left, right), scaleX, scaleY };
  }

  if (kind === 'bottom') {
    if (!visible(23) || !visible(24)) return null;
    const left = point(23);
    const right = point(24);
    const center = midpoint(left, right);
    let legLength: number;
    if (visible(27) && visible(28)) legLength = distance(center, midpoint(point(27), point(28)));
    else if (visible(25) && visible(26)) legLength = distance(center, midpoint(point(25), point(26))) * 2.1;
    else return null;
    return { x: center.x, y: center.y, angle: angle(left, right), scaleX: distance(left, right) * 1.35 / 100, scaleY: legLength / 110 };
  }
  return null;
}

export function usePoseTracking(video: HTMLVideoElement | null, enabled: boolean, kind: GarmentKind, size: number) {
  const [status, setStatus] = useState<PoseStatus>('idle');
  const [transform, setTransform] = useState<GarmentTransform | null>(null);
  const sizeRef = useRef(size);
  sizeRef.current = size;

  useEffect(() => {
    if (!enabled || !video || kind === 'none') {
      setStatus('idle');
      setTransform(null);
      return;
    }

    let cancelled = false;
    let animationFrame = 0;
    let landmarker: PoseLandmarker | null = null;
    let previous: GarmentTransform | null = null;
    let lastVideoTime = -1;
    setStatus('loading');
    setTransform(null);

    const smooth = (target: GarmentTransform, factor: number): GarmentTransform => {
      if (!previous) return target;
      return {
        x: previous.x + (target.x - previous.x) * factor,
        y: previous.y + (target.y - previous.y) * factor,
        angle: previous.angle + (target.angle - previous.angle) * factor,
        scaleX: previous.scaleX + (target.scaleX - previous.scaleX) * factor,
        scaleY: previous.scaleY + (target.scaleY - previous.scaleY) * factor,
      };
    };

    const frame = () => {
      if (cancelled) return;
      animationFrame = requestAnimationFrame(frame);
      if (!landmarker || video.readyState < 2 || !video.videoWidth || video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;
      try {
        const result = landmarker.detectForVideo(video, performance.now());
        const landmarks = result.landmarks[0];
        const target = landmarks ? calculateTransform(landmarks, video, kind) : null;
        if (!target) {
          previous = null;
          setTransform(null);
          setStatus('searching');
          return;
        }
        target.scaleX *= sizeRef.current / 100;
        target.scaleY *= sizeRef.current / 100;
        previous = smooth(target, 0.35);
        setTransform(previous);
        setStatus('tracking');
      } catch {
        setStatus('unavailable');
        setTransform(null);
      }
    };

    const initialize = async () => {
      try {
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
        let instance: PoseLandmarker;
        try {
          instance = await PoseLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
            runningMode: 'VIDEO',
            numPoses: 1,
          });
        } catch {
          instance = await PoseLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
            runningMode: 'VIDEO',
            numPoses: 1,
          });
        }
        if (cancelled) {
          instance.close();
          return;
        }
        landmarker = instance;
        setStatus('searching');
        animationFrame = requestAnimationFrame(frame);
      } catch {
        if (!cancelled) setStatus('unavailable');
      }
    };

    void initialize();
    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
      landmarker?.close();
    };
  }, [video, enabled, kind]);

  return { poseStatus: status, poseTransform: transform };
}
