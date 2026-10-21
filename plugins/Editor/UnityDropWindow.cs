#if UNITY_EDITOR
using System;
using System.IO;
using System.Net.Http;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Threading;
using UnityEditor;
using UnityEngine;

public class UnityDropWindow : EditorWindow
{
    private bool _isHubOnline;
    private bool _isClosed;
    private int _hubPort = 4500;
    private string _lastCheckedTime = "";
    private string _hubFolder = "";
    private CancellationTokenSource _requestCancellation;
    private static readonly HttpClient _client = new HttpClient { Timeout = TimeSpan.FromSeconds(2) };

    #region Lifecycle
    [MenuItem("Tools/UnityDrop Hub 🚀", false, 50)]
    public static void ShowWindow()
    {
        var window = GetWindow<UnityDropWindow>("UnityDrop Hub");
        window.minSize = new Vector2(350, 420);
    }
    private void OnEnable()
    {
        _isClosed = false;
        _hubPort = EditorPrefs.GetInt("BRQTransfer.Port", 4500);
        _hubFolder = EditorPrefs.GetString("BRQTransfer.HubFolder", Environment.GetEnvironmentVariable("BRQ_TRANSFER_HOME") ?? "");
        CheckStatus();
    }
    private void OnDisable()
    {
        _isClosed = true;
        _requestCancellation?.Cancel();
        _requestCancellation = null;
    }
    #endregion

    #region Status
    private async void CheckStatus()
    {
        if (_isClosed || _requestCancellation != null) return;
        var cancellation = new CancellationTokenSource();
        _requestCancellation = cancellation;
        bool online = false;
        try
        {
            using (var response = await _client.GetAsync(UnityDropBuildHook.HubUrl + "/api/health", cancellation.Token))
            using (var stream = new MemoryStream(await response.Content.ReadAsByteArrayAsync()))
            {
                var serializer = new DataContractJsonSerializer(typeof(HealthResponse));
                var health = (HealthResponse)serializer.ReadObject(stream);
                online = response.IsSuccessStatusCode && health.App == "brq-transfer" && health.Ready;
            }
        }
        catch (Exception) { online = false; }
        finally
        {
            if (_requestCancellation == cancellation) _requestCancellation = null;
            cancellation.Dispose();
        }
        if (_isClosed || cancellation.IsCancellationRequested) return;
        _isHubOnline = online;
        _lastCheckedTime = DateTime.Now.ToString("HH:mm:ss");
        Repaint();
    }
    #endregion

    #region Interface
    private void OnGUI()
    {
        EditorGUI.BeginChangeCheck();
        int port = EditorGUILayout.IntField("Hub Port", _hubPort);
        if (EditorGUI.EndChangeCheck())
        {
            _hubPort = Mathf.Clamp(port, 1, 65535);
            EditorPrefs.SetInt("BRQTransfer.Port", _hubPort);
            _requestCancellation?.Cancel();
            _isHubOnline = false;
        }
        if (GUILayout.Button("BRQ Transfer Klasörünü Seç"))
        {
            string folder = EditorUtility.OpenFolderPanel("BRQ Transfer", _hubFolder, "");
            if (!string.IsNullOrEmpty(folder)) { _hubFolder = folder; EditorPrefs.SetString("BRQTransfer.HubFolder", folder); }
        }
        EditorGUILayout.LabelField("Hub Klasörü", _hubFolder);
        EditorGUILayout.Space(10);
        GUILayout.Label("🎮 UnityDrop Hub", EditorStyles.boldLabel);
        EditorGUILayout.LabelField("Kablosuz APK Dağıtım & Canlı Test Aracı", EditorStyles.miniLabel);

        EditorGUILayout.Space(10);

        // Status Card
        EditorGUILayout.BeginVertical(EditorStyles.helpBox);
        EditorGUILayout.BeginHorizontal();
        GUILayout.Label("Sunucu Durumu: ", EditorStyles.boldLabel, GUILayout.Width(110));
        if (_isHubOnline)
        {
            GUI.color = Color.green;
            GUILayout.Label("● AKTİF (Port: " + _hubPort + ")", EditorStyles.boldLabel);
            GUI.color = Color.white;
        }
        else
        {
            GUI.color = Color.red;
            GUILayout.Label("○ ÇEVRİMDIŞI", EditorStyles.boldLabel);
            GUI.color = Color.white;
        }
        EditorGUILayout.EndHorizontal();

        EditorGUILayout.LabelField("Son Kontrol", _lastCheckedTime, EditorStyles.miniLabel);
        EditorGUILayout.EndVertical();

        EditorGUILayout.Space(10);

        if (_isHubOnline)
        {
            if (GUILayout.Button("🌐 PC Yönetim Panelini Aç", GUILayout.Height(36)))
            {
                Application.OpenURL(UnityDropBuildHook.HubUrl);
            }

            if (GUILayout.Button("📱 Mobil Sayfayı Aç", GUILayout.Height(30)))
            {
                Application.OpenURL(UnityDropBuildHook.HubUrl + "/mobile");
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
    #endregion

    [DataContract]
    private class HealthResponse
    {
        [DataMember(Name = "app")] public string App = "";
        [DataMember(Name = "ready")] public bool Ready = false;
    }
}
#endif
