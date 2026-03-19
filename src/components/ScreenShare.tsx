import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store/rootReducer";
import CanvasOverlay from "./CanvasOverlay";

export default function ScreenShare() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const { isSharing, stream } = useSelector(
    (state: RootState) => state.screenShare
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isSharing && stream) {
      video.srcObject = stream;
      video.play().catch(() => { });
    } else {
      video.srcObject = null;
      video.pause();
    }
  }, [isSharing, stream]);

  return (
    <div className="container">
      <video ref={videoRef} autoPlay muted />
      {isSharing && <CanvasOverlay videoRef={videoRef} />}
    </div>
  );
}
