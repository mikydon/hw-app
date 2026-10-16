package io.github.mikydon.hwapp;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Which build this is (app 1.6.1): "direct" (the APK from GitHub, updates itself) or "play" (from Google Play,
 * which is then the only updater). Set per product flavor in app/build.gradle (string resource hw_store).
 */
@CapacitorPlugin(name = "HwBuild")
public class HwBuildPlugin extends Plugin {
    @PluginMethod
    public void info(PluginCall call) {
        JSObject r = new JSObject();
        r.put("store", getContext().getString(R.string.hw_store));
        call.resolve(r);
    }
}
