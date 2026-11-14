package io.github.mikydon.hwapp;

import android.app.Activity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.review.ReviewInfo;
import com.google.android.play.core.review.ReviewManager;
import com.google.android.play.core.review.ReviewManagerFactory;

/**
 * Google Play's in-app review card (app 1.10.0). Play decides whether the card really shows (it has its own quota)
 * and never tells the app whether the user rated, so {done: true} only means the flow finished. The JS side asks
 * only in the Play build, only after real use, and never with a question or a button before it (Play's rules).
 */
@CapacitorPlugin(name = "HwReview")
public class HwReviewPlugin extends Plugin {
    @PluginMethod
    public void ask(PluginCall call) {
        Activity act = getActivity();
        if (act == null) { JSObject r = new JSObject(); r.put("done", false); call.resolve(r); return; }
        ReviewManager manager = ReviewManagerFactory.create(getContext());
        manager.requestReviewFlow().addOnCompleteListener(task -> {
            if (!task.isSuccessful()) {
                JSObject r = new JSObject(); r.put("done", false);
                Exception e = task.getException(); if (e != null) r.put("err", String.valueOf(e.getMessage()));
                call.resolve(r); return;
            }
            ReviewInfo info = task.getResult();
            act.runOnUiThread(() -> manager.launchReviewFlow(act, info).addOnCompleteListener(f -> {
                JSObject r = new JSObject(); r.put("done", true); call.resolve(r);
            }));
        });
    }
}
