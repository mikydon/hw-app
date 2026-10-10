package io.github.mikydon.hwapp;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

/**
 * Installs a new version of HW App from an APK that the app downloaded into its own cache (app 1.2.0).
 * The download itself is done in JavaScript (Filesystem.downloadFile, with progress); this plugin only
 * checks / opens the "install unknown apps" permission and hands the file to Android's package installer,
 * which asks the user to confirm. Nothing is installed without that confirmation.
 */
@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {

    @PluginMethod
    public void canInstall(PluginCall call) {
        boolean allowed = Build.VERSION.SDK_INT < Build.VERSION_CODES.O
            || getContext().getPackageManager().canRequestPackageInstalls();
        JSObject ret = new JSObject();
        ret.put("allowed", allowed);
        call.resolve(ret);
    }

    /** Opens Settings on the "Allow from this source" switch for HW App (Android 8+). */
    @PluginMethod
    public void openSettings(PluginCall call) {
        try {
            Intent intent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            } else {
                intent = new Intent(Settings.ACTION_SECURITY_SETTINGS);
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("settings: " + e.getMessage());
        }
    }

    /** path: the file:// URI (or absolute path) of an APK inside the app's cache directory. */
    @PluginMethod
    public void install(PluginCall call) {
        String path = call.getString("path");
        if (path == null || path.isEmpty()) {
            call.reject("no path");
            return;
        }
        if (path.startsWith("file:")) {
            path = Uri.parse(path).getPath();
        }
        try {
            Context ctx = getContext();
            File file = new File(path);
            String cache = ctx.getCacheDir().getCanonicalPath() + File.separator;
            if (!file.getCanonicalPath().startsWith(cache)) {
                call.reject("only files in the app cache");
                return;
            }
            if (!file.isFile()) {
                call.reject("file missing");
                return;
            }
            // Same authority as the FileProvider in AndroidManifest.xml (${applicationId}.fileprovider).
            Uri uri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", file);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("install: " + e.getMessage());
        }
    }
}
