import { all } from "redux-saga/effects";
import screenShareSaga from "./screenShare/saga";

export default function* rootSaga() {
  yield all([screenShareSaga()]);
}
