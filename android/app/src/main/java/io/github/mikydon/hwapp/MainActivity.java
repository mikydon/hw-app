package io.github.mikydon.hwapp;

import android.os.Bundle;
import android.webkit.WebView;
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
        // the saved choice (default: 60 Hz since 1.7.5) before the first frame
        try { HwDisplayPlugin.apply(this, HwDisplayPlugin.saved(this)); } catch (Exception ignored) {}
        fixedTextSize();
    }

    @Override
    public void onResume() {
        super.onResume();
        fixedTextSize();
    }

    // 1.7.5 (Michael, Oct 23: "everyone should have the same text size"): the WebView makes every font bigger with the
    // phone's font size setting (text zoom = font scale), but the boxes keep their width, so words got cut off on a
    // tester's phone. Text zoom 100 % = the same text size for everyone. Changing the font size restarts the activity
    // (fontScale isn't in configChanges), so onCreate sets it again; onResume covers anything that reset it.
    private void fixedTextSize() {
        try {
            WebView w = getBridge() == null ? null : getBridge().getWebView();
            if (w != null && w.getSettings().getTextZoom() != 100) w.getSettings().setTextZoom(100);
        } catch (Exception ignored) {}
    }
}
