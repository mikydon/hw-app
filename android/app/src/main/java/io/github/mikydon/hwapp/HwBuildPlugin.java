package io.github.mikydon.hwapp;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
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

    /**
     * 1.7.5 (Michael, Oct 23): when Android won't ask for notifications any more (the person refused), the app sends
     * them straight to this app's notification settings (Android 8+), else to the app's info page.
     */
    @PluginMethod
    public void openNotifSettings(PluginCall call) {
        try {
            Intent i;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                i.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
            } else {
                i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getContext().getPackageName()));
            }
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("open failed: " + e.getMessage());
        }
    }
}
