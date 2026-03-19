import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../store/rootReducer";
import {
  setTool,
  setColor,
  setStrokeWidth,
  toggleDrawing,
  clearCanvas
} from "../store/drawing/slice";
import {
  startScreenShare,
  stopScreenShare
} from "../store/screenShare/slice";

export default function Toolbar() {
  const dispatch = useDispatch();
  const { tool, enabled, color } = useSelector((s: RootState) => s.drawing);
  const isSharing = useSelector(
    (s: RootState) => s.screenShare.isSharing
  );

  return (
    <div className="toolbar">
      <button
        className="primary"
        onClick={() =>
          dispatch(isSharing ? stopScreenShare() : startScreenShare())
        }
      >
        {isSharing ? "Stop Share" : "Start Share"}
      </button>


      <button onClick={() => dispatch(toggleDrawing())}>
        {enabled ? "Disable Draw" : "Enable Draw"}
      </button>

      <select value={tool} onChange={e => dispatch(setTool(e.target.value as any))}>
        <option value="pen">Pen</option>
        <option value="highlighter">Highlighter</option>
        <option value="eraser">Eraser</option>
      </select>

      <input type="color" value={color} onChange={e => dispatch(setColor(e.target.value))} />

      <input
        type="range"
        min={1}
        max={20}
        onChange={e => dispatch(setStrokeWidth(+e.target.value))}
      />
      <button onClick={() => dispatch(clearCanvas())}>
        Clear
      </button>
    </div>
  );
}
