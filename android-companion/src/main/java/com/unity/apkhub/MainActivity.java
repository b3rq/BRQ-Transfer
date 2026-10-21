package com.unity.apkhub;

import android.app.Activity;
import android.app.ProgressDialog;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.View;
import android.webkit.DownloadListener;
import android.webkit.WebChromeClient;
import android.webkit.ValueCallback;
import android.webkit.CookieManager;
import java.util.UUID;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
public class MainActivity extends Activity {
    private static final String PREF_NAME = "UnityHubPrefs";
    private static final String KEY_HUB_IP = "hub_ip";
    private static final String DEFAULT_HUB_IP = "";
    private static final String DEFAULT_HUB_PORT = "4500";

    private static final int FILE_PICKER = 1001;
    private static final int INSTALL_PERMISSION = 1002;
    private ValueCallback<Uri[]> fileCallback;
    private Uri hubOrigin;
    private String pendingInstallUrl;
    private volatile boolean destroyed;
    private volatile boolean downloadCancelled;
    private volatile boolean downloadInProgress;
    private volatile HttpURLConnection downloadConnection;
    private Thread downloadThread;
    private ProgressDialog downloadProgress;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private WebView webView;
    private EditText ipEditText;
    private SharedPreferences prefs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        prefs = getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        String savedIp = prefs.getString(KEY_HUB_IP, DEFAULT_HUB_IP);

        // Build root UI programmatically
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xFF0F172A);

        // Top Control Bar
        LinearLayout topBar = new LinearLayout(this);
        topBar.setOrientation(LinearLayout.HORIZONTAL);
        topBar.setPadding(20, 20, 20, 20);
        topBar.setBackgroundColor(0xFF1E293B);

        ipEditText = new EditText(this);
        ipEditText.setText(savedIp);
        ipEditText.setTextColor(0xFFF8FAFC);
        ipEditText.setTextSize(14);
        ipEditText.setHint("PC IP (Örn: 192.168.1.50)");
        ipEditText.setHintTextColor(0xFF94A3B8);
        LinearLayout.LayoutParams ipParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
        ipEditText.setLayoutParams(ipParams);
        topBar.addView(ipEditText);

        Button connectBtn = new Button(this);
        connectBtn.setText("Bağlan");
        connectBtn.setTextColor(0xFFFFFFFF);
        connectBtn.setBackgroundColor(0xFF3B82F6);
        connectBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String ip = ipEditText.getText().toString().trim();
                if (!ip.isEmpty()) {
                    prefs.edit().putString(KEY_HUB_IP, ip).apply();
                    loadHub(ip);
                }
            }
        });
        topBar.addView(connectBtn);

        root.addView(topBar);

        // WebView Setup
        webView = new WebView(this);
        LinearLayout.LayoutParams webParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, 1.0f);
        webView.setLayoutParams(webParams);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);

        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (isHubUrl(url)) return false;
                Toast.makeText(MainActivity.this, "Yalnız seçilen hub bağlantıları açılabilir.", Toast.LENGTH_SHORT).show();
                return true;
            }
            @Override public void onReceivedError(WebView view, int code, String description, String failingUrl) {
                Toast.makeText(MainActivity.this, "Hub açılamadı. Adresi kontrol edip Bağlan düğmesine basın.", Toast.LENGTH_LONG).show();
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                try { startActivityForResult(intent, FILE_PICKER); }
                catch (Exception error) { fileCallback.onReceiveValue(null); fileCallback = null; }
                return true;
            }
        });

        // Intercept APK downloads directly
        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                downloadAndInstallApk(url);
            }
        });

        root.addView(webView);
        setContentView(root);

        loadHub(savedIp);
    }

    private void loadHub(String address) {
        if (address == null || address.trim().isEmpty()) return;
        try {
            String input = address.trim();
            Uri uri = Uri.parse(input.contains("://") ? input : "http://" + input);
            if (!"http".equals(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null ||
                    (uri.getPath() != null && !uri.getPath().isEmpty() && !"/".equals(uri.getPath())) || uri.getQuery() != null || uri.getFragment() != null) throw new IllegalArgumentException();
            int port = uri.getPort() < 0 ? Integer.parseInt(DEFAULT_HUB_PORT) : uri.getPort();
            if (port < 1 || port > 65535) throw new IllegalArgumentException();
            hubOrigin = uri.buildUpon().encodedAuthority((uri.getHost().contains(":") ? "[" + uri.getHost() + "]" : uri.getHost()) + ":" + port).path("").build();
            webView.loadUrl(hubOrigin.toString() + "/mobile");
        } catch (Exception error) {
            Toast.makeText(this, "Geçerli bir IP veya host:port girin.", Toast.LENGTH_LONG).show();
        }
    }

    private boolean isHubUrl(String url) {
        Uri uri = Uri.parse(url);
        return hubOrigin != null && hubOrigin.getScheme().equals(uri.getScheme()) &&
                hubOrigin.getHost().equalsIgnoreCase(uri.getHost() == null ? "" : uri.getHost()) && hubOrigin.getPort() == uri.getPort();
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_PICKER && fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            fileCallback = null;
        } else if (requestCode == INSTALL_PERMISSION) {
            String url = pendingInstallUrl;
            pendingInstallUrl = null;
            if (Build.VERSION.SDK_INT < 26 || getPackageManager().canRequestPackageInstalls()) {
                if (url != null && !destroyed) downloadAndInstallApk(url);
            } else Toast.makeText(this, "Yükleme izni verilmedi. APK indirilmedi.", Toast.LENGTH_LONG).show();
        }
    }

    private void cancelDownload() {
        downloadCancelled = true;
        if (downloadThread != null) downloadThread.interrupt();
        HttpURLConnection connection = downloadConnection;
        if (connection != null) connection.disconnect();
    }

    private void downloadAndInstallApk(final String fileUrl) {
        if (destroyed || !isHubUrl(fileUrl)) {
            Toast.makeText(this, "İndirme adresi seçilen hub'a ait değil.", Toast.LENGTH_LONG).show(); return;
        }
        if (downloadInProgress) {
            Toast.makeText(this, "Bir indirme zaten devam ediyor.", Toast.LENGTH_SHORT).show(); return;
        }
        if (Build.VERSION.SDK_INT >= 26 && !getPackageManager().canRequestPackageInstalls()) {
            pendingInstallUrl = fileUrl;
            startActivityForResult(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getPackageName())), INSTALL_PERMISSION);
            return;
        }
        downloadCancelled = false;
        downloadInProgress = true;
        final ProgressDialog progress = new ProgressDialog(this);
        downloadProgress = progress;
        progress.setTitle("APK İndiriliyor");
        progress.setMessage("İptal etmek için geri düğmesine basın.");
        progress.setProgressStyle(ProgressDialog.STYLE_HORIZONTAL);
        progress.setIndeterminate(true);
        progress.setCancelable(true);
        progress.setOnCancelListener(dialog -> cancelDownload());
        progress.setMax(100);
        progress.show();
        final String cookie = CookieManager.getInstance().getCookie(fileUrl);
        downloadThread = new Thread(() -> {
            File partial = null;
            File completed = null;
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(fileUrl).openConnection();
                downloadConnection = connection;
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(30000);
                connection.setInstanceFollowRedirects(false);
                if (cookie != null) connection.setRequestProperty("Cookie", cookie);
                connection.connect();
                if (connection.getResponseCode() != 200) throw new java.io.IOException("Sunucu indirmeyi reddetti.");
                final long length = connection.getContentLengthLong();
                if (length > 2000L * 1024 * 1024) throw new java.io.IOException("Dosya 2000 MiB sınırını aşıyor.");
                handler.post(() -> { if (!destroyed) progress.setIndeterminate(length <= 0); });
                File directory = getExternalFilesDir(null);
                if (directory == null) directory = getCacheDir();
                partial = File.createTempFile("download-", ".part", directory);
                long total = 0, lastProgressAt = 0;
                int lastPercent = -1;
                try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(partial)) {
                    byte[] bytes = new byte[65536];
                    int count;
                    while ((count = input.read(bytes)) != -1) {
                        if (downloadCancelled || destroyed) throw new java.io.IOException("İndirme iptal edildi.");
                        total += count;
                        if (total > 2000L * 1024 * 1024) throw new java.io.IOException("Dosya boyut sınırını aşıyor.");
                        output.write(bytes, 0, count);
                        final int percent = length > 0 ? (int) (total * 100 / length) : -1;
                        long now = android.os.SystemClock.elapsedRealtime();
                        if (percent != lastPercent && now - lastProgressAt >= 100) {
                            lastPercent = percent; lastProgressAt = now;
                            handler.post(() -> { if (!destroyed && !downloadCancelled) progress.setProgress(percent); });
                        }
                    }
                    output.getFD().sync();
                }
                if (downloadCancelled || destroyed || total == 0 || (length >= 0 && total != length)) throw new java.io.IOException("İndirme tamamlanamadı.");
                if (getPackageManager().getPackageArchiveInfo(partial.getAbsolutePath(), 0) == null) throw new java.io.IOException("Geçerli bir APK alınamadı.");
                completed = new File(directory, "download-" + UUID.randomUUID() + ".apk");
                if (!partial.renameTo(completed)) throw new java.io.IOException("APK kaydedilemedi.");
                final File apk = completed;
                handler.post(() -> {
                    downloadInProgress = false;
                    if (destroyed || downloadCancelled) { apk.delete(); return; }
                    progress.setProgress(100); progress.dismiss(); downloadProgress = null;
                    triggerInstall(apk);
                });
            } catch (Exception error) {
                if (partial != null) partial.delete();
                if (completed != null) completed.delete();
                handler.post(() -> {
                    downloadInProgress = false;
                    if (destroyed) return;
                    progress.dismiss(); downloadProgress = null;
                    Toast.makeText(MainActivity.this, downloadCancelled ? "İndirme iptal edildi." : "İndirme tamamlanamadı. Hub ve Wi-Fi bağlantısını kontrol edin.", Toast.LENGTH_LONG).show();
                });
            } finally {
                if (connection != null) connection.disconnect();
                if (downloadConnection == connection) downloadConnection = null;
            }
        }, "brq-download");
        downloadThread.start();
    }

    @Override protected void onDestroy() {
        destroyed = true;
        cancelDownload();
        handler.removeCallbacksAndMessages(null);
        if (downloadProgress != null) downloadProgress.dismiss();
        if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; }
        pendingInstallUrl = null;
        webView.stopLoading(); webView.setDownloadListener(null); webView.destroy();
        super.onDestroy();
    }

    private void triggerInstall(File apkFile) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            Uri apkUri = Uri.parse("content://" + getPackageName() + ".fileprovider/" + apkFile.getName());
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(this, "Yükleme başlatılamadı: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }
}
