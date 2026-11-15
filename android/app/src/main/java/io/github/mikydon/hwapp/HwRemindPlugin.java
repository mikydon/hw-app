package io.github.mikydon.hwapp;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * 1.10.0 (Michael, Nov 15): the evening streak reminder. The app works out the day the streak would end (the second
 * day after the last workout) and sends one reminder for that evening: its time and its text (in the app's language).
 * Nothing is checked later: after a workout the app sends a new day (or clears it). The reminder is an inexact alarm
 * (setAndAllowWhileIdle: Android may move it a few minutes; no exact-alarm permission), saved in SharedPreferences
 * "hw_remind" so RemindReceiver can set it again after a restart of the phone or an app update.
 */
@CapacitorPlugin(name = "HwRemind")
public class HwRemindPlugin extends Plugin {
    static final String PREFS = "hw_remind";
    static final String ACTION = "io.github.mikydon.hwapp.REMIND";

    /** Never read ms times with getDouble/getLong (a JS number may arrive as Integer, Long or Double). */
    private static long num(PluginCall call, String k) {
        Object o = call.getData().opt(k);
        return o instanceof Number ? ((Number) o).longValue() : 0L;
    }

    @PluginMethod
    public void set(PluginCall call) {
        long at = num(call, "at");
        if (at <= System.currentTimeMillis()) { clearAll(getContext()); call.resolve(); return; }
        SharedPreferences.Editor e = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
        e.putLong("at", at);
        e.putString("title", call.getString("title", ""));
        e.putString("body", call.getString("body", ""));
        e.putString("chName", call.getString("channelName", "Reminders"));
        e.apply();
        arm(getContext(), at);
        call.resolve();
    }

    @PluginMethod
    public void clear(PluginCall call) {
        clearAll(getContext());
        call.resolve();
    }

    static PendingIntent intent(Context c) {
        Intent i = new Intent(c, RemindReceiver.class).setAction(ACTION);
        return PendingIntent.getBroadcast(c, 7201, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void arm(Context c, long at) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, intent(c));
    }

    static void clearAll(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(intent(c));
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply();
    }
}
