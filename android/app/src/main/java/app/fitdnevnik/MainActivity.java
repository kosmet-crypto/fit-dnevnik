package app.fitdnevnik;

import android.annotation.TargetApi;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.health.connect.AggregateRecordsRequest;
import android.health.connect.AggregateRecordsResponse;
import android.health.connect.HealthConnectException;
import android.health.connect.HealthConnectManager;
import android.health.connect.TimeInstantRangeFilter;
import android.health.connect.datatypes.StepsRecord;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.OutcomeReceiver;
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
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

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
    private static final String READ_STEPS = "android.permission.health.READ_STEPS";

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

    private boolean stepsGranted() {
        return checkSelfPermission(READ_STEPS) == PackageManager.PERMISSION_GRANTED;
    }

    /**
     * Reads the total steps of each of the last {@code days} days (today up to now) and passes
     * {"yyyy-mm-dd": steps} to window.onSteps(data, error). Health Connect itself merges the
     * sources (phone, Google Fit, Samsung Health, watch) without counting steps twice.
     */
    @TargetApi(34)
    private void readSteps(int days) {
        HealthConnectManager hc = getSystemService(HealthConnectManager.class);
        if (hc == null) { sendSteps(null, "unsupported"); return; }
        final JSONObject out = new JSONObject();
        final int[] left = {days};
        ZoneId zone = ZoneId.systemDefault();
        LocalDate today = LocalDate.now(zone);
        for (int i = 0; i < days; i++) {
            final LocalDate d = today.minusDays(i);
            Instant start = d.atStartOfDay(zone).toInstant();
            Instant end = i == 0 ? Instant.now() : d.plusDays(1).atStartOfDay(zone).toInstant();
            AggregateRecordsRequest<Long> req = new AggregateRecordsRequest.Builder<Long>(
                    new TimeInstantRangeFilter.Builder().setStartTime(start).setEndTime(end).build())
                    .addAggregationType(StepsRecord.STEPS_COUNT_TOTAL)
                    .build();
            hc.aggregate(req, getMainExecutor(), new OutcomeReceiver<AggregateRecordsResponse<Long>, HealthConnectException>() {
                @Override
                public void onResult(AggregateRecordsResponse<Long> r) {
                    Long v = r.get(StepsRecord.STEPS_COUNT_TOTAL);
                    try {
                        if (v != null && v > 0) out.put(d.toString(), v);
                    } catch (Exception ignored) {
                    }
                    if (--left[0] == 0) sendSteps(out, null);
                }

                @Override
                public void onError(HealthConnectException e) {
                    if (--left[0] == 0) sendSteps(out, out.length() == 0 ? "error" : null);
                }
            });
        }
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
        if (Build.VERSION.SDK_INT >= 34 && stepsGranted()) readSteps(pendingStepsDays);
        else sendSteps(null, "denied");
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
                if (stepsGranted()) { readSteps(n); return; }
                if (!ask) { sendSteps(null, "noperm"); return; }
                pendingStepsDays = n;
                requestPermissions(new String[]{READ_STEPS}, REQ_STEPS);
            });
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
