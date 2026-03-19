import { Provider } from "react-redux";
import { createRoot } from "react-dom/client";
import { store } from "./store";
import Toolbar from "./components/Toolbar";
import ScreenShare from "./components/ScreenShare";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <h1 className="app-title">Video conference tool</h1>
    <ScreenShare />
    <Toolbar />
  </Provider>
);