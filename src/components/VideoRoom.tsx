import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    }
  ]
};

const AnnotationCanvas = ({ targetIdRef, streamId, socketRef }: { targetIdRef: React.MutableRefObject<string | null>, streamId: string, socketRef: React.MutableRefObject<Socket | null> }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const colorRef = useRef('#' + Math.floor(Math.random()*16777215).toString(16)); 

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    
    const handleDraw = (payload: any) => {
       if (payload.streamId !== streamId) return;
       const canvas = canvasRef.current;
       if (!canvas) return;
       const ctx = canvas.getContext('2d');
       if (!ctx) return;
       
       const x = payload.data.x * canvas.width;
       const y = payload.data.y * canvas.height;

       ctx.strokeStyle = payload.data.color;
       ctx.lineWidth = 3;
       ctx.lineCap = 'round';

       if (payload.data.type === 'start') {
          ctx.beginPath();
          ctx.moveTo(x, y);
       } else if (payload.data.type === 'move') {
          ctx.lineTo(x, y);
          ctx.stroke();
       } else if (payload.data.type === 'clear') {
          ctx.clearRect(0,0, canvas.width, canvas.height);
       }
    };
    socket.on('draw', handleDraw);
    return () => { socket.off('draw', handleDraw); };
  }, [streamId, socketRef]);

  const emitDraw = (type: string, x: number, y: number) => {
    if (!targetIdRef.current || !socketRef.current) return;
    socketRef.current.emit('draw', {
      target: targetIdRef.current,
      streamId,
      data: { color: colorRef.current, type, x, y }
    });
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e && (e as React.TouchEvent).touches.length > 0) {
      clientX = (e as React.TouchEvent).touches[0].clientX;
      clientY = (e as React.TouchEvent).touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    isDrawing.current = true;
    const { x, y } = getPos(e);
    emitDraw('start', x, y);
    
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
       ctx.beginPath();
       ctx.moveTo(x * canvasRef.current.width, y * canvasRef.current.height);
    }
  };

  const moveDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!isDrawing.current) return;
    const { x, y } = getPos(e);
    emitDraw('move', x, y);
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
       ctx.lineTo(x * canvas.width, y * canvas.height);
       ctx.strokeStyle = colorRef.current;
       ctx.lineWidth = 3;
       ctx.lineCap = 'round';
       ctx.stroke();
    }
  };

  const endDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!isDrawing.current) return;
    isDrawing.current = false;
    emitDraw('end', 0, 0);
  };
  
  const clearDraw = (e: React.MouseEvent) => {
    e.stopPropagation();
    emitDraw('clear', 0, 0);
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d')?.clearRect(0,0, canvas.width, canvas.height);
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        className="annotation-canvas"
        onMouseDown={startDraw}
        onMouseMove={moveDraw}
        onMouseUp={endDraw}
        onMouseOut={endDraw}
        onTouchStart={startDraw}
        onTouchMove={moveDraw}
        onTouchEnd={endDraw}
      />
      <button className="clear-btn" onClick={clearDraw}>Clear</button>
    </>
  );
};


