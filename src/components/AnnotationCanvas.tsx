import React, { useEffect, useRef } from 'react';
import type { AnnotationCanvasProps, DrawPayload } from '../types/webrtc';

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({ targetIdRef, streamId, socketRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const colorRef = useRef('#' + Math.floor(Math.random() * 16777215).toString(16));

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

    const handleDraw = (payload: DrawPayload) => {
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
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    socket.on('draw', handleDraw);
    return () => {
      socket.off('draw', handleDraw);
    };
  }, [streamId, socketRef]);

  const emitDraw = (type: DrawPayload['data']['type'], x: number, y: number) => {
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
    if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
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
