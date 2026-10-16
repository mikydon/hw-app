package io.github.mikydon.hwapp;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // The app's own plugin (in-app APK update, 1.2.0); must be registered before super.onCreate.
        registerPlugin(ApkInstallerPlugin.class);
        registerPlugin(HwVibratePlugin.class); // 1.3.0: timer vibration that ignores the touch-feedback setting
        registerPlugin(HwDisplayPlugin.class); // 1.6.0: refresh rate (highest the phone allows, or 60 Hz)
        registerPlugin(HwBuildPlugin.class); // 1.6.1: GitHub APK or Google Play build
        super.onCreate(savedInstanceState);
        // the saved choice (default: highest) before the first frame
        try { HwDisplayPlugin.apply(this, HwDisplayPlugin.saved(this)); } catch (Exception ignored) {}
    }
}
