package app.fitdnevnik;

import android.content.Context;
import android.content.SharedPreferences;
import android.webkit.WebResourceResponse;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Iterator;

/**
 * Silent updates of the app's web content (index.html, app.js, foods.js, i18n.js).
 *
 * Every release carries web.json: {"version": run, "native": run of the last Android change,
 * "files": {"app.js": "sha256", ...}} plus the files themselves. When only the web content
 * changed, the files are downloaded, checked against their SHA-256 and stored in
 * files/www-&lt;version&gt;; from then on they are served instead of the copy bundled in the APK.
 * If anything fails, the bundled (or previous) content keeps working. When the Android part
 * changed ("native" is newer than this APK), a real APK update is needed instead.
 */
final class WebUpdater {

    static final String BASE = "https://github.com/" + BuildConfig.UPDATE_REPO + "/releases/latest/download/";

    private final Context ctx;
    private final SharedPreferences prefs;
    /** Content the page is using; fixed for this run so a download never mixes versions mid-load. */
    private File serving;

    WebUpdater(Context c) {
        ctx = c.getApplicationContext();
        prefs = ctx.getSharedPreferences("web", Context.MODE_PRIVATE);
        serving = activeDir();
    }

    /** Switches to the newest downloaded content (then the page is reloaded). */
    void useLatest() {
        serving = activeDir();
    }

    /** Directory with downloaded content newer than what the APK bundles, or null. */
    File activeDir() {
        int v = prefs.getInt("version", 0);
        if (v <= BuildConfig.VERSION_CODE) return null;
        File d = new File(ctx.getFilesDir(), "www-" + v);
        return new File(d, "index.html").isFile() ? d : null;
    }

    /** Version of the content the page is running (downloaded or bundled). */
    int contentVersion() {
        return serving == null ? BuildConfig.VERSION_CODE : Integer.parseInt(serving.getName().substring(4));
    }

    /** Newest content on the phone, including a download not in use until the next start. */
    int latestVersion() {
        return Math.max(BuildConfig.VERSION_CODE, activeDir() == null ? 0 : prefs.getInt("version", 0));
    }

    /** Removes downloaded content that is no longer used (older than the APK, or replaced). */
    void cleanup() {
        File active = activeDir();
        File[] all = ctx.getFilesDir().listFiles();
        if (all == null) return;
        for (File f : all) {
            if (f.getName().startsWith("www-") && !f.equals(active) && !f.equals(serving)) deleteRecursive(f);
        }
    }

    /** Serves a file from the downloaded content; null lets the bundled asset be used. */
    WebResourceResponse serve(String path) {
        File dir = serving;
        if (dir == null) return null;
        try {
            File f = new File(dir, path);
            if (!f.getCanonicalPath().startsWith(dir.getCanonicalPath() + File.separator) || !f.isFile()) return null;
            return new WebResourceResponse(mime(path), "utf-8", new FileInputStream(f));
        } catch (IOException e) {
            return null;
        }
    }

    private static String mime(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".js")) return "application/javascript";
        if (path.endsWith(".json")) return "application/json";
        if (path.endsWith(".css")) return "text/css";
        return "application/octet-stream";
    }

    /** The latest release's web.json. */
    static JSONObject fetchManifest() throws Exception {
        return new JSONObject(new String(download(BASE + "web.json"), "UTF-8"));
    }

    /**
     * Downloads and verifies the content described by {@code m}. Returns true when it is stored
     * and will be used from the next page load.
     */
    boolean install(JSONObject m) throws Exception {
        int version = m.getInt("version");
        JSONObject files = m.getJSONObject("files");
        if (!files.has("index.html")) return false;
        File tmp = new File(ctx.getFilesDir(), "www-tmp");
        deleteRecursive(tmp);
        if (!tmp.mkdirs()) return false;
        for (Iterator<String> it = files.keys(); it.hasNext(); ) {
            String name = it.next();
            if (!name.matches("[A-Za-z0-9._-]+")) return false;
            byte[] data = download(BASE + name);
            if (!sha256(data).equalsIgnoreCase(files.getString(name))) {
                deleteRecursive(tmp);
                return false;
            }
            try (FileOutputStream out = new FileOutputStream(new File(tmp, name))) {
                out.write(data);
            }
        }
        File dst = new File(ctx.getFilesDir(), "www-" + version);
        deleteRecursive(dst);
        if (!tmp.renameTo(dst)) return false;
        prefs.edit().putInt("version", version).apply();
        return true;
    }

    static byte[] download(String url) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(15000);
        c.setReadTimeout(30000);
        c.setInstanceFollowRedirects(true);
        if (c.getResponseCode() != 200) throw new IOException("HTTP " + c.getResponseCode() + " for " + url);
        try (InputStream in = c.getInputStream()) {
            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            byte[] b = new byte[16384];
            for (int n; (n = in.read(b)) > 0; ) buf.write(b, 0, n);
            return buf.toByteArray();
        }
    }

    private static String sha256(byte[] data) throws Exception {
        StringBuilder sb = new StringBuilder();
        for (byte x : MessageDigest.getInstance("SHA-256").digest(data)) sb.append(String.format("%02x", x));
        return sb.toString();
    }

    private static void deleteRecursive(File f) {
        File[] kids = f.listFiles();
        if (kids != null) for (File k : kids) deleteRecursive(k);
        //noinspection ResultOfMethodCallIgnored
        f.delete();
    }
}
