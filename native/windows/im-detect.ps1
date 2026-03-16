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
            IntPtr imeWnd = ImmGetDefaultIMEWnd(hwnd);
            if (imeWnd != IntPtr.Zero)
            {
                int mode = (int)SendMessage(imeWnd, 0x0283u, (IntPtr)1, IntPtr.Zero);
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
