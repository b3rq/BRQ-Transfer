#if UNITY_EDITOR
using System;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

public class UnityDropBuildHook : IPostprocessBuildWithReport
{
    private static readonly HttpClient _client = new HttpClient { Timeout = TimeSpan.FromSeconds(3) };
    public int callbackOrder => 1000;
    internal static string HubUrl => "http://localhost:" + Mathf.Clamp(EditorPrefs.GetInt("BRQTransfer.Port", 4500), 1, 65535);

    #region Build Notification
    public void OnPostprocessBuild(BuildReport report)
    {
        if (report.summary.platform != BuildTarget.Android || report.summary.result != BuildResult.Succeeded)
            return;
        string outputPath = report.summary.outputPath;
        if (string.IsNullOrEmpty(outputPath) || !File.Exists(outputPath) || !outputPath.EndsWith(".apk", StringComparison.OrdinalIgnoreCase))
            return;
        NotifyUnityDropHub(outputPath);
    }

    private async void NotifyUnityDropHub(string apkPath)
    {
        try
        {
            string json = JsonUtility.ToJson(new BuildNotification { ApkPath = apkPath });
            string folder = EditorPrefs.GetString("BRQTransfer.HubFolder", Environment.GetEnvironmentVariable("BRQ_TRANSFER_HOME") ?? "");
            string sessionFile = Path.Combine(folder, ".dashboard-session.json");
            if (string.IsNullOrEmpty(folder) || !File.Exists(sessionFile)) return;
            var session = JsonUtility.FromJson<LocalSession>(File.ReadAllText(sessionFile));
            using (var request = new HttpRequestMessage(HttpMethod.Post, HubUrl + "/api/unity-build-done"))
            {
                request.Headers.Add("X-BRQ-Local-Session", session.HookToken);
                request.Content = new StringContent(json, Encoding.UTF8, "application/json");
                using (var response = await _client.SendAsync(request))
                {
                    if (!response.IsSuccessStatusCode)
                        Debug.LogWarning("[BRQ Transfer] APK üretildi, fakat hub kaydı tamamlanamadı. Hub bağlantısını ve dosya erişimini kontrol edin. HTTP " + (int)response.StatusCode);
                }
            }
        }
        catch (HttpRequestException) { /* Hub offline does not change the build result. */ }
        catch (TaskCanceledException) { /* Hub timeout does not change the build result. */ }
        catch (Exception) { Debug.LogWarning("[BRQ Transfer] APK bildirimi tamamlanamadı. Hub ayarlarını kontrol edin."); }
    }
    #endregion

    [Serializable]
    private class BuildNotification
    {
        public string ApkPath;
    }
    [Serializable]
    private class LocalSession
    {
        public string HookToken = "";
    }
}
#endif
