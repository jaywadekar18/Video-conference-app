import { configureStore } from "@reduxjs/toolkit";
import createSagaMiddleware from "redux-saga";
import { rootReducer } from "./rootReducer";
import rootSaga from "./rootSaga";

const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: rootReducer,
  middleware: getDefault =>
    getDefault({ thunk: false }).concat(sagaMiddleware)
});

sagaMiddleware.run(rootSaga);

// exposed ONLY for browser callbacks
(window as any).store = store;

export type AppDispatch = typeof store.dispatch;
