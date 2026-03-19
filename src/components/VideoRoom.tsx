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

interface VideoRoomProps {
  roomId: string;
  onLeave: () => void;
}

export const VideoRoom: React.FC<VideoRoomProps> = ({ roomId, onLeave }) => {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
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
          const pc = createPeerConnection(userId, stream);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('offer', { target: userId, caller: socket.id, sdp: pc.localDescription });
        });

        socket.on('offer', async (payload: { caller: string; sdp: RTCSessionDescriptionInit }) => {
          console.log('Received offer from', payload.caller);
          const pc = createPeerConnection(payload.caller, stream);
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          
          // Add any queued candidates now that remote description is set
          pendingCandidates.current.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error));
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
            
            // Add any queued candidates
            pendingCandidates.current.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error));
            pendingCandidates.current = [];
          }
        });

        socket.on('ice-candidate', (payload: { candidate: RTCIceCandidateInit }) => {
          const pc = peerConnectionRef.current;
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(e => console.error('Failed adding ICE:', e));
          } else {
            console.log('Queuing ICE candidate (remote description not ready)');
            pendingCandidates.current.push(payload.candidate);
          }
        });

        socket.on('user-disconnected', (userId: string) => {
          console.log('User disconnected:', userId);
          setRemoteStream(null);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
          if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
          }
          pendingCandidates.current = [];
        });

      } catch (err) {
        console.error('Error accessing media devices.', err);
      }
    };

    initStream();

    return () => {
      unmounted = true;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomId]);

  const [remoteTrackCount, setRemoteTrackCount] = useState(0);
  const remoteStreamInstance = useRef<MediaStream>(new MediaStream());

  useEffect(() => {
    if (remoteVideoRef.current && remoteTrackCount > 0) {
      console.log('Attaching latest tracks to video element...');
      remoteVideoRef.current.srcObject = remoteStreamInstance.current;
      remoteVideoRef.current.play().catch(err => console.log('Autoplay blocked:', err));
    }
  }, [remoteTrackCount]);

  const createPeerConnection = (targetId: string, stream: MediaStream) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    
    pendingCandidates.current = [];
    
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    pc.oniceconnectionstatechange = () => {
      console.log('ICE Connection State changed to:', pc.iceConnectionState);
    };
    pc.onconnectionstatechange = () => {
      console.log('WebRTC Connection State changed to:', pc.connectionState);
    };

    stream.getTracks().forEach(track => {
      console.log('Adding local track:', track.kind);
      pc.addTrack(track, stream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Gathered ICE Candidate, sending to target...');
        socketRef.current?.emit('ice-candidate', {
          target: targetId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote track from peer:', event.track.kind);
      remoteStreamInstance.current.addTrack(event.track);
      setRemoteTrackCount(prev => prev + 1);
      setRemoteStream(remoteStreamInstance.current);
    };

    return pc;
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
        <div className="video-wrapper local">
          <video ref={localVideoRef} autoPlay playsInline muted className={isVideoMuted ? 'muted' : ''} />
          <div className="video-label">You {isAudioMuted ? '(Muted)' : ''}</div>
        </div>
        
        <div className="video-wrapper remote">
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            style={{ display: remoteStream ? 'block' : 'none' }}
          />
          {!remoteStream && (
            <div className="waiting-placeholder">
              <div className="spinner"></div>
              <p>Waiting for someone to join...</p>
            </div>
          )}
        </div>
      </div>

      <div className="controls-bar">
        <button onClick={toggleAudio} className={`control-btn ${isAudioMuted ? 'danger' : ''}`}>
          {isAudioMuted ? 'Unmute' : 'Mute'}
        </button>
        <button onClick={toggleVideo} className={`control-btn ${isVideoMuted ? 'danger' : ''}`}>
          {isVideoMuted ? 'Start Video' : 'Stop Video'}
        </button>
        <button onClick={onLeave} className="control-btn leave">Leave Call</button>
      </div>
    </div>
  );
};