const RemoteVideo = ({ stream, targetIdRef, socketRef }: { stream: MediaStream, targetIdRef: React.MutableRefObject<string | null>, socketRef: React.MutableRefObject<Socket | null> }) => {
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

interface VideoRoomProps {
  roomId: string;
  onLeave: () => void;
}

export const VideoRoom: React.FC<VideoRoomProps> = ({ roomId, onLeave }) => {
  const [remoteStreams, setRemoteStreams] = useState<MediaStream[]>([]);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [maximizedId, setMaximizedId] = useState<string | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localScreenVideoRef = useRef<HTMLVideoElement>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const localScreenStreamRef = useRef<MediaStream | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const targetIdRef = useRef<string | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);

  useEffect(() => {
    let unmounted = false;

    const initStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (unmounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
        const socket = io(serverUrl);
        socketRef.current = socket;

        socket.on('connect', () => {
          socket.emit('join-room', roomId, socket.id);
        });

        socket.on('user-connected', async (userId: string) => {
          console.log('User connected:', userId);
          targetIdRef.current = userId;
          
          let pc = peerConnectionRef.current;
          if (!pc) pc = createPeerConnection(userId);
          
          stream.getTracks().forEach(track => pc.addTrack(track, stream));

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('offer', { target: userId, caller: socket.id, sdp: pc.localDescription });
        });

        socket.on('offer', async (payload: { caller: string; sdp: RTCSessionDescriptionInit }) => {
          console.log('Received offer from', payload.caller);
          targetIdRef.current = payload.caller;

          let pc = peerConnectionRef.current;
          if (!pc) {
             pc = createPeerConnection(payload.caller);
             stream.getTracks().forEach(track => pc!.addTrack(track, stream));
          }
          
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          
          pendingCandidates.current.forEach(c => pc!.addIceCandidate(new RTCIceCandidate(c)).catch(console.error));
          pendingCandidates.current = [];

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('answer', { target: payload.caller, caller: socket.id, sdp: pc.localDescription });
        });

        socket.on('answer', async (payload: { caller: string; sdp: RTCSessionDescriptionInit }) => {
          console.log('Received answer from', payload.caller);
          const pc = peerConnectionRef.current;
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            pendingCandidates.current.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error));
            pendingCandidates.current = [];
          }
        });

        socket.on('ice-candidate', (payload: { candidate: RTCIceCandidateInit }) => {
          const pc = peerConnectionRef.current;
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(e => console.error('Failed adding ICE:', e));
          } else {
            console.log('Queuing ICE candidate');
            pendingCandidates.current.push(payload.candidate);
          }
        });

        socket.on('user-disconnected', (userId: string) => {
          console.log('User disconnected:', userId);
          setRemoteStreams([]);
          if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
          }
          pendingCandidates.current = [];
          targetIdRef.current = null;
        });

      } catch (err) {
        console.error('Error accessing media devices.', err);
      }
    };

    initStream();

    return () => {
      unmounted = true;
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
      if (localScreenStreamRef.current) localScreenStreamRef.current.getTracks().forEach(track => track.stop());
      if (peerConnectionRef.current) peerConnectionRef.current.close();
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [roomId]);

  useEffect(() => {
    if (isScreenSharing && localScreenVideoRef.current && localScreenStreamRef.current) {
      localScreenVideoRef.current.srcObject = localScreenStreamRef.current;
    }
  }, [isScreenSharing]);

  const createPeerConnection = (targetId: string) => {
    console.log('Creating PeerConnection for:', targetId);
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    
    pendingCandidates.current = [];
    
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    pc.oniceconnectionstatechange = () => {
      console.log('ICE Connection State changed to:', pc.iceConnectionState);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('ice-candidate', {
          target: targetId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote track from peer:', event.track.kind);
      const incomingStream = event.streams[0];
      
      incomingStream.onremovetrack = () => {
         if (incomingStream.getTracks().length === 0) {
            setRemoteStreams(prev => prev.filter(s => s.id !== incomingStream.id));
         }
      };

      setRemoteStreams(prev => {
        if (prev.find(s => s.id === incomingStream.id)) return prev;
        return [...prev, incomingStream];
      });
    };

    return pc;
  };

  const renegotiate = async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !targetIdRef.current) return;
    try {
      console.log('Renegotiating connection for new track...');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current?.emit('offer', { target: targetIdRef.current, caller: socketRef.current?.id, sdp: pc.localDescription });
    } catch (e) {
      console.error('Renegotiation failed:', e);
    }
  };

  const toggleScreenShare = async () => {
    if (!peerConnectionRef.current) return;

    if (isScreenSharing && localScreenStreamRef.current) {
      // Stop screen share
      localScreenStreamRef.current.getTracks().forEach(t => {
        t.stop();
        const sender = peerConnectionRef.current?.getSenders().find(s => s.track === t);
        if (sender) peerConnectionRef.current?.removeTrack(sender);
      });
      localScreenStreamRef.current = null;
      setIsScreenSharing(false);
      renegotiate();
    } else {
      // Start screen share
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        localScreenStreamRef.current = displayStream;

        displayStream.getTracks().forEach(t => {
          peerConnectionRef.current?.addTrack(t, displayStream);
          t.onended = () => {
            const sender = peerConnectionRef.current?.getSenders().find(s => s.track === t);
            if (sender) peerConnectionRef.current?.removeTrack(sender);
            localScreenStreamRef.current = null;
            setIsScreenSharing(false);
            renegotiate();
          };
        });

        setIsScreenSharing(true);
        renegotiate();
      } catch (err) {
        console.error('Error sharing screen:', err);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  return (
    <div className="video-room">
      <header className="room-header">
        <h2>Room: {roomId}</h2>
      </header>
      
      <div className="videos-container">
        <div className={`video-wrapper local ${maximizedId === 'local' ? 'maximized' : ''}`}>
          <div className="maximize-btn" onClick={(e) => { e.stopPropagation(); setMaximizedId(prev => prev === 'local' ? null : 'local'); }}>
            {maximizedId === 'local' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
            )}
          </div>
          <video ref={localVideoRef} autoPlay playsInline muted className={isVideoMuted ? 'muted' : ''} />
          <div className="video-label">You {isAudioMuted ? '(Muted)' : ''}</div>
          {localStreamRef.current && (
            <AnnotationCanvas targetIdRef={targetIdRef} streamId={localStreamRef.current.id} socketRef={socketRef} />
          )}
        </div>

        {isScreenSharing && (
          <div className={`video-wrapper local screen ${maximizedId === 'screen' ? 'maximized' : ''}`}>
            <div className="maximize-btn" onClick={(e) => { e.stopPropagation(); setMaximizedId(prev => prev === 'screen' ? null : 'screen'); }}>
              {maximizedId === 'screen' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              )}
            </div>
            <video ref={localScreenVideoRef} autoPlay playsInline muted />
            <div className="video-label">Your Screen</div>
            {localScreenStreamRef.current && (
              <AnnotationCanvas targetIdRef={targetIdRef} streamId={localScreenStreamRef.current.id} socketRef={socketRef} />
            )}
          </div>
        )}
        
        {remoteStreams.map((stream, idx) => (
          <RemoteVideo key={stream.id || idx} stream={stream} targetIdRef={targetIdRef} socketRef={socketRef} />
        ))}

        {remoteStreams.length === 0 && (
          <div className="video-wrapper remote">
            <div className="waiting-placeholder">
              <div className="spinner"></div>
              <p>Waiting for someone to join...</p>
            </div>
          </div>
        )}
      </div>

      <div className="controls-bar">
        <button onClick={toggleAudio} className={`control-btn ${isAudioMuted ? 'danger' : ''}`}>
          {isAudioMuted ? 'Unmute' : 'Mute'}
        </button>
        <button onClick={toggleVideo} className={`control-btn ${isVideoMuted ? 'danger' : ''}`}>
          {isVideoMuted ? 'Start Video' : 'Stop Video'}
        </button>
        <button onClick={toggleScreenShare} className={`control-btn ${isScreenSharing ? 'active' : ''}`}>
          {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
        </button>
        <button onClick={onLeave} className="control-btn leave">Leave Call</button>
      </div>
    </div>
  );
};
