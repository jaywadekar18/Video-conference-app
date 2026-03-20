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

// Subcomponent to reliably render dynamic streams
const RemoteVideo = ({ stream }: { stream: MediaStream }) => {
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
    <div 
      className={`video-wrapper remote ${isMaximized ? 'maximized' : ''}`}
      onClick={() => setIsMaximized(!isMaximized)}
      title="Click to maximize/minimize"
    >
      <video ref={videoRef} autoPlay playsInline />
      <div className="video-label">Remote Stream</div>
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
            // Un-share when stopped natively or from browser bar
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
        <div 
          className={`video-wrapper local ${maximizedId === 'local' ? 'maximized' : ''}`}
          onClick={() => setMaximizedId(prev => prev === 'local' ? null : 'local')}
          title="Click to maximize/minimize"
        >
          <video ref={localVideoRef} autoPlay playsInline muted className={isVideoMuted ? 'muted' : ''} />
          <div className="video-label">You {isAudioMuted ? '(Muted)' : ''}</div>
        </div>

        {isScreenSharing && (
          <div 
            className={`video-wrapper local screen ${maximizedId === 'screen' ? 'maximized' : ''}`}
            onClick={() => setMaximizedId(prev => prev === 'screen' ? null : 'screen')}
            title="Click to maximize/minimize"
          >
            <video ref={localScreenVideoRef} autoPlay playsInline muted />
            <div className="video-label">Your Screen</div>
          </div>
        )}
        
        {remoteStreams.map((stream, idx) => (
          <RemoteVideo key={stream.id || idx} stream={stream} />
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
