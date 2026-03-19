import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface ScreenShareState {
  isSharing: boolean;
  error: string | null;
  stream: MediaStream | null;
}

const initialState: ScreenShareState = {
  isSharing: false,
  error: null,
  stream: null
};

const screenShareSlice = createSlice({
  name: "screenShare",
  initialState,
  reducers: {
    startScreenShare: () => {},
    stopScreenShare(state) {
      state.isSharing = false;
      state.stream = null;
    },
    screenShareStarted(
      state,
      action: PayloadAction<MediaStream>
    ) {
      state.isSharing = true;
      state.error = null;
      state.stream = action.payload;
    },
    screenShareError(state, action: PayloadAction<string>) {
      state.isSharing = false;
      state.error = action.payload;
      state.stream = null;
    }
  }
});

export const {
  startScreenShare,
  stopScreenShare,
  screenShareStarted,
  screenShareError
} = screenShareSlice.actions;

export default screenShareSlice.reducer;
