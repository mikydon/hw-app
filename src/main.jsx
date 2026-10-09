import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { isNative, appReady } from "./native.js";
createRoot(document.getElementById("root")).render(<App />);
// App: confirm this bundle started (else the updater rolls back). Website: offline support via sw.js.
appReady();
if (!isNative && "serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("./sw.js").catch(() => {}); });
}
