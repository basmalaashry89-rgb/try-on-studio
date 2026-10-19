import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { createDecartClient, models } from "@decartai/sdk";
import type { Garment, Snapshot } from "../types";
import { GarmentPaths } from "./GarmentArt";
import ClothingCatalog from "./ClothingCatalog";
import { formatPrice } from "../data/catalog";
import { useCamera } from "../hooks/useCamera";
import { usePoseTracking } from "../hooks/usePoseTracking";
import { fashionApi } from "../services/fashionApi";
import type { FashionItemDetails } from "../services/fashionApi";

interface StudioPageProps {
  garments: Garment[];
  selected: Garment;
  category: Garment["category"] | "all";
  onCategoryChange: (category: Garment["category"] | "all") => void;
  onSelect: (garment: Garment) => void;
  onHome: () => void;
}

export default function StudioPage({
  garments,
  selected,
  category,
  onCategoryChange,
  onSelect,
  onHome,
}: StudioPageProps) {
  const { videoRef, status, error, startCamera, stopCamera } = useCamera();
  const stageRef = useRef<HTMLDivElement>(null);
  const previousSelectedIdRef = useRef(selected.id);
  const [size, setSize] = useState(100);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [hudVisible, setHudVisible] = useState(true);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const snapshotsRef = useRef<Snapshot[]>([]);
  const dragStart = useRef<{
    x: number;
    y: number;
    originX: number;
    originY: number;
  } | null>(null);
  const kind =
    selected.shape === "pants"
      ? "bottom"
      : selected.shape === "dress"
        ? "dress"
        : selected.shape === "acc"
          ? "none"
          : "top";
  const { poseStatus, poseTransform } = usePoseTracking(
    videoRef.current,
    status === "live",
    kind,
    size,
  );

  const [productDetails, setProductDetails] =
    useState<FashionItemDetails | null>(null);

  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    null,
  );

  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProductDetails() {
      const productId = Number(selected.id);

      if (!Number.isInteger(productId) || productId <= 0) {
        setProductDetails(null);
        setSelectedVariantId(null);
        setDetailsError("Invalid product ID.");
        return;
      }

      try {
        setDetailsLoading(true);
        setDetailsError("");
        setProductDetails(null);
        setSelectedVariantId(null);

        const details = await fashionApi.getFashionItem(productId);

        if (cancelled) return;

        setProductDetails(details);
        setSelectedVariantId(details.variants[0]?.id ?? null);
      } catch (err) {
        if (cancelled) return;

        setDetailsError(
          err instanceof Error
            ? err.message
            : "Could not load product variants.",
        );
      } finally {
        if (!cancelled) setDetailsLoading(false);
      }
    }

    void loadProductDetails();

    return () => {
      cancelled = true;
    };
  }, [selected.id]);

  const selectedVariant =
    productDetails?.variants.find(
      (variant) => variant.id === selectedVariantId,
    ) ?? null;

  useEffect(() => {
    snapshotsRef.current = snapshots;
  }, [snapshots]);
  useEffect(
    () => () =>
      snapshotsRef.current.forEach((snapshot) =>
        URL.revokeObjectURL(snapshot.url),
      ),
    [],
  );
  const aiVideoRef = useRef<HTMLVideoElement>(null);
  const realtimeRef = useRef<Awaited<
    ReturnType<ReturnType<typeof createDecartClient>["realtime"]["connect"]>
  > | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiActive, setAiActive] = useState(false);

  const captureSnapshot = () => {
    const stage = stageRef.current;
    const video = aiActive ? aiVideoRef.current : videoRef.current;
    if (!video || !stage || video.readyState < 2 || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const context = canvas.getContext("2d");
    if (!context) return;
    // The local camera is mirrored in the preview. The Decart stream uses its own mirror setting.
    if (!aiActive) {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const snapshot: Snapshot = {
        id: crypto.randomUUID(),
        url: URL.createObjectURL(blob),
        name: `try-on-${new Date().toISOString().slice(0, 19).replaceAll(":", "-")}.png`,
      };
      setSnapshots((current) => [snapshot, ...current].slice(0, 6));
    }, "image/png");
  };
  const stopAiTryOn = useCallback(() => {
    realtimeRef.current?.disconnect();
    realtimeRef.current = null;
    if (aiVideoRef.current) {
      aiVideoRef.current.pause();
      aiVideoRef.current.srcObject = null;
    }
    setAiActive(false);
    setAiLoading(false);
    setAiError("");
  }, []);

  useEffect(() => {
    if (previousSelectedIdRef.current === selected.id) return;
    previousSelectedIdRef.current = selected.id;
    // A different product requires a fresh AI try-on session.
    stopAiTryOn();
  }, [selected.id, stopAiTryOn]);

  useEffect(() => {
    return () => {
      realtimeRef.current?.disconnect();
      realtimeRef.current = null;
      const stream = aiVideoRef.current?.srcObject;
      if (stream instanceof MediaStream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleVariantSelect = async (variantId: number) => {
    setSelectedVariantId(variantId);
    const variant = productDetails?.variants.find(
      (item) => item.id === variantId,
    );
    if (!variant?.imageUrl || !realtimeRef.current) return;

    try {
      setAiError("");
      const response = await fetch(variant.imageUrl);
      if (!response.ok) throw new Error("تعذر تحميل صورة اللون المحدد.");
      const blob = await response.blob();
      await realtimeRef.current.setImage(blob, {
        prompt: `Try on this ${selected.name} in ${variant.colorName}. Preserve the person's identity and pose, and make the garment look natural.`,
        enhance: false,
      });
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : "تعذر تغيير لون الملابس.",
      );
    }
  };

  const startAiTryOn = async () => {
    if (status !== "live" || !videoRef.current?.srcObject) {
      setAiError("شغّل الكاميرا أولًا.");
      return;
    }

    if (!selectedVariant?.imageUrl) {
      setAiError("اختار لون للمنتج أولًا.");
      return;
    }

    stopAiTryOn();
    setAiLoading(true);
    setAiError("");

    try {
      // 1. حمّل صورة الملابس أولًا قبل الاتصال بـ Decart
      const response = await fetch(selectedVariant.imageUrl);

      if (!response.ok) {
        throw new Error(
          `فشل تحميل صورة الملابس (${response.status}). تحقق من رابط الصورة.`,
        );
      }

      const garmentBlob = await response.blob();

      if (!garmentBlob.size) {
        throw new Error("صورة الملابس فارغة.");
      }

      // 2. تأكد إن الكاميرا ما زالت تعمل
      const currentStream = videoRef.current?.srcObject;

      if (
        status !== "live" ||
        !currentStream ||
        !(currentStream instanceof MediaStream)
      ) {
        throw new Error("الكاميرا توقفت. شغّلها وحاول مرة أخرى.");
      }

      // 3. أنشئ اتصال Decart بعد نجاح تحميل الصورة
      const client = createDecartClient({
        apiKeyProvider: async () => {
          const token = await fashionApi.getTryOnToken();
          return token.apiKey;
        },
      });

      const realtime = await client.realtime.connect(currentStream, {
        model: models.realtime("lucy-vton-latest"),
        mirror: "auto",
        onRemoteStream: (remoteStream) => {
          if (aiVideoRef.current) {
            aiVideoRef.current.srcObject = remoteStream;

            void aiVideoRef.current.play().catch(() => {
              setAiError("تعذر تشغيل فيديو التجربة.");
            });
          }
        },
      });

      realtimeRef.current = realtime;

      // 4. أرسل صورة الملابس إلى Decart
      await realtime.setImage(garmentBlob, {
        prompt: `Try on this ${selected.name}. Preserve the person's identity and pose, and make the garment look natural.`,
        enhance: false,
      });

      setAiActive(true);
    } catch (error) {
      // افصل الجلسة إذا كانت قد بدأت بالفعل
      realtimeRef.current?.disconnect();
      realtimeRef.current = null;

      if (aiVideoRef.current) {
        aiVideoRef.current.srcObject = null;
      }

      setAiActive(false);

      setAiError(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء تشغيل تجربة الملابس.",
      );

      console.error("AI Try-On error:", error);
    } finally {
      setAiLoading(false);
    }
  };

  const downloadSnapshot = (snapshot: Snapshot) => {
    const link = document.createElement("a");
    link.href = snapshot.url;
    link.download = snapshot.name;
    link.click();
  };

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!dragging || !dragStart.current || !stageRef.current) return;
    const bounds = stageRef.current.getBoundingClientRect();
    setOffset({
      x:
        dragStart.current.originX +
        ((event.clientX - dragStart.current.x) / bounds.width) * 400,
      y:
        dragStart.current.originY +
        ((event.clientY - dragStart.current.y) / bounds.height) * 500,
    });
  };
  const handlePointerUp = () => {
    setDragging(false);
    dragStart.current = null;
  };

  return (
    <section className="page on studio-page">
      <div className="wrap">
        <div className="top-row">
          <a
            className="logo"
            href="#/"
            onClick={(event) => {
              event.preventDefault();
              stopAiTryOn();
              stopCamera();
              onHome();
            }}
          >
            <i>T</i>Try On Studio
          </a>
          <div className="right">
            <span
              className={`pill ${status === "live" ? "live" : status === "starting" ? "load" : status === "error" ? "err" : ""}`}
            >
              <span className="dot" />
              {status === "live"
                ? "Camera live"
                : status === "starting"
                  ? "Starting camera"
                  : status === "error"
                    ? "Camera error"
                    : "Camera off"}
            </span>
            <button
              className="btn sm"
              onClick={() => {
                stopAiTryOn();
                stopCamera();
                onHome();
              }}
            >
              ← Back to Home
            </button>
          </div>
        </div>
        <div className="st-head">
          <div className="eyebrow">Virtual fitting room</div>
          <h1>AI Virtual Try-On</h1>
          <p>
            See how pieces look on you in real time. Your camera stays on your
            device.
          </p>
        </div>

        <div className="studio">
          <div>
            <div className="stage" ref={stageRef}>
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                aria-label="Live camera preview"
                style={{ display: aiActive ? "none" : "block" }}
              />
              <video
                ref={aiVideoRef}
                playsInline
                muted
                autoPlay
                aria-label="AI virtual try-on preview"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: aiActive ? "block" : "none",
                  zIndex: 2,
                }}
              />
              {status === "live" && !aiActive && kind !== "none" && (
                <svg
                  className="ov garment-overlay"
                  viewBox="0 0 400 500"
                  aria-label="Garment preview overlay"
                  onPointerDown={poseTransform ? undefined : handlePointerDown}
                  onPointerMove={poseTransform ? undefined : handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  style={{
                    touchAction: "none",
                    cursor: poseTransform
                      ? "default"
                      : dragging
                        ? "grabbing"
                        : "grab",
                    pointerEvents: poseTransform ? "none" : "auto",
                  }}
                >
                  <g
                    transform={
                      poseTransform
                        ? `translate(${poseTransform.x} ${poseTransform.y}) rotate(${poseTransform.angle}) scale(${poseTransform.scaleX} ${poseTransform.scaleY}) translate(-50 -${selected.shape === "jacket" ? 4 : selected.shape === "pants" || selected.shape === "acc" ? 0 : 6})`
                        : `translate(${200 + offset.x} ${kind === "bottom" ? 235 + offset.y : kind === "dress" ? 165 + offset.y : 150 + offset.y}) scale(${((kind === "bottom" ? 2.2 : 2.4) * size) / 100}) translate(-50 0)`
                    }
                  >
                    <GarmentPaths garment={selected} />
                  </g>
                </svg>
              )}
              {status !== "live" && (
                <div className="overlay">
                  {status === "starting" ? (
                    <>
                      <div className="spin" aria-hidden="true" />
                      <p>Starting your camera…</p>
                    </>
                  ) : status === "error" ? (
                    <>
                      <h2>Camera unavailable</h2>
                      <p>{error}</p>
                      <button className="btn" onClick={startCamera}>
                        Try again
                      </button>
                    </>
                  ) : (
                    <>
                      <h2>Try it on live</h2>
                      <p>
                        Choose a garment, then enable your camera. Your browser
                        will ask for permission first.
                      </p>
                      <button className="btn primary" onClick={startCamera}>
                        Enable Camera
                      </button>
                      <p className="fine">
                        Camera access needs HTTPS or localhost.
                      </p>
                    </>
                  )}
                </div>
              )}
              {status === "live" && (
                <>
                  <span className="live-tag">Live Camera</span>
                  {hudVisible && (
                    <div className="hud">
                      <button
                        aria-label="Capture snapshot"
                        onClick={captureSnapshot}
                      >
                        ◎
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
            <p className="fine" style={{ marginTop: 12 }}>
              {kind === "none"
                ? "Accessory try-on is coming soon. Choose a top, bottom or dress to preview it."
                : status === "live"
                  ? "Use “Try On with AI” for the live AI result, or drag the illustrative overlay to reposition it."
                  : "Camera is optional until you are ready to try a garment."}
            </p>
          </div>

          <aside className="panel" aria-label="Try-on controls">
            <div>
              <div className="eyebrow">Now wearing</div>
              <h3
                style={{ margin: "6px 0 2px", fontWeight: 500, fontSize: 22 }}
              >
                {selected.name}
              </h3>
              <div className="pprice">{formatPrice(selected.price)}</div>
            </div>

            <div className="variant-selector">
              <div className="eyebrow">Choose color</div>

              {detailsLoading && <p className="fine">Loading colors...</p>}

              {detailsError && (
                <p className="fine" role="alert">
                  {detailsError}
                </p>
              )}

              {!detailsLoading &&
                !detailsError &&
                productDetails?.variants.length === 0 && (
                  <p className="fine">No colors available for this product.</p>
                )}

              {productDetails && productDetails.variants.length > 0 && (
                <>
                  <p className="fine">
                    Selected color: {selectedVariant?.colorName ?? "None"}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 10,
                      margin: "10px 0",
                    }}
                  >
                    {productDetails.variants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        title={variant.colorName}
                        aria-label={`Select color ${variant.colorName}`}
                        aria-pressed={selectedVariantId === variant.id}
                        onClick={() => void handleVariantSelect(variant.id)}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          backgroundColor: variant.colorHex,
                          border:
                            selectedVariantId === variant.id
                              ? "3px solid #3060e4"
                              : "1px solid #ccc",
                          outline:
                            selectedVariantId === variant.id
                              ? "2px solid white"
                              : "none",
                          cursor: "pointer",
                        }}
                      />
                    ))}
                  </div>
                  {selectedVariant && (
                    <img
                      src={selectedVariant.imageUrl}
                      alt={`${productDetails.name} - ${selectedVariant.colorName}`}
                      style={{
                        display: "block",
                        width: "100%",
                        maxHeight: 180,
                        objectFit: "contain",
                        marginTop: 12,
                      }}
                    />
                  )}
                </>
              )}
            </div>

            <div className="ctrl">
              <button
                className="btn primary"
                onClick={() => {
                  stopAiTryOn();
                  void startCamera();
                }}
              >
                {status === "live" ? "Restart Try-On" : "Start Try-On"}
              </button>
              <button
                className="btn primary"
                onClick={() => void startAiTryOn()}
                disabled={
                  status !== "live" ||
                  aiLoading ||
                  detailsLoading ||
                  !selectedVariant?.imageUrl
                }
              >
                {aiLoading
                  ? "Starting AI try-on…"
                  : aiActive
                    ? "Restart AI Try-On"
                    : "Try On with AI"}
              </button>
              {aiActive && (
                <button className="btn" onClick={stopAiTryOn}>
                  Stop AI Try-On
                </button>
              )}
              {aiError && (
                <p className="fine" role="alert">
                  {aiError}
                </p>
              )}
              <button
                className="btn"
                onClick={() => {
                  onCategoryChange("all");
                  setOffset({ x: 0, y: 0 });
                }}
              >
                Change Clothing
              </button>
              <button
                className="btn"
                onClick={() => {
                  setSize(100);
                  setOffset({ x: 0, y: 0 });
                }}
              >
                Reset Preview
              </button>
              <button
                className="btn"
                onClick={captureSnapshot}
                disabled={status !== "live"}
              >
                Capture Snapshot
              </button>
              <button
                className="btn"
                onClick={() => setHudVisible((visible) => !visible)}
              >
                {hudVisible ? "Hide Controls" : "Show Controls"}
              </button>
              <button
                className="btn"
                onClick={() => {
                  stopAiTryOn();
                  stopCamera();
                }}
                disabled={status === "off"}
              >
                Stop Camera
              </button>
            </div>
            <label className="eyebrow" htmlFor="sizeR">
              Garment size
            </label>
            <input
              className="range"
              id="sizeR"
              type="range"
              min="70"
              max="140"
              value={size}
              onChange={(event) => setSize(Number(event.target.value))}
            />
            <p className="fine">
              {status === "live"
                ? poseStatus === "tracking"
                  ? "Automatic body tracking is active."
                  : "Drag the garment to line it up manually."
                : "Enable the camera to see the garment preview."}
            </p>
            <div className="snaps" aria-label="Snapshots">
              {snapshots.map((snapshot) => (
                <button
                  key={snapshot.id}
                  type="button"
                  className="snapshot"
                  title="Download snapshot"
                  onClick={() => downloadSnapshot(snapshot)}
                >
                  <img src={snapshot.url} alt="Captured try-on preview" />
                </button>
              ))}
            </div>
          </aside>
        </div>
        <ClothingCatalog
          category={category}
          garments={garments}
          selectedId={selected.id}
          onCategoryChange={onCategoryChange}
          onSelect={onSelect}
        />
      </div>
    </section>
  );
}
