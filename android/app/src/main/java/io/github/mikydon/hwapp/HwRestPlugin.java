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

    /** 1.9.1: tells the app when it goes off screen / comes back, so it leaves the rest beeps to the service then
     *  (the same moments RestService.appInFront changes, in MainActivity). */
    @Override
    protected void handleOnPause() { super.handleOnPause(); JSObject r = new JSObject(); r.put("on", false); notifyListeners("front", r); }

    @Override
    protected void handleOnResume() { super.handleOnResume(); JSObject r = new JSObject(); r.put("on", true); notifyListeners("front", r); }

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

    /** Nov 7 (Michael: "after +time it goes from 0 into minus"): PluginCall.getDouble returns the default for a Long,
     *  and a time in ms from JS (Date.now(), ~1.8e12) arrives as a Long, so endAt/startAt were always "now". */
    static long num(PluginCall call, String k, long def) {
        Object v = call.getData().opt(k);
        return v instanceof Number ? ((Number) v).longValue() : def;
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (!granted()) { call.reject("no permission"); return; }
        try {
            Intent i = new Intent(getContext(), RestService.class);
            i.setAction("start");
            long now = System.currentTimeMillis();
            i.putExtra("endAt", num(call, "endAt", now));
            i.putExtra("startAt", num(call, "startAt", now));
            i.putExtra("stillAfter", num(call, "stillAfter", 600000L));
            for (String k : new String[] { "title", "bodyOver", "stillTitle", "stillBody", "channelName", "alertName" }) i.putExtra(k, call.getString(k, ""));
            i.putExtra("sound", call.getBoolean("sound", true));
            i.putExtra("buzz", call.getBoolean("buzz", true));
            i.putExtra("vol", (int) num(call, "vol", 90));
            ContextCompat.startForegroundService(getContext(), i);
            JSObject r = new JSObject();
            r.put("beeps", true); // 1.9.1: the service plays 3-2-1-0 itself while the app is off screen
            call.resolve(r);
        } catch (Exception e) {
            call.reject("start failed: " + e.getMessage());
        }
    }

    /** 1.9.1: Settings → "Rest timer with the screen off": Android asks only twice, after that the app's own system
     *  settings page is the only place to allow "Physical activity". */
    @PluginMethod
    public void openSettings(PluginCall call) {
        try {
            Intent i = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS, android.net.Uri.fromParts("package", getContext().getPackageName(), null));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("open failed: " + e.getMessage());
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
