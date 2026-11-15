package io.github.mikydon.hwapp;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

/**
 * 1.10.0: shows the streak reminder that HwRemindPlugin set (channel "remind"), and sets it again after the phone
 * restarts or the app is updated (alarms are lost then). A reminder that is more than 3 hours late is dropped: a
 * "your streak ends tonight" at breakfast would be wrong.
 */
public class RemindReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent in) {
        String a = in.getAction();
        SharedPreferences p = c.getSharedPreferences(HwRemindPlugin.PREFS, Context.MODE_PRIVATE);
        long at = p.getLong("at", 0), now = System.currentTimeMillis();
        if (at == 0) return;
        if (Intent.ACTION_BOOT_COMPLETED.equals(a) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(a)) {
            if (at > now) HwRemindPlugin.arm(c, at);
            else if (now - at > 3 * 3600_000L) HwRemindPlugin.clearAll(c);
            else show(c, p);
            return;
        }
        if (!HwRemindPlugin.ACTION.equals(a)) return;
        if (now - at > 3 * 3600_000L) { HwRemindPlugin.clearAll(c); return; }
        show(c, p);
    }

    private static void show(Context c, SharedPreferences p) {
        String title = p.getString("title", ""), body = p.getString("body", ""), chName = p.getString("chName", "Reminders");
        p.edit().clear().apply(); // once
        if (title.isEmpty()) return;
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(c, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null || !nm.areNotificationsEnabled()) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm.getNotificationChannel("remind") == null) {
            nm.createNotificationChannel(new NotificationChannel("remind", chName, NotificationManager.IMPORTANCE_DEFAULT));
        }
        Intent open = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        if (open == null) open = new Intent(c, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 7202, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, "remind")
            .setSmallIcon(R.drawable.ic_stat_hw)
            .setColor(ContextCompat.getColor(c, R.color.hw_notify))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setContentIntent(pi);
        nm.notify("hw-remind", 1, b.build());
    }
}
