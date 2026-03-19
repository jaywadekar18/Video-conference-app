import {
  call,
  put,
  takeLatest,
  take,
  fork,
  cancelled
} from "redux-saga/effects";
import { eventChannel, type EventChannel } from "redux-saga";
import type { SagaIterator } from "redux-saga";

import {
  startScreenShare,
  stopScreenShare,
  screenShareStarted,
  screenShareError
} from "./slice";

let activeStream: MediaStream | null = null;

/**
 * Wrap MediaStreamTrack.onended in a Saga channel
 */
function createTrackEndedChannel(
  track: MediaStreamTrack
): EventChannel<boolean> {
  return eventChannel<boolean>(emit => {
    const handleEnded = () => {
      emit(true);
    };

    track.addEventListener("ended", handleEnded);

    return () => {
      track.removeEventListener("ended", handleEnded);
    };
  });
}

function getDisplayMedia(): Promise<MediaStream> {
  return navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: false
  });
}

function* watchTrackEnded(
  track: MediaStreamTrack
): SagaIterator {
  const channel: EventChannel<boolean> = yield call(
    createTrackEndedChannel,
    track
  );

  try {

    yield take(channel);

    yield put(stopScreenShare());
  } finally {
    if (yield cancelled()) {
      channel.close();
    }
  }
}

function* startScreenShareSaga(): SagaIterator {
  try {
    const stream: MediaStream = yield call(getDisplayMedia);

    activeStream = stream;

    yield put(screenShareStarted(stream));

    const track = stream.getVideoTracks()[0];
    if (!track) return;

    yield fork(watchTrackEnded, track);
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Screen share permission denied";

    yield put(screenShareError(message));
  }
}


function* stopScreenShareSaga(): SagaIterator {
  if (activeStream) {
    activeStream.getTracks().forEach(track => track.stop());
    activeStream = null;
  }
}

export default function* screenShareSaga(): SagaIterator {
  yield takeLatest(startScreenShare.type, startScreenShareSaga);
  yield takeLatest(stopScreenShare.type, stopScreenShareSaga);
}
