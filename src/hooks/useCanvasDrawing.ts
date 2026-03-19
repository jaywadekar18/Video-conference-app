import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store/rootReducer";

type Point = { x: number; y: number };
type Tool = "pen" | "highlighter" | "eraser";

type Stroke = {
  points: Point[];
  tool: Tool;
  color: string;
  width: number;
};
const getImoji = (name: string) => {
  const list = [
    {
      id: 1,
      name: 'pen',
      value: '🖋️'
    },
    {
      id: 2,
      name: 'eraser',
      value: '🧽'
    },
    {
      id: 3,
      name: 'highlighter',
      value: '✏️'
    },
  ]
  const foundValue = list.find(d => d.name === name)?.value ?? 'crosshair'
  return `url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\"><text y=\"20\" font-size=\"20\">${foundValue}</text></svg>') 0 20, auto`
}
export default function useCanvasDrawing(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>
) {
  const drawingState = useSelector((s: RootState) => s.drawing);
  const clearVersion = useSelector(
    (state: RootState) => state.drawing.clearVersion
  );

  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const configRef = useRef(drawingState);

  useEffect(() => {
    configRef.current = drawingState;
  }, [drawingState]);

  useEffect(() => {
    updateCursor();
  }, [drawingState.tool]);

  useEffect(() => {
    strokesRef.current = [];
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(
      0,
      0,
      canvas.width / (window.devicePixelRatio || 1),
      canvas.height / (window.devicePixelRatio || 1)
    );
  }, [clearVersion]);

  function updateCursor() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { tool } = configRef.current;


    canvas.style.cursor = getImoji(tool);

  }
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let drawing = false;

    function resize() {
      const rect = video?.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (canvas && rect) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }


      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      redrawAll();
    }

    function getStrokeWidth(tool: Tool, base: number) {
      if (tool === "pen") return base;
      if (tool === "highlighter") return base * 3;
      return base * 2;
    }

    function applyStyle(stroke: Stroke) {
      if (!ctx) {
        return
      }
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = stroke.width;

      if (stroke.tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle =
          stroke.tool === "highlighter"
            ? `${stroke.color}55`
            : stroke.color;
      }
    }

    function redrawAll() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      ctx?.clearRect(0, 0, canvas.width, canvas.height);

      for (const stroke of strokesRef.current) {
        applyStyle(stroke);

        ctx?.beginPath();

        stroke.points.forEach((p, i) => {
          const scaledX = p.x * canvas.clientWidth;
          const scaledY = p.y * canvas.clientHeight;

          if (i === 0) {
            ctx?.moveTo(scaledX, scaledY);
          } else {
            ctx?.lineTo(scaledX, scaledY);
          }
        });

        ctx?.stroke();
      }
    }


    function start(x: number, y: number) {
      const { tool, color, strokeWidth, enabled } = configRef.current;
      if (!enabled) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const normX = x / canvas.clientWidth;
      const normY = y / canvas.clientHeight;

      drawing = true;

      const stroke: Stroke = {
        points: [{ x: normX, y: normY }],
        tool,
        color,
        width: getStrokeWidth(tool, strokeWidth)
      };

      strokesRef.current.push(stroke);
      currentStrokeRef.current = stroke;
    }

    function move(x: number, y: number) {
      if (!drawing || !currentStrokeRef.current) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const normX = x / canvas.clientWidth;
      const normY = y / canvas.clientHeight;

      const stroke = currentStrokeRef.current;
      const pts = stroke.points;
      const prev = pts[pts.length - 1];

      pts.push({ x: normX, y: normY });

      applyStyle(stroke);

      ctx?.beginPath();
      ctx?.moveTo(
        prev.x * canvas.clientWidth,
        prev.y * canvas.clientHeight
      );
      ctx?.lineTo(
        normX * canvas.clientWidth,
        normY * canvas.clientHeight
      );
      ctx?.stroke();
    }

    function stop() {
      drawing = false;
      currentStrokeRef.current = null;
    }

    function mouseDown(e: MouseEvent) {
      start(e.offsetX, e.offsetY);
    }

    function mouseMove(e: MouseEvent) {
      move(e.offsetX, e.offsetY);
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(video);

    window.addEventListener("resize", resize);
    canvas.addEventListener("mousedown", mouseDown);
    canvas.addEventListener("mousemove", mouseMove);
    canvas.addEventListener("mouseup", stop);
    canvas.addEventListener("mouseleave", stop);


    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousedown", mouseDown);
      canvas.removeEventListener("mousemove", mouseMove);
      canvas.removeEventListener("mouseup", stop);
      canvas.removeEventListener("mouseleave", stop);
    };
  }, []);
}
