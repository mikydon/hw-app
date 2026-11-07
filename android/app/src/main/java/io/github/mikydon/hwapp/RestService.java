package io.github.mikydon.hwapp;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationAttributes;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.core.content.ContextCompat;

/**
 * The rest timer while the screen is off (1.9.0, Michael, Nov 1): a paused WebView plays no beep and no vibration, so
 * during a rest the app runs this foreground service (type "health", Android 14: "long-running use cases of fitness
 * apps"). It shows an ongoing notification with the rest counting down on the lock screen, and at 0 it beeps and
 * vibrates (only when the app isn't on screen: then the app beeps itself) and counts on as "extra rest". After 10
 * minutes over it asks "Still training?". The app stops it when the rest ends. A partial wake lock (with a timeout)
 * keeps the CPU awake for the timer only during the rest.
 */
public class RestService extends Service {
    // Nov 7: "rest" was IMPORTANCE_LOW (a silent notification), and Android/Nothing OS hide silent notifications on the
    // lock screen by default (Michael's test: beep + vibration at 0 worked, no notification on the lock screen). A
    // channel's importance can't be raised once created, so the rest timer uses a new channel id: default importance
    // (shown on the lock screen) with its sound and vibration switched off (the service beeps itself at 0).
    static final String CH_REST = "rest2", CH_REST_OLD = "rest", CH_ALERT = "rest_alert";
    static final int ID = 7101, ID_STILL = 7102, ID_OVER = 7103;
    // Nov 7 (Michael: "first the normal countdown, then into minus"; "if I swipe it away at the start, it doesn't come
    // back at 0"): the service writes the time itself once a second (no system chronometer, which OEMs draw
    // differently): 0:25 … 0:01, 0:00, −0:01 …, with a bar while it counts down. A swiped-away notification isn't
    // re-posted every second (deleteIntent → dismissed); at 0 it comes back as a new notification (ID_OVER), because
    // Android keeps a dismissed foreground-service notification hidden under its own id.
    private int curId = ID;
    private volatile boolean dismissed = false;
    private final Runnable tick = new Runnable() { public void run() { onTick(); } };
    static volatile boolean appInFront = false;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private PowerManager.WakeLock lock;
    private long endAt, startAt;
    private String title = "", bodyOver = "", stillTitle = "", stillBody = "";
    private long stillAfter = 600000L;

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || "stop".equals(intent.getAction())) { stopAll(); return START_NOT_STICKY; }
        if ("dismissed".equals(intent.getAction())) { dismissed = true; return START_NOT_STICKY; }
        endAt = intent.getLongExtra("endAt", System.currentTimeMillis() + 60000L);
        startAt = intent.getLongExtra("startAt", System.currentTimeMillis());
        title = str(intent, "title");
        bodyOver = str(intent, "bodyOver");
        stillTitle = str(intent, "stillTitle");
        stillBody = str(intent, "stillBody");
        stillAfter = intent.getLongExtra("stillAfter", 600000L);
        channels(str(intent, "channelName"), str(intent, "alertName"));
        try {
            int type = Build.VERSION.SDK_INT >= 34 ? ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH : 0;
            dismissed = false;
            curId = ID;
            try { ((NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE)).cancel(ID_OVER); } catch (Exception ignored) {}
            ServiceCompat.startForeground(this, ID, build(), type);
        } catch (Exception e) {
            // e.g. Android 14+ without the "Physical activity" permission: no service, the app keeps its own timer
            stopSelf();
            return START_NOT_STICKY;
        }
        handler.removeCallbacksAndMessages(null);
        long now = System.currentTimeMillis();
        holdCpu(Math.max(0, endAt - now) + stillAfter + 60000L);
        if (endAt > now) handler.postDelayed(this::atZero, endAt - now);
        else show();
        handler.postDelayed(tick, nextTick(now));
        handler.postDelayed(this::stillTraining, Math.max(0, endAt + stillAfter - now));
        return START_NOT_STICKY;
    }

    private static String str(Intent i, String k) { String v = i.getStringExtra(k); return v == null ? "" : v; }

    private void channels(String restName, String alertName) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        try { nm.deleteNotificationChannel(CH_REST_OLD); } catch (Exception ignored) {}
        NotificationChannel rest = new NotificationChannel(CH_REST, restName.isEmpty() ? "Rest timer" : restName, NotificationManager.IMPORTANCE_DEFAULT);
        rest.setShowBadge(false);
        rest.setSound(null, null);
        rest.enableVibration(false);
        rest.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(rest);
        nm.createNotificationChannel(new NotificationChannel(CH_ALERT, alertName.isEmpty() ? "Workout reminders" : alertName, NotificationManager.IMPORTANCE_HIGH));
    }

    private PendingIntent openApp() {
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (open == null) open = new Intent(this, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(this, 1, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** The time as the app shows it: 0:25 while counting down, 0:00, then −0:12 (extra rest). */
    private String clock(long now) {
        long left = endAt - now;
        long secs = left > 0 ? (left + 999) / 1000 : (-left) / 1000;
        String t = (secs / 60) + ":" + String.format(java.util.Locale.ROOT, "%02d", secs % 60);
        return left <= 0 && secs > 0 ? "\u2212" + t : t;
    }

    /** Next whole second of the countdown (so 0:00 and the minus start exactly at the rest's end). */
    private long nextTick(long now) {
        long d = ((now - endAt) % 1000 + 1000) % 1000;
        long wait = 1000 - d;
        return wait < 40 ? wait + 1000 : wait;
    }

    private Notification build() {
        long now = System.currentTimeMillis();
        boolean over = now >= endAt;
        Intent del = new Intent(this, RestService.class).setAction("dismissed");
        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CH_REST)
            .setSmallIcon(R.drawable.ic_stat_hw)
            .setColor(ContextCompat.getColor(this, R.color.hw_notify))
            .setContentTitle(clock(now))
            .setContentText(over && !bodyOver.isEmpty() ? bodyOver + " · " + title : title)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(openApp())
            .setDeleteIntent(PendingIntent.getService(this, 2, del, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE))
            .setShowWhen(false);
        long total = Math.max(1000, endAt - startAt);
        if (!over) b.setProgress(1000, (int) Math.min(1000, Math.max(0, (now - startAt) * 1000 / total)), false);
        return b.build();
    }

    private void show() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null && !dismissed) nm.notify(curId, build());
    }

    private void onTick() {
        long now = System.currentTimeMillis();
        show();
        // tick as long as the CPU is kept awake for the rest (the rest, 10 min over, + 1 min)
        if (now < endAt + stillAfter + 60000L) handler.postDelayed(tick, nextTick(now));
    }

    private void atZero() {
        // swiped away earlier: 0 is news again, so it comes back as a new notification
        if (dismissed) { dismissed = false; curId = ID_OVER; }
        show();
        if (appInFront) return; // the app is on screen and beeps itself
        try {
            ToneGenerator tg = new ToneGenerator(AudioManager.STREAM_MUSIC, 90);
            tg.startTone(ToneGenerator.TONE_PROP_BEEP2, 450);
            handler.postDelayed(tg::release, 900);
        } catch (Exception ignored) {}
        vibrate(new long[] {0, 250, 120, 250});
    }

    private void stillTraining() {
        if (stillTitle.isEmpty()) return;
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            nm.notify(ID_STILL, new NotificationCompat.Builder(this, CH_ALERT)
                .setSmallIcon(R.drawable.ic_stat_hw)
                .setColor(ContextCompat.getColor(this, R.color.hw_notify))
                .setContentTitle(stillTitle)
                .setContentText(stillBody)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(stillBody))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(openApp())
                .build());
        } catch (Exception ignored) {}
    }

    private void vibrate(long[] pattern) {
        try {
            Vibrator v;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) v = ((VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE)).getDefaultVibrator();
            else v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (v == null || !v.hasVibrator()) return;
            VibrationEffect e = VibrationEffect.createWaveform(pattern, -1);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) v.vibrate(e, VibrationAttributes.createForUsage(VibrationAttributes.USAGE_ALARM));
            else v.vibrate(e, new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
        } catch (Exception ignored) {}
    }

    private void holdCpu(long ms) {
        try {
            if (lock == null) {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                lock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "hwapp:rest");
                lock.setReferenceCounted(false);
            }
            lock.acquire(Math.min(ms, 45 * 60000L)); // never longer than 45 minutes
        } catch (Exception ignored) {}
    }

    private void stopAll() {
        handler.removeCallbacksAndMessages(null);
        try { if (lock != null && lock.isHeld()) lock.release(); } catch (Exception ignored) {}
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) { nm.cancel(ID_STILL); nm.cancel(ID_OVER); }
        } catch (Exception ignored) {}
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        try { if (lock != null && lock.isHeld()) lock.release(); } catch (Exception ignored) {}
        super.onDestroy();
    }
}
