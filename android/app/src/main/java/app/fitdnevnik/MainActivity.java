package app.fitdnevnik;

import android.annotation.TargetApi;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.UriPermission;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.health.connect.AggregateRecordsRequest;
import android.health.connect.AggregateRecordsResponse;
import android.health.connect.HealthConnectException;
import android.health.connect.HealthConnectManager;
import android.health.connect.ReadRecordsRequestUsingFilters;
import android.health.connect.ReadRecordsResponse;
import android.health.connect.TimeInstantRangeFilter;
import android.health.connect.datatypes.DataOrigin;
import android.health.connect.datatypes.SleepSessionRecord;
import android.health.connect.datatypes.StepsRecord;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.OutcomeReceiver;
import android.provider.DocumentsContract;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.webkit.WebViewAssetLoader;

import com.google.mlkit.vision.codescanner.GmsBarcodeScanner;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Hosts the Fit dnevnik web app (bundled in assets/www) in a full-screen WebView.
 * Pages are served from https://appassets.androidplatform.net so localStorage
 * behaves like on a normal https site.
 */
public class MainActivity extends Activity {

    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/assets/www/index.html";
    private static final int REQ_PICK_FILE = 1;
    private static final int REQ_SAVE_FILE = 2;
    private static final int REQ_STEPS = 3;
    private static final int REQ_TREE = 4;
    private static final String READ_STEPS = "android.permission.health.READ_STEPS";
    private static final String READ_SLEEP = "android.permission.health.READ_SLEEP";

