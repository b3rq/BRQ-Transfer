using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;

class ClipboardListener : Form {
    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    static extern bool AddClipboardFormatListener(IntPtr hwnd);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    static extern bool RemoveClipboardFormatListener(IntPtr hwnd);

    const int WM_CLIPBOARDUPDATE = 0x031D;
    private string lastText = "";

    public ClipboardListener() {
        this.WindowState = FormWindowState.Minimized;
        this.ShowInTaskbar = false;
        AddClipboardFormatListener(this.Handle);
    }

    private void CheckClipboard() {
        for (int i = 0; i < 5; i++) {
            try {
                if (Clipboard.ContainsText()) {
                    string text = Clipboard.GetText();
                    if (!string.IsNullOrEmpty(text) && text != lastText) {
                        lastText = text;
                        string b64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(text));
                        Console.WriteLine("CLIP:" + b64);
                        Console.Out.Flush();
                    }
                }
                break;
            } catch {
                Thread.Sleep(40);
            }
        }
    }

    protected override void WndProc(ref Message m) {
        if (m.Msg == WM_CLIPBOARDUPDATE) {
            CheckClipboard();
        }
        base.WndProc(ref m);
    }

    protected override void Dispose(bool disposing) {
        try {
            RemoveClipboardFormatListener(this.Handle);
        } catch {}
        base.Dispose(disposing);
    }

    [STAThread]
    static void Main() {
        Console.OutputEncoding = Encoding.UTF8;
        Application.Run(new ClipboardListener());
    }
}
