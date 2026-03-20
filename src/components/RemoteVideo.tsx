import React, { useEffect, useRef, useState } from 'react';
import type { RemoteVideoProps } from '../types/webrtc';
import { AnnotationCanvas } from './AnnotationCanvas';

export const RemoteVideo: React.FC<RemoteVideoProps> = ({ stream, targetIdRef, socketRef }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      console.log('Attaching stream to RemoteVideo component:', stream.id);
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.error('Autoplay blocked:', e));
    }
  }, [stream]);

  return (
    <div className={`video-wrapper remote ${isMaximized ? 'maximized' : ''}`}>
      <div className="maximize-btn" onClick={(e) => { e.stopPropagation(); setIsMaximized(!isMaximized); }}>
        {isMaximized ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
        )}
      </div>
      <video ref={videoRef} autoPlay playsInline />
      <div className="video-label">Remote Stream</div>
      <AnnotationCanvas targetIdRef={targetIdRef} streamId={stream.id} socketRef={socketRef} />
    </div>
  );
};
