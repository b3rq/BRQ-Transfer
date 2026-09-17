Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\aliha\.gemini\antigravity\scratch\unity-apk-hub"
WshShell.Run "cmd /c npx electron electron.js", 0, False
