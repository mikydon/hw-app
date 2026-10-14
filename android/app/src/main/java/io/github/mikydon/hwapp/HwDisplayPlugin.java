package io.github.mikydon.hwapp;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.view.Display;
import android.view.Window;
import android.view.WindowManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Screen refresh rate (app 1.6.0, Michael: "at least 100 fps"). Android picks the refresh rate for each window;
 * an app can only ask for a display mode. "max" asks for the mode with the highest refresh rate at the current
 * resolution (e.g. 120 Hz), "60" for the one closest to 60 Hz (saves battery). The choice is kept in the app's
 * preferences so MainActivity applies it before the first frame on the next start.
 */
@CapacitorPlugin(name = "HwDisplay")
public class HwDisplayPlugin extends Plugin {
    static final String PREFS = "hw_display", KEY = "mode";

    static Display display(Activity a) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) return a.getDisplay();
        return a.getWindowManager().getDefaultDisplay();
    }

    /** The display mode for "max" or "60" with the same resolution as now; null if there is nothing to choose. */
    static Display.Mode pick(Activity a, String mode) {
        Display d = display(a);
        if (d == null) return null;
        Display.Mode cur = d.getMode(), best = null;
        for (Display.Mode m : d.getSupportedModes()) {
            if (m.getPhysicalWidth() != cur.getPhysicalWidth() || m.getPhysicalHeight() != cur.getPhysicalHeight()) continue;
            if (best == null) { best = m; continue; }
            if ("60".equals(mode)) {
                if (Math.abs(m.getRefreshRate() - 60f) < Math.abs(best.getRefreshRate() - 60f)) best = m;
            } else if (m.getRefreshRate() > best.getRefreshRate()) best = m;
        }
        return best;
    }

    static void apply(Activity a, String mode) {
        Display.Mode m = pick(a, mode);
        if (m == null) return;
        Window w = a.getWindow();
        WindowManager.LayoutParams lp = w.getAttributes();
        if (lp.preferredDisplayModeId == m.getModeId()) return;
        lp.preferredDisplayModeId = m.getModeId();
        w.setAttributes(lp);
    }

    static String saved(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "max");
    }

    /** {max: highest Hz, now: current Hz, mode: "max" | "60"} */
    @PluginMethod
    public void info(PluginCall call) {
        Activity a = getActivity();
        JSObject r = new JSObject();
        Display d = a == null ? null : display(a);
        Display.Mode top = a == null ? null : pick(a, "max");
        r.put("max", top == null ? 60 : Math.round(top.getRefreshRate()));
        r.put("now", d == null ? 60 : Math.round(d.getRefreshRate()));
        r.put("mode", saved(getContext()));
        call.resolve(r);
    }

    @PluginMethod
    public void set(PluginCall call) {
        String mode = "60".equals(call.getString("mode")) ? "60" : "max";
        SharedPreferences.Editor e = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
        e.putString(KEY, mode).apply();
        Activity a = getActivity();
        if (a == null) { call.resolve(); return; }
        a.runOnUiThread(() -> {
            try { apply(a, mode); } catch (Exception ignored) {}
            call.resolve();
        });
    }
}