    private WebView webView;
    private ValueCallback<Uri[]> pendingPick;
    private String pendingSaveText;
    private int pendingStepsDays;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .setDomain(HOST)
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView = new WebView(this);
        webView.setBackgroundColor(0xFF111014);
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);

        webView.addJavascriptInterface(new Bridge(), "FitAndroid");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (HOST.equals(url.getHost())) return false;
                // Anything outside the app opens in the browser.
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, url));
                } catch (ActivityNotFoundException ignored) {
                }
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (pendingPick != null) pendingPick.onReceiveValue(null);
                pendingPick = callback;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                // The page accepts JSON, CSV, text and .xlsx; MIME types for those vary by
                // file manager, so allow any file and let the page validate it.
                i.setType("*/*");
                try {
                    startActivityForResult(i, REQ_PICK_FILE);
                } catch (ActivityNotFoundException e) {
                    pendingPick = null;
                    return false;
                }
                return true;
            }
        });

        if (savedInstanceState != null) webView.restoreState(savedInstanceState);
        else webView.loadUrl(START_URL);

        if (savedInstanceState == null) checkForUpdate(false);
    }

    /* ---------- update check ---------- */

    private static final long UPDATE_CHECK_INTERVAL = 12 * 60 * 60 * 1000L;

    /**
     * Looks up the latest GitHub Release (tagged v1.0.<versionCode>) and offers to download it
     * when it is newer than this install. The automatic check runs at most twice a day and is
     * silent when offline; a manual check (button in Settings) always runs and reports the result.
     */
    private void checkForUpdate(final boolean manual) {
        final SharedPreferences prefs = getSharedPreferences("update", MODE_PRIVATE);
        long now = System.currentTimeMillis();
        if (!manual && now - prefs.getLong("lastCheck", 0) < UPDATE_CHECK_INTERVAL) return;
        prefs.edit().putLong("lastCheck", now).apply();
        if (manual) Toast.makeText(this, R.string.update_checking, Toast.LENGTH_SHORT).show();

        new Thread(() -> {
            try {
                URL api = new URL("https://api.github.com/repos/" + BuildConfig.UPDATE_REPO + "/releases/latest");
                HttpURLConnection c = (HttpURLConnection) api.openConnection();
                c.setConnectTimeout(8000);
                c.setReadTimeout(8000);
                c.setRequestProperty("Accept", "application/vnd.github+json");
                if (c.getResponseCode() != 200) throw new Exception("HTTP " + c.getResponseCode());
                String body;
                try (InputStream in = c.getInputStream()) {
                    ByteArrayOutputStream buf = new ByteArrayOutputStream();
                    byte[] b = new byte[8192];
                    for (int n; (n = in.read(b)) > 0; ) buf.write(b, 0, n);
                    body = buf.toString("UTF-8");
                }
                String tag = new JSONObject(body).optString("tag_name", "");
                int dot = tag.lastIndexOf('.');
                if (dot < 0) throw new Exception("Unexpected tag " + tag);
                final long latest = Long.parseLong(tag.substring(dot + 1));
                final String name = tag.startsWith("v") ? tag.substring(1) : tag;
                if (latest > installedVersionCode()) runOnUiThread(() -> showUpdateDialog(name));
                else if (manual) runOnUiThread(() -> Toast.makeText(this,
                        getString(R.string.update_none, BuildConfig.VERSION_NAME), Toast.LENGTH_LONG).show());
            } catch (Exception e) {
                // No network, rate limit or unexpected response: the automatic check tries again next time.
                if (manual) runOnUiThread(() -> Toast.makeText(this, R.string.update_failed, Toast.LENGTH_LONG).show());
            }
        }).start();
    }

    private long installedVersionCode() throws Exception {
        PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
        return Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
    }

    private void showUpdateDialog(String version) {
        if (isFinishing()) return;
        new AlertDialog.Builder(this)
                .setTitle(R.string.update_title)
                .setMessage(getString(R.string.update_message, version, BuildConfig.VERSION_NAME))
                .setPositiveButton(R.string.update_download, (d, w) -> {
                    Uri apk = Uri.parse("https://github.com/" + BuildConfig.UPDATE_REPO
                            + "/releases/latest/download/fit-dnevnik.apk");
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, apk));
                    } catch (ActivityNotFoundException ignored) {
                    }
                })
                .setNegativeButton(R.string.update_later, null)
                .show();
    }

    /* ---------- steps from Health Connect (built into Android 14+) ---------- */

    private boolean granted(String permission) {
        return checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean stepsGranted() {
        return granted(READ_STEPS);
    }

    /** Reads whatever Health Connect data she allowed: steps and/or sleep. */
    @TargetApi(34)
    private void readHealth(int days, boolean afterRequest) {
        if (stepsGranted()) readSteps(days);
        else sendSteps(null, afterRequest ? "denied" : "noperm");
        if (granted(READ_SLEEP)) readSleep(days);
    }

    /**
     * Sleep of the last nights, in minutes, keyed by the day the sleep ended (the morning):
     * window.onSleep({"yyyy-mm-dd": minutes}). Like steps, sources are never added together;
     * the source with the most sleep that night is used.
     */
    @TargetApi(34)
    private void readSleep(int days) {
        HealthConnectManager hc = getSystemService(HealthConnectManager.class);
        if (hc == null) return;
        final ZoneId zone = ZoneId.systemDefault();
        Instant start = LocalDate.now(zone).minusDays(days).atTime(18, 0).atZone(zone).toInstant();
        ReadRecordsRequestUsingFilters<SleepSessionRecord> req =
                new ReadRecordsRequestUsingFilters.Builder<SleepSessionRecord>(SleepSessionRecord.class)
                        .setTimeRangeFilter(new TimeInstantRangeFilter.Builder()
                                .setStartTime(start).setEndTime(Instant.now()).build())
                        .setPageSize(1000)
                        .build();
        hc.readRecords(req, getMainExecutor(),
                new OutcomeReceiver<ReadRecordsResponse<SleepSessionRecord>, HealthConnectException>() {
                    @Override
                    public void onResult(ReadRecordsResponse<SleepSessionRecord> r) {
                        Map<String, Map<String, Long>> byDay = new HashMap<>();
                        for (SleepSessionRecord rec : r.getRecords()) {
                            String day = rec.getEndTime().atZone(zone).toLocalDate().toString();
                            String src = rec.getMetadata().getDataOrigin().getPackageName();
                            long min = Duration.between(rec.getStartTime(), rec.getEndTime()).toMinutes();
                            if (min <= 0) continue;
                            byDay.computeIfAbsent(day, k -> new HashMap<>()).merge(src, min, Long::sum);
                        }
                        JSONObject out = new JSONObject();
                        for (Map.Entry<String, Map<String, Long>> e : byDay.entrySet()) {
                            long max = 0;
                            for (long v : e.getValue().values()) max = Math.max(max, v);
                            try {
                                out.put(e.getKey(), max);
                            } catch (Exception ignored) {
                            }
                        }
                        webView.evaluateJavascript("window.onSleep && window.onSleep(" + out + ")", null);
                    }

                    @Override
                    public void onError(HealthConnectException e) {
                        // Sleep is optional; steps still work.
                    }
                });
    }

    /**
     * Reads the steps of each of the last {@code days} days (today up to now) and passes
     * {"yyyy-mm-dd": {"t": total, "by": {"package": steps}}} to window.onSteps(data, error).
     * "t" is Health Connect's own merged total; "by" is each source (Google Fit, the phone,
     * Samsung Health, a watch) on its own, because the merged total can pick a source that
     * counted fewer steps. The page uses the largest of them and never adds sources together.
     */
    @TargetApi(34)
    private void readSteps(int days) {
        HealthConnectManager hc = getSystemService(HealthConnectManager.class);
        if (hc == null) { sendSteps(null, "unsupported"); return; }
        final JSONObject out = new JSONObject();
        final int[] left = {days};
        final int[] errors = {0};
        ZoneId zone = ZoneId.systemDefault();
        LocalDate today = LocalDate.now(zone);
        for (int i = 0; i < days; i++) {
            final LocalDate d = today.minusDays(i);
            Instant start = d.atStartOfDay(zone).toInstant();
            Instant end = i == 0 ? Instant.now() : d.plusDays(1).atStartOfDay(zone).toInstant();
            readDay(hc, start, end, (total, by) -> {
                if (total < 0) errors[0]++;
                else if (total > 0 || by.length() > 0) {
                    try {
                        out.put(d.toString(), new JSONObject().put("t", total).put("by", by));
                    } catch (Exception ignored) {
                    }
                }
                if (--left[0] == 0) sendSteps(out, out.length() == 0 && errors[0] > 0 ? "error" : null);
            });
        }
    }

    private interface DaySteps {
        /** {@code total} is -1 when Health Connect returned an error. */
        void done(long total, JSONObject bySource);
    }

    @TargetApi(34)
    private static AggregateRecordsRequest<Long> stepsRequest(Instant start, Instant end, DataOrigin origin) {
        AggregateRecordsRequest.Builder<Long> b = new AggregateRecordsRequest.Builder<Long>(
                new TimeInstantRangeFilter.Builder().setStartTime(start).setEndTime(end).build())
                .addAggregationType(StepsRecord.STEPS_COUNT_TOTAL);
        if (origin != null) b.addDataOriginsFilter(origin);
        return b.build();
    }

    /** Merged total for one day, then the same day per source that contributed steps. */
    @TargetApi(34)
    private void readDay(final HealthConnectManager hc, final Instant start, final Instant end, final DaySteps cb) {
        hc.aggregate(stepsRequest(start, end, null), getMainExecutor(),
                new OutcomeReceiver<AggregateRecordsResponse<Long>, HealthConnectException>() {
                    @Override
                    public void onResult(AggregateRecordsResponse<Long> r) {
                        Long v = r.get(StepsRecord.STEPS_COUNT_TOTAL);
                        final long total = v == null ? 0 : v;
                        final JSONObject by = new JSONObject();
                        Set<DataOrigin> origins = r.getDataOrigins(StepsRecord.STEPS_COUNT_TOTAL);
                        if (origins == null || origins.isEmpty()) { cb.done(total, by); return; }
                        final int[] left = {origins.size()};
                        for (final DataOrigin o : origins) {
                            hc.aggregate(stepsRequest(start, end, o), getMainExecutor(),
                                    new OutcomeReceiver<AggregateRecordsResponse<Long>, HealthConnectException>() {
                                        @Override
                                        public void onResult(AggregateRecordsResponse<Long> ro) {
                                            Long n = ro.get(StepsRecord.STEPS_COUNT_TOTAL);
                                            try {
                                                if (n != null && n > 0) by.put(o.getPackageName(), n);
                                            } catch (Exception ignored) {
                                            }
                                            if (--left[0] == 0) cb.done(total, by);
                                        }

                                        @Override
                                        public void onError(HealthConnectException e) {
                                            if (--left[0] == 0) cb.done(total, by);
                                        }
                                    });
                        }
                    }

                    @Override
                    public void onError(HealthConnectException e) {
                        cb.done(-1, new JSONObject());
                    }
                });
    }

    /* ---------- backup folder ---------- */

    private Uri backupFolder() {
        String s = getSharedPreferences("backup", MODE_PRIVATE).getString("tree", null);
        if (s == null) return null;
        Uri tree = Uri.parse(s);
        for (UriPermission p : getContentResolver().getPersistedUriPermissions()) {
            if (p.getUri().equals(tree) && p.isWritePermission()) return tree;
        }
        return null;
    }

    private static String folderLabel(Uri tree) {
        String id = DocumentsContract.getTreeDocumentId(tree);
        int colon = id.lastIndexOf(':');
        String path = colon >= 0 ? id.substring(colon + 1) : id;
        return path.isEmpty() ? id : path;
    }

    private boolean writeToFolder(String name, String text) {
        Uri tree = backupFolder();
        if (tree == null) return false;
        try {
            Uri parent = DocumentsContract.buildDocumentUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree));
            Uri doc = DocumentsContract.createDocument(getContentResolver(), parent, "application/json", name);
            if (doc == null) return false;
            try (OutputStream out = getContentResolver().openOutputStream(doc)) {
                out.write(text.getBytes(StandardCharsets.UTF_8));
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private void sendFolder(String label) {
        webView.evaluateJavascript("window.onBackupFolder && window.onBackupFolder("
                + (label == null ? "null" : JSONObject.quote(label)) + ")", null);
    }

    private void sendSteps(JSONObject data, String error) {
        String js = "window.onSteps && window.onSteps(" + (data == null ? "null" : data.toString()) + ","
                + (error == null ? "null" : JSONObject.quote(error)) + ")";
        webView.evaluateJavascript(js, null);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode != REQ_STEPS) return;
        if (Build.VERSION.SDK_INT >= 34) readHealth(pendingStepsDays, true);
        else sendSteps(null, "unsupported");
    }

    /** Methods index.html calls through window.FitAndroid. */
    private class Bridge {
        /** "unsupported" (Android 13 or older), "granted" or "available" (not allowed yet). */
        @JavascriptInterface
        public String stepsStatus() {
            if (Build.VERSION.SDK_INT < 34) return "unsupported";
            return stepsGranted() ? "granted" : "available";
        }

        /** Reads steps; asks for permission first when {@code ask} is true and it is missing. */
        @JavascriptInterface
        public void syncSteps(final int days, final boolean ask) {
            runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT < 34) { sendSteps(null, "unsupported"); return; }
                int n = Math.max(1, Math.min(days, 60));
                List<String> missing = new ArrayList<>();
                if (!granted(READ_STEPS)) missing.add(READ_STEPS);
                if (!granted(READ_SLEEP)) missing.add(READ_SLEEP);
                if (ask && !missing.isEmpty()) {
                    pendingStepsDays = n;
                    requestPermissions(missing.toArray(new String[0]), REQ_STEPS);
                    return;
                }
                readHealth(n, false);
            });
        }

        /** "unsupported", "granted" or "available" for reading sleep. */
        @JavascriptInterface
        public String sleepStatus() {
            if (Build.VERSION.SDK_INT < 34) return "unsupported";
            return granted(READ_SLEEP) ? "granted" : "available";
        }

        /* ----- automatic weekly backup into a folder she picks once ----- */

        @JavascriptInterface
        public void chooseBackupFolder() {
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                        | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
                try {
                    startActivityForResult(i, REQ_TREE);
                } catch (ActivityNotFoundException e) {
                    sendFolder(null);
                }
            });
        }

        /** Name of the chosen folder, or "" when none is set (or access was lost). */
        @JavascriptInterface
        public String backupFolderName() {
            Uri tree = backupFolder();
            return tree == null ? "" : folderLabel(tree);
        }

        /** Writes the backup file into the chosen folder; reports window.onAutoBackup(true|false). */
        @JavascriptInterface
        public void autoBackup(final String name, final String text) {
            new Thread(() -> {
                boolean ok = writeToFolder(name, text);
                runOnUiThread(() -> webView.evaluateJavascript("window.onAutoBackup && window.onAutoBackup(" + ok + ")", null));
            }).start();
        }

        /* ----- home screen widget ----- */

        /** Stores today's numbers for the widget (JSON prepared and translated by the page). */
        @JavascriptInterface
        public void updateWidget(String json) {
            try {
                JSONObject j = new JSONObject(json);
                getSharedPreferences(WidgetProvider.PREFS, MODE_PRIVATE).edit()
                        .putString("date", j.optString("date"))
                        .putString("big", j.optString("big"))
                        .putString("label", j.optString("label"))
                        .putString("sub", j.optString("sub"))
                        .putString("waterLabel", j.optString("waterLabel"))
                        .putInt("waterMl", j.optInt("waterMl"))
                        .putInt("waterGoal", j.optInt("waterGoal"))
                        .putInt("glass", j.optInt("glass", 250))
                        .apply();
                WidgetProvider.refresh(MainActivity.this);
            } catch (Exception ignored) {
            }
        }

        /** Glasses of water added from the widget since the app last asked; resets the count. */
        @JavascriptInterface
        public int takeWidgetWater() {
            SharedPreferences p = getSharedPreferences(WidgetProvider.PREFS, MODE_PRIVATE);
            int n = p.getInt("pendingWater", 0);
            if (n > 0) p.edit().putInt("pendingWater", 0).apply();
            return n;
        }

        /** Installed version, shown in Settings. */
        @JavascriptInterface
        public String getVersion() {
            return BuildConfig.VERSION_NAME;
        }

        /** "Check for updates" button in Settings. */
        @JavascriptInterface
        public void checkUpdate() {
            runOnUiThread(() -> checkForUpdate(true));
        }

        /** Opens Google's barcode scanner; the result goes to window.onBarcode(code or null). */
        @JavascriptInterface
        public void scanBarcode() {
            runOnUiThread(() -> {
                GmsBarcodeScanner scanner = GmsBarcodeScanning.getClient(MainActivity.this);
                scanner.startScan()
                        .addOnSuccessListener(b -> sendBarcode(b.getRawValue()))
                        .addOnCanceledListener(() -> sendBarcode(null))
                        .addOnFailureListener(e -> {
                            Toast.makeText(MainActivity.this, R.string.scanner_unavailable, Toast.LENGTH_LONG).show();
                            sendBarcode(null);
                        });
            });
        }

        /** Saves a backup, since WebView cannot download blob: URLs. */
        @JavascriptInterface
        public void saveFile(final String name, final String text) {
            runOnUiThread(() -> {
                pendingSaveText = text;
                Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("application/json");
                i.putExtra(Intent.EXTRA_TITLE, name);
                try {
                    startActivityForResult(i, REQ_SAVE_FILE);
                } catch (ActivityNotFoundException e) {
                    pendingSaveText = null;
                    Toast.makeText(MainActivity.this, R.string.no_file_app, Toast.LENGTH_LONG).show();
                }
            });
        }
    }

    private void sendBarcode(String code) {
        String arg = code == null ? "null" : JSONObject.quote(code);
        webView.evaluateJavascript("window.onBarcode && window.onBarcode(" + arg + ")", null);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        Uri uri = (resultCode == RESULT_OK && data != null) ? data.getData() : null;

        if (requestCode == REQ_PICK_FILE && pendingPick != null) {
            pendingPick.onReceiveValue(uri != null ? new Uri[]{uri} : null);
            pendingPick = null;
        } else if (requestCode == REQ_TREE) {
            if (uri == null) { sendFolder(null); return; }
            try {
                getContentResolver().takePersistableUriPermission(uri,
                        Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                getSharedPreferences("backup", MODE_PRIVATE).edit().putString("tree", uri.toString()).apply();
                sendFolder(folderLabel(uri));
            } catch (Exception e) {
                sendFolder(null);
            }
        } else if (requestCode == REQ_SAVE_FILE) {
            String text = pendingSaveText;
            pendingSaveText = null;
            if (uri == null || text == null) return;
            try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                out.write(text.getBytes(StandardCharsets.UTF_8));
                Toast.makeText(this, R.string.backup_saved, Toast.LENGTH_SHORT).show();
            } catch (Exception e) {
                Toast.makeText(this, R.string.backup_failed, Toast.LENGTH_LONG).show();
            }
        }
    }

    @Override
    public void onBackPressed() {
        // The page closes an open sheet or returns to the Day tab; otherwise the app exits.
        webView.evaluateJavascript("!!(window.fitBack && window.fitBack())", handled -> {
            if (!"true".equals(handled)) finish();
        });
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }
}
