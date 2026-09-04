import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, ImageUp, Keyboard, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { decodeQrFromFile, decodeQrFromVideo } from "@/lib/inventory/qr";

type ScanMode = "camera" | "upload" | "manual";

type QrScannerProps = {
  onDetect: (raw: string) => void;
  paused?: boolean;
  className?: string;
};

export function QrScanner({ onDetect, paused = false, className }: QrScannerProps) {
  const [mode, setMode] = useState<ScanMode>("camera");
  const [cameraState, setCameraState] = useState<"idle" | "starting" | "live" | "denied" | "missing">("idle");
  const [manual, setManual] = useState("");
  const [decodingFile, setDecodingFile] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastDetectRef = useRef(0);
  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;

  useEffect(() => {
    if (mode !== "camera" || paused) {
      stopCamera();
      if (mode === "camera" && paused) setCameraState("idle");
      return;
    }

    let cancelled = false;

    async function start() {
      setCameraState("starting");
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState("missing");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setCameraState("live");
        loop();
      } catch {
        if (!cancelled) setCameraState("denied");
      }
    }

    function loop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || cancelled) return;
      rafRef.current = window.setTimeout(async () => {
        if (cancelled || paused) return;
        const now = Date.now();
        if (now - lastDetectRef.current > 220) {
          try {
            const raw = await decodeQrFromVideo(video, canvas);
            if (raw) {
              lastDetectRef.current = now + 1200;
              onDetectRef.current(raw);
            }
          } catch {
            // keep scanning
          }
        }
        loop();
      }, 80) as unknown as number;
    }

    void start();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [mode, paused]);

  function stopCamera() {
    window.clearTimeout(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) video.srcObject = null;
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setDecodingFile(true);
    try {
      const raw = await decodeQrFromFile(file);
      if (!raw) {
        toast.error("No QR code in that image.");
        return;
      }
      onDetect(raw);
    } catch {
      toast.error("Could not read that image.");
    } finally {
      setDecodingFile(false);
    }
  }

  function submitManual(event: FormEvent) {
    event.preventDefault();
    const value = manual.trim();
    if (!value) return;
    onDetect(value);
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="relative overflow-hidden rounded-2xl bg-secondary shadow-border">
        <div className="relative aspect-4/3 w-full sm:aspect-video">
          {mode === "camera" ? (
            <>
              <video
                ref={videoRef}
                className="absolute inset-0 size-full object-cover"
                playsInline
                muted
                autoPlay
              />
              <canvas ref={canvasRef} className="hidden" />
              <Viewfinder />
              {cameraState !== "live" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-secondary px-6 text-center">
                  {cameraState === "starting" ? (
                    <>
                      <LoaderCircle className="size-5 animate-spin text-steel" />
                      <p className="text-sm text-muted-foreground">Opening camera</p>
                    </>
                  ) : cameraState === "denied" ? (
                    <>
                      <Camera className="size-5 text-muted-foreground" />
                      <p className="font-serif text-lg text-foreground">Camera is blocked</p>
                      <p className="max-w-xs text-sm text-muted-foreground">
                        Allow camera access, or identify a product from a photo or typed SKU.
                      </p>
                    </>
                  ) : cameraState === "missing" ? (
                    <>
                      <Camera className="size-5 text-muted-foreground" />
                      <p className="font-serif text-lg text-foreground">No camera on this device</p>
                      <p className="max-w-xs text-sm text-muted-foreground">
                        Upload a photo of a code, or type the SKU.
                      </p>
                    </>
                  ) : (
                    <>
                      <Camera className="size-5 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Camera paused</p>
                    </>
                  )}
                </div>
              )}
            </>
          ) : mode === "upload" ? (
            <label className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-2 px-6 text-center">
              {decodingFile ? (
                <LoaderCircle className="size-5 animate-spin text-steel" />
              ) : (
                <ImageUp className="size-5 text-steel" />
              )}
              <p className="font-serif text-lg text-foreground">Upload a code</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Photograph a Shelfmark QR, or drop an image here.
              </p>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
            </label>
          ) : (
            <form onSubmit={submitManual} className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
              <Keyboard className="size-5 text-steel" />
              <p className="font-serif text-lg text-foreground">Enter a SKU</p>
              <Input
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="SM-SAW-014"
                autoComplete="off"
                className="max-w-xs font-mono uppercase"
                aria-label="Product SKU"
              />
              <Button type="submit" size="sm">
                Identify
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <ModeButton active={mode === "camera"} onClick={() => setMode("camera")} icon={Camera} label="Camera" />
        <ModeButton active={mode === "upload"} onClick={() => setMode("upload")} icon={ImageUp} label="Photo" />
        <ModeButton active={mode === "manual"} onClick={() => setMode("manual")} icon={Keyboard} label="SKU" />
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Camera;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-[background-color,box-shadow,color] duration-150",
        active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground shadow-border hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

function Viewfinder() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-[16%] sm:inset-[18%]">
        <span className="absolute top-0 left-0 size-7 rounded-tl-sm border-t-2 border-l-2 border-primary" />
        <span className="absolute top-0 right-0 size-7 rounded-tr-sm border-t-2 border-r-2 border-primary" />
        <span className="absolute bottom-0 left-0 size-7 rounded-bl-sm border-b-2 border-l-2 border-primary" />
        <span className="absolute bottom-0 right-0 size-7 rounded-br-sm border-b-2 border-r-2 border-primary" />
      </div>
    </div>
  );
}
