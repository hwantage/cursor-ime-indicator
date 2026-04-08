Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Globalization;

public class IMEDetector
{
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("user32.dll")]
    public static extern IntPtr GetKeyboardLayout(uint idThread);

    [DllImport("imm32.dll")]
    public static extern IntPtr ImmGetDefaultIMEWnd(IntPtr hWnd);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct GUITHREADINFO
    {
        public int cbSize;
        public int flags;
        public IntPtr hwndActive;
        public IntPtr hwndFocus;
        public IntPtr hwndCapture;
        public IntPtr hwndMenuOwner;
        public IntPtr hwndMoveSize;
        public IntPtr hwndCaret;
        public RECT rcCaret;
    }

    [DllImport("user32.dll")]
    public static extern bool GetGUIThreadInfo(uint idThread, ref GUITHREADINFO lpgui);

    public static string Detect()
    {
        IntPtr hwnd = GetForegroundWindow();
        uint processId;
        uint threadId = GetWindowThreadProcessId(hwnd, out processId);
        IntPtr hkl = GetKeyboardLayout(threadId);

        int lcid = (int)hkl & 0xFFFF;
        string cultureName = CultureInfo.GetCultureInfo(lcid).Name;

        if (cultureName.StartsWith("ko") || cultureName.StartsWith("ja") || cultureName.StartsWith("zh"))
        {
            IntPtr targetHwnd = hwnd;
            GUITHREADINFO gui = new GUITHREADINFO();
            gui.cbSize = Marshal.SizeOf(gui);
            if (GetGUIThreadInfo(threadId, ref gui))
            {
                if (gui.hwndFocus != IntPtr.Zero) targetHwnd = gui.hwndFocus;
            }

            IntPtr imeWnd = ImmGetDefaultIMEWnd(targetHwnd);
            if (imeWnd == IntPtr.Zero && targetHwnd != hwnd)
            {
                imeWnd = ImmGetDefaultIMEWnd(hwnd);
            }

            IntPtr handleToUse = (imeWnd != IntPtr.Zero) ? imeWnd : targetHwnd;

            if (handleToUse != IntPtr.Zero)
            {
                int mode = (int)SendMessage(handleToUse, 0x0283u, (IntPtr)1, IntPtr.Zero);
                if ((mode & 1) == 0) return "en-US";
            }
        }
        return cultureName;
    }
}
"@

$last = ""
while ($true) {
    $cur = [IMEDetector]::Detect()
    if ($cur -ne $last) {
        $last = $cur
        Write-Output $cur
        [Console]::Out.Flush()
    }
    Start-Sleep -Milliseconds 300
}
