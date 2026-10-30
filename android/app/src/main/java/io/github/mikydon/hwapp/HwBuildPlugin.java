package io.github.mikydon.hwapp;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

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
     * 1.8.1 (Michael, Oct 30: a navy box showed behind the keyboard while it slid up): the window and the WebView
     * kept the default navy (#0E1B36) from the start, which shows wherever the page doesn't reach yet (the keyboard
     * resizes the WebView while it animates). The app sends the current theme's background colour here.
     */
    @PluginMethod
    public void setBg(PluginCall call) {
        final String hex = call.getString("color", "");
        final int color;
        try { color = android.graphics.Color.parseColor(hex); } catch (Exception e) { call.reject("bad colour"); return; }
        getActivity().runOnUiThread(() -> {
            try {
                getActivity().getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(color));
                if (getBridge() != null && getBridge().getWebView() != null) getBridge().getWebView().setBackgroundColor(color);
                call.resolve();
            } catch (Exception e) { call.reject("failed: " + e.getMessage()); }
        });
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

    /**
     * 1.7.5 (Michael, Oct 23: "the test should really arrive as a notification"): while the app is open, Android hands
     * an FCM notification to the app instead of showing it. The app calls this when the test notification arrives, so
     * it shows up in the notification bar like the real ones (same channel, icon and colour). Tap = open the app.
     */
    @PluginMethod
    public void showNotif(PluginCall call) {
        try {
            Context c = getContext();
            if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(c, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                call.reject("not allowed");
                return;
            }
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null || !nm.areNotificationsEnabled()) { call.reject("not allowed"); return; }
            String ch = call.getString("channel", "social");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel existing = nm.getNotificationChannel(ch);
                if (existing == null) nm.createNotificationChannel(new NotificationChannel(ch, call.getString("channelName", ch), NotificationManager.IMPORTANCE_HIGH));
                else if (existing.getImportance() == NotificationManager.IMPORTANCE_NONE) { call.reject("channel off"); return; }
            }
            Intent open = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
            if (open == null) open = new Intent(c, MainActivity.class);
            open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent pi = PendingIntent.getActivity(c, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            String title = call.getString("title", ""), body = call.getString("body", "");
            NotificationCompat.Builder b = new NotificationCompat.Builder(c, ch)
                .setSmallIcon(R.drawable.ic_stat_hw)
                .setColor(ContextCompat.getColor(c, R.color.hw_notify))
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setAutoCancel(true)
                .setContentIntent(pi);
            nm.notify(call.getString("tag", "hw-test"), 1, b.build());
            call.resolve();
        } catch (Exception e) {
            call.reject("show failed: " + e.getMessage());
        }
    }
}
