#if UNITY_EDITOR
using System;
using System.IO;
using System.Net.Http;
using System.Text;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

public class UnityDropBuildHook : IPostprocessBuildWithReport
{
    public int callbackOrder => 1000;

    private static readonly HttpClient client = new HttpClient { Timeout = TimeSpan.FromSeconds(3) };

    public void OnPostprocessBuild(BuildReport report)
    {
        if (report.summary.platform != BuildTarget.Android)
            return;

        if (report.summary.result != BuildResult.Succeeded)
            return;

        string outputPath = report.summary.outputPath;
        if (string.IsNullOrEmpty(outputPath) || !File.Exists(outputPath))
            return;

        if (!outputPath.EndsWith(".apk", StringComparison.OrdinalIgnoreCase))
            return;

        NotifyUnityDropHub(outputPath);
    }

    private async void NotifyUnityDropHub(string apkPath)
    {
        try
        {
            string url = "http://localhost:4500/api/unity-build-done";
            string json = "{\"apkPath\":\"" + apkPath.Replace("\\", "\\\\") + "\"}";
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await client.PostAsync(url, content);
            if (response.IsSuccessStatusCode)
            {
                Debug.Log($"<color=#38bdf8>[UnityDrop]</color> 🚀 APK başarıyla UnityDrop Hub'a gönderildi: <b>{Path.GetFileName(apkPath)}</b>");
            }
        }
        catch
        {
            // UnityDrop hub is not running, silent bypass
        }
    }
}
#endif