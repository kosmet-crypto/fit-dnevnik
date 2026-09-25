package app.fitdnevnik;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.widget.Toast;

import java.io.OutputStream;

/**
 * Result of installing a downloaded APK update. Android shows its own "Update" confirmation
 * when it needs one (STATUS_PENDING_USER_ACTION); on newer Android versions later updates can
 * go through without it once this app installed the previous version itself.
 */
public class InstallReceiver extends BroadcastReceiver {
    /** Whether the attempt asked Android to skip the confirmation screen. */
    private static final String EXTRA_QUIET = "quiet";

    /**
     * Downloads the latest APK and starts the install in the background. quiet asks Android to
     * skip the confirmation (Android 12+, app updating itself); if a phone refuses that, the
     * receiver below retries with Android's normal install screen.
     */
    static void install(Context ctx, boolean quiet) {
        final Context app = ctx.getApplicationContext();
        new Thread(() -> {
            try {
                byte[] apk = WebUpdater.download(WebUpdater.BASE + "fit-dnevnik.apk");
                PackageInstaller installer = app.getPackageManager().getPackageInstaller();
                PackageInstaller.SessionParams params =
                        new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
                params.setAppPackageName(app.getPackageName());
                if (quiet && Build.VERSION.SDK_INT >= 31) {
                    params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED);
                }
                int id = installer.createSession(params);
                try (PackageInstaller.Session session = installer.openSession(id)) {
                    try (OutputStream out = session.openWrite("update.apk", 0, apk.length)) {
                        out.write(apk);
                        session.fsync(out);
                    }
                    int flags = PendingIntent.FLAG_UPDATE_CURRENT
                            | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0);
                    Intent result = new Intent(app, InstallReceiver.class).putExtra(EXTRA_QUIET, quiet);
                    session.commit(PendingIntent.getBroadcast(app, id, result, flags).getIntentSender());
                }
            } catch (Exception e) {
                new Handler(Looper.getMainLooper()).post(() ->
                        Toast.makeText(app, R.string.update_failed, Toast.LENGTH_LONG).show());
            }
        }).start();
    }

    @Override
    public void onReceive(Context c, Intent i) {
        int status = i.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            @SuppressWarnings("deprecation")
            Intent confirm = i.getParcelableExtra(Intent.EXTRA_INTENT);
            if (confirm != null) {
                confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                c.startActivity(confirm);
            }
        } else if (status != PackageInstaller.STATUS_SUCCESS && status != PackageInstaller.STATUS_FAILURE_ABORTED) {
            if (i.getBooleanExtra(EXTRA_QUIET, false)) {
                // This phone refused the quiet install: try again with Android's install screen.
                Toast.makeText(c, R.string.update_retry, Toast.LENGTH_SHORT).show();
                install(c, false);
            } else {
                Toast.makeText(c, R.string.update_install_failed, Toast.LENGTH_LONG).show();
            }
        }
    }
}
