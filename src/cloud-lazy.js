// The app's door to the cloud code (1.5.0). Firebase (src/cloud.js) is a separate bundle stored as plain text in
// index.html (<script type="text/plain" id="hw-cloud">) and only run the first time cloud() is called, i.e. for
// someone who signed in. @capacitor/core is shared with it through window.__hwCap (one copy, one plugin registry).
import { Capacitor, registerPlugin, WebPlugin } from "@capacitor/core";
export * from "./cloud-shared.js";
let impl = null;
export function cloud() {
  if (typeof window !== "undefined" && window.__hwCloud) return window.__hwCloud;
  if (!impl) {
    window.__hwCap = { Capacitor, registerPlugin, WebPlugin };
    const el = document.getElementById("hw-cloud");
    if (!el || !el.textContent.trim()) throw Object.assign(new Error("cloud code missing"), { code: "unavailable" });
    (0, eval)(el.textContent);
    impl = window.HWCloud.impl;
  }
  return impl;
}
