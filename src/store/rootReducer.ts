import { combineReducers } from "@reduxjs/toolkit";
import screenShare from "./screenShare/slice";
import drawing from "./drawing/slice"
export const rootReducer = combineReducers({
  drawing,
  screenShare
});

export type RootState = ReturnType<typeof rootReducer>;
