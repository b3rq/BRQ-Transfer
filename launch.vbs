Set FSO = CreateObject("Scripting.FileSystemObject")
ScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = ScriptDir
WshShell.Environment("PROCESS")("BRQ_SILENT") = "1"
ExitCode = WshShell.Run("cmd.exe /d /c """ & ScriptDir & "\start.bat""", 0, True)
If ExitCode = 2 Then
    WshShell.Popup "BRQ Transfer masaustu penceresi acilamadi. Tarayici modunda calistirmak ve hatayi gormek icin start.bat dosyasini acin.", 0, "BRQ Transfer", 48
ElseIf ExitCode <> 0 Then
    WshShell.Popup "BRQ Transfer baslatilamadi. Node.js 22.12+ kurulumunu kontrol edin ve ayrinti icin start.bat dosyasini acin.", 0, "BRQ Transfer", 16
End If
