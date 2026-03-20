import { Socket } from 'socket.io-client';

export interface VideoRoomProps {
  roomId: string;
  onLeave: () => void;
}

export interface AnnotationCanvasProps {
  targetIdRef: React.MutableRefObject<string | null>;
  streamId: string;
  socketRef: React.MutableRefObject<Socket | null>;
}

export interface RemoteVideoProps {
  stream: MediaStream;
  targetIdRef: React.MutableRefObject<string | null>;
  socketRef: React.MutableRefObject<Socket | null>;
}

export interface DrawPayload {
  target: string;
  streamId: string;
  data: {
    color: string;
    type: 'start' | 'move' | 'end' | 'clear';
    x: number;
    y: number;
  };
}

export interface SignalingPayload {
  target: string;
  caller: string;
  sdp: RTCSessionDescriptionInit;
}

export interface IceCandidatePayload {
  target: string;
  candidate: RTCIceCandidateInit;
}
