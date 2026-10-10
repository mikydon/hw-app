package io.github.mikydon.hwapp;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // The app's own plugin (in-app APK update, 1.2.0); must be registered before super.onCreate.
        registerPlugin(ApkInstallerPlugin.class);
        registerPlugin(HwVibratePlugin.class); // 1.3.0: timer vibration that ignores the touch-feedback setting
        super.onCreate(savedInstanceState);
    }
}
