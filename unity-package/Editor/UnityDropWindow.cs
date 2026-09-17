#if UNITY_EDITOR
using System;
using System.Net.Http;
using UnityEditor;
using UnityEngine;

public class UnityDropWindow : EditorWindow
{
    private bool isHubOnline = false;
    private string hubIp = "127.0.0.1";
    private int hubPort = 4500;
    private int apkCount = 0;
    private string lastCheckedTime = "";

    private static readonly HttpClient client = new HttpClient { Timeout = TimeSpan.FromSeconds(2) };

    [MenuItem("Tools/UnityDrop Hub 🚀", false, 50)]
    public static void ShowWindow()
    {
        var window = GetWindow<UnityDropWindow>("UnityDrop Hub");
        window.minSize = new Vector2(350, 420);
        window.CheckStatus();
    }

    private void OnEnable()
    {
        CheckStatus();
    }

    private async void CheckStatus()
    {
        try
        {
            var res = await client.GetStringAsync("http://localhost:4500/api/status");
            isHubOnline = true;
            lastCheckedTime = DateTime.Now.ToString("HH:mm:ss");
            Repaint();
        }
        catch
        {
            isHubOnline = false;
            lastCheckedTime = DateTime.Now.ToString("HH:mm:ss");
            Repaint();
        }
    }

    private void OnGUI()
    {
        EditorGUILayout.Space(10);
        GUILayout.Label("🎮 UnityDrop Hub", EditorStyles.boldLabel);
        EditorGUILayout.LabelField("Kablosuz APK Dağıtım & Canlı Test Aracı", EditorStyles.miniLabel);

        EditorGUILayout.Space(10);

        // Status Card
        EditorGUILayout.BeginVertical(EditorStyles.helpBox);
        EditorGUILayout.BeginHorizontal();
        GUILayout.Label("Sunucu Durumu: ", EditorStyles.boldLabel, GUILayout.Width(110));
        if (isHubOnline)
        {
            GUI.color = Color.green;
            GUILayout.Label("● AKTİF (Port: 4500)", EditorStyles.boldLabel);
            GUI.color = Color.white;
        }
        else
        {
            GUI.color = Color.red;
            GUILayout.Label("○ ÇEVRİMDIŞI", EditorStyles.boldLabel);
            GUI.color = Color.white;
        }
        EditorGUILayout.EndHorizontal();

        EditorGUILayout.LabelField("Son Kontrol", lastCheckedTime, EditorStyles.miniLabel);
        EditorGUILayout.EndVertical();

        EditorGUILayout.Space(10);

        if (isHubOnline)
        {
            if (GUILayout.Button("🌐 PC Yönetim Panelini Aç", GUILayout.Height(36)))
            {
                Application.OpenURL("http://localhost:4500");
            }

            if (GUILayout.Button("📱 Mobil Sayfayı Aç", GUILayout.Height(30)))
            {
                Application.OpenURL("http://localhost:4500/mobile");
            }
        }
        else
        {
            EditorGUILayout.HelpBox("UnityDrop Hub çalışmıyor. Proje klasöründeki start-hub.bat dosyasını çalıştırarak hub'ı başlatın.", MessageType.Warning);
        }

        EditorGUILayout.Space(15);

        // Quick Actions
        GUILayout.Label("Hızlı İşlemler", EditorStyles.boldLabel);
        if (GUILayout.Button("🔄 Durumu Yenile", GUILayout.Height(28)))
        {
            CheckStatus();
        }

        EditorGUILayout.Space(10);
        EditorGUILayout.HelpBox("Build Settings'ten Android seçip Build aldığınızda, UnityDrop otomatik olarak APK'yı yakalar ve telefonunuza gönderir.", MessageType.Info);
    }
}
#endif