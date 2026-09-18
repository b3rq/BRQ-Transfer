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

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());

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

    private void loadHub(String ip) {
        String targetUrl = "http://" + ip + ":" + DEFAULT_HUB_PORT + "/mobile";
        Toast.makeText(this, "Bağlanılıyor: " + targetUrl, Toast.LENGTH_SHORT).show();
        webView.loadUrl(targetUrl);
    }

    private void downloadAndInstallApk(final String fileUrl) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!getPackageManager().canRequestPackageInstalls()) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                        Uri.parse("package:" + getPackageName()));
                startActivity(intent);
                Toast.makeText(this, "Lütfen bu uygulamadan yükleme iznini açın", Toast.LENGTH_LONG).show();
                return;
            }
        }

        final ProgressDialog progress = new ProgressDialog(this);
        progress.setTitle("APK İndiriliyor");
        progress.setMessage("Yerel Wi-Fi üzerinden aktarılıyor...");
        progress.setProgressStyle(ProgressDialog.STYLE_HORIZONTAL);
        progress.setCancelable(false);
        progress.setMax(100);
        progress.show();

        final Handler handler = new Handler(Looper.getMainLooper());

        new Thread(new Runnable() {
            @Override
            public void run() {
                File apkFile = null;
                try {
                    URL url = new URL(fileUrl);
                    HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                    connection.connect();

                    int fileLength = connection.getContentLength();
                    File baseDir = getExternalFilesDir(null);
                    if (baseDir == null) baseDir = getCacheDir();
                    apkFile = new File(baseDir, "game_latest.apk");
                    if (apkFile.exists()) apkFile.delete();

                    InputStream input = connection.getInputStream();
                    FileOutputStream output = new FileOutputStream(apkFile);

                    byte[] data = new byte[8192];
                    long total = 0;
                    int count;
                    while ((count = input.read(data)) != -1) {
                        total += count;
                        if (fileLength > 0) {
                            final int percent = (int) (total * 100 / fileLength);
                            handler.post(new Runnable() {
                                @Override
                                public void run() {
                                    progress.setProgress(percent);
                                }
                            });
                        }
                        output.write(data, 0, count);
                    }
                    output.flush();
                    output.close();
                    input.close();

                    final File finalFile = apkFile;
                    handler.post(new Runnable() {
                        @Override
                        public void run() {
                            progress.dismiss();
                            triggerInstall(finalFile);
                        }
                    });

                } catch (final Exception e) {
                    handler.post(new Runnable() {
                        @Override
                        public void run() {
                            progress.dismiss();
                            Toast.makeText(MainActivity.this, "İndirme Hatası: " + e.getMessage(), Toast.LENGTH_LONG).show();
                        }
                    });
                }
            }
        }).start();
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