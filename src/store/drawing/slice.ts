import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type Tool = "pen" | "highlighter" | "eraser";

interface DrawingState {
  tool: Tool;
  color: string;
  strokeWidth: number;
  enabled: boolean;
  clearVersion: number
}

const initialState: DrawingState = {
  tool: "pen",
  color: "#000000",
  strokeWidth: 3,
  enabled: true,
  clearVersion: 0
};

const drawingSlice = createSlice({
  name: "drawing",
  initialState,
  reducers: {
    setTool(state, action: PayloadAction<Tool>) {
      state.tool = action.payload;
    },
    setColor(state, action: PayloadAction<string>) {
      state.color = action.payload;
    },
    setStrokeWidth(state, action: PayloadAction<number>) {
      state.strokeWidth = action.payload;
    },
    toggleDrawing(state) {
      state.enabled = !state.enabled;
    },
    clearCanvas(state) {
      state.clearVersion += 1;
    }
  }
});

export const {
  setTool,
  setColor,
  setStrokeWidth,
  toggleDrawing,
  clearCanvas
} = drawingSlice.actions;

export default drawingSlice.reducer;
