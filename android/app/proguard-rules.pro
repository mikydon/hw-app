# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ─── HW App (1.6.5, R8 on) ───────────────────────────────────────────────
# Readable crash stacks in Play (the mapping file is in the bundle).
-keepattributes SourceFile,LineNumberTable,*Annotation*,Signature,InnerClasses,EnclosingMethod
-renamesourcefileattribute SourceFile

# Capacitor's own consumer rules keep every Plugin subclass (ours included: ApkInstaller, HwVibrate, HwDisplay, HwBuild)
# and their @PluginMethod methods. The live updater ships its rules only for its own build, not as consumer rules,
# so they are repeated here (it reaches into the bridge by name).
-keep class ee.forgr.capacitor_updater.** { *; }
-keep class com.getcapacitor.Bridge {
    com.getcapacitor.MessageHandler msgHandler;
}
-keep class com.getcapacitor.MessageHandler { *; }
-keep class com.getcapacitor.PluginCall {
    <init>(com.getcapacitor.MessageHandler, java.lang.String, java.lang.String, java.lang.String, com.getcapacitor.JSObject);
}
-keep class * implements com.getcapacitor.PluginHandle {
    public void invoke(java.lang.String, com.getcapacitor.PluginCall);
}
# The updater looks these up with Class.forName / getMethod.
-keep class androidx.webkit.WebViewFeature { public static *; }
-keep class androidx.webkit.WebViewCompat { public static *; }

# The JavaScript bridge (also in the default file; kept explicit on purpose).
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# @capacitor-firebase/authentication has handlers for every sign-in provider; we only include Google
# (rgcfaIncludeGoogle), so the Facebook SDK classes it mentions are absent on purpose.
-dontwarn com.facebook.**

# 1.7.5 (Michael, Oct 23: notifications stopped arriving; the last version that delivered them, 1.6.0, had no R8):
# R8 renamed and merged the whole FCM receive path (FirebaseMessagingService.onMessageReceived → c, RemoteMessage →
# g7.w, EnhancedIntentService merged away) and the Capacitor messaging plugin's service with it. Keep that path exactly
# as it is in the libraries, so a push travels the same code as in 1.6.0.
-keep class com.google.firebase.messaging.** { *; }
-keep class com.google.firebase.iid.** { *; }
-keep class com.google.android.gms.cloudmessaging.** { *; }
-keep class com.google.firebase.installations.** { *; }
-keep class io.capawesome.capacitorjs.plugins.firebase.messaging.** { *; }
