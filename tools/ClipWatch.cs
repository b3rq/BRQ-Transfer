using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
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
    private int retryCount;
    private readonly Timer retryTimer = new Timer { Interval = 40 };

    public ClipboardListener() {
        this.WindowState = FormWindowState.Minimized;
        this.ShowInTaskbar = false;
        if (!AddClipboardFormatListener(this.Handle)) throw new InvalidOperationException("Clipboard listener unavailable");
        retryTimer.Tick += (sender, args) => { retryTimer.Stop(); CheckClipboard(); };
    }

    private void CheckClipboard() {
        try {
            if (Clipboard.ContainsText()) {
                string text = Clipboard.GetText();
                if (!string.IsNullOrEmpty(text) && text != lastText) {
                    lastText = text;
                    Console.WriteLine("CLIP:" + Convert.ToBase64String(Encoding.UTF8.GetBytes(text)));
                    Console.Out.Flush();
                }
            }
            retryCount = 0;
        } catch {
            if (++retryCount < 5) retryTimer.Start();
            else Console.Error.WriteLine("ERROR:CLIPBOARD_BUSY");
        }
    }

    protected override void WndProc(ref Message m) {
        if (m.Msg == WM_CLIPBOARDUPDATE) {
            retryCount = 0;
            retryTimer.Stop();
            CheckClipboard();
        }
        base.WndProc(ref m);
    }

    protected override void Dispose(bool disposing) {
        if (disposing) retryTimer.Dispose();
        try {
            RemoveClipboardFormatListener(this.Handle);
        } catch {}
        base.Dispose(disposing);
    }

    [STAThread]
    static void Main() {
        Console.OutputEncoding = Encoding.UTF8;
        try { Application.Run(new ClipboardListener()); }
        catch { Console.Error.WriteLine("ERROR:CLIPBOARD_LISTENER"); Environment.ExitCode = 1; }
    }
}
