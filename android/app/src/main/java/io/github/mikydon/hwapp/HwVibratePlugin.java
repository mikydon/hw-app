package io.github.mikydon.hwapp;

import android.content.Context;
import android.media.AudioAttributes;
import android.os.Build;
import android.os.VibrationAttributes;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.List;

/**
 * Vibration for the workout timers (app 1.3.0). Capacitor's Haptics plugin vibrates without attributes;
 * Android 13+ treats such a vibration like touch feedback, so with "touch feedback" off in the phone's
 * settings nothing is felt (Michael's Nothing Phone, Oct 10, 2026). The end of a rest or a hold is an alarm
 * the user asked for, so it vibrates with the ALARM usage.
 */
@CapacitorPlugin(name = "HwVibrate")
public class HwVibratePlugin extends Plugin {

    /** pattern: [on, off, on, …] in milliseconds, like navigator.vibrate. */
    @PluginMethod
    public void vibrate(PluginCall call) {
        try {
            JSArray arr = call.getArray("pattern");
            List<Object> list = arr == null ? null : arr.toList();
            if (list == null || list.isEmpty()) {
                call.reject("no pattern");
                return;
            }
            long[] timings = new long[list.size() + 1];
            timings[0] = 0; // no delay before the first vibration
            for (int i = 0; i < list.size(); i++) {
                timings[i + 1] = Math.max(0L, Math.min(5000L, ((Number) list.get(i)).longValue()));
            }
            Vibrator vibrator;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vm = (VibratorManager) getContext().getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                vibrator = vm.getDefaultVibrator();
            } else {
                vibrator = (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
            }
            if (vibrator == null || !vibrator.hasVibrator()) {
                call.reject("no vibrator");
                return;
            }
            VibrationEffect effect = VibrationEffect.createWaveform(timings, -1);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                vibrator.vibrate(effect, VibrationAttributes.createForUsage(VibrationAttributes.USAGE_ALARM));
            } else {
                AudioAttributes aa = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
                vibrator.vibrate(effect, aa);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("vibrate: " + e.getMessage());
        }
    }
}
