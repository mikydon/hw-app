package io.github.mikydon.hwapp;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * The rest timer with the screen off (1.9.0): starts / updates / stops RestService, and asks for "Physical activity"
 * (ACTIVITY_RECOGNITION), which Android 14+ needs for a foreground service of type "health". Below Android 10 that
 * permission doesn't exist (nothing to ask).
 */
@CapacitorPlugin(name = "HwRest", permissions = { @Permission(strings = { Manifest.permission.ACTIVITY_RECOGNITION }, alias = "activity") })
public class HwRestPlugin extends Plugin {

    private boolean granted() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
            || ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED;
    }

    @PluginMethod
    public void state(PluginCall call) {
        JSObject r = new JSObject();
        r.put("activity", granted() ? "granted" : getPermissionState("activity") == PermissionState.DENIED ? "denied" : "prompt");
        call.resolve(r);
    }

    @PluginMethod
    public void ask(PluginCall call) {
        if (granted()) { JSObject r = new JSObject(); r.put("activity", "granted"); call.resolve(r); return; }
        requestPermissionForAlias("activity", call, "askDone");
    }

    @PermissionCallback
    private void askDone(PluginCall call) {
        JSObject r = new JSObject();
        r.put("activity", granted() ? "granted" : "denied");
        call.resolve(r);
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (!granted()) { call.reject("no permission"); return; }
        try {
            Intent i = new Intent(getContext(), RestService.class);
            i.setAction("start");
            i.putExtra("endAt", (long) call.getDouble("endAt", (double) System.currentTimeMillis()).doubleValue());
            i.putExtra("startAt", (long) call.getDouble("startAt", (double) System.currentTimeMillis()).doubleValue());
            i.putExtra("stillAfter", (long) call.getDouble("stillAfter", 600000d).doubleValue());
            for (String k : new String[] { "title", "bodyOver", "stillTitle", "stillBody", "channelName", "alertName" }) i.putExtra(k, call.getString(k, ""));
            ContextCompat.startForegroundService(getContext(), i);
            call.resolve();
        } catch (Exception e) {
            call.reject("start failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try {
            Intent i = new Intent(getContext(), RestService.class);
            i.setAction("stop");
            getContext().startService(i);
        } catch (Exception ignored) {}
        call.resolve();
    }
}
