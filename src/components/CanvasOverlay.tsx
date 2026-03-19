import { useRef } from "react";
import useCanvasDrawing from "../hooks/useCanvasDrawing";

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export default function CanvasOverlay({ videoRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useCanvasDrawing(canvasRef, videoRef);

  return <canvas ref={canvasRef} className="overlay" />;
}
