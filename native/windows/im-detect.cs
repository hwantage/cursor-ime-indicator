using System;
using System.Runtime.InteropServices;
using System.Globalization;
using System.Threading;

class ImDetect
{
    [DllImport("user32.dll")]
    static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("user32.dll")]
    static extern IntPtr GetKeyboardLayout(uint idThread);

    [DllImport("imm32.dll")]
    static extern IntPtr ImmGetDefaultIMEWnd(IntPtr hWnd);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [StructLayout(LayoutKind.Sequential)]
    struct RECT
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct GUITHREADINFO
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
    static extern bool GetGUIThreadInfo(uint idThread, ref GUITHREADINFO lpgui);

    const uint WM_IME_CONTROL = 0x0283;
    const int IMC_GETCONVERSIONMODE = 0x0001;
    const int IME_CMODE_NATIVE = 0x0001;
    const int IME_CMODE_KATAKANA = 0x0002;

    static void Main()
    {
        string lastOutput = "";

        while (true)
        {
            try
            {
                IntPtr hwnd = GetForegroundWindow();
                uint processId;
                uint threadId = GetWindowThreadProcessId(hwnd, out processId);
                IntPtr hkl = GetKeyboardLayout(threadId);

                int lcid = (int)hkl & 0xFFFF;
                CultureInfo ci = CultureInfo.GetCultureInfo(lcid);
                string cultureName = ci.Name;
                string output = cultureName;

                // For CJK IMEs, check conversion mode to detect 한/영 toggle etc.
                if (cultureName.StartsWith("ko") || cultureName.StartsWith("ja") || cultureName.StartsWith("zh"))
                {
                    IntPtr targetHwnd = hwnd;
                    GUITHREADINFO gui = new GUITHREADINFO();
                    gui.cbSize = Marshal.SizeOf(gui);
                    if (GetGUIThreadInfo(threadId, ref gui))
                    {
                        if (gui.hwndFocus != IntPtr.Zero)
                        {
                            targetHwnd = gui.hwndFocus;
                        }
                    }

                    IntPtr imeWnd = ImmGetDefaultIMEWnd(targetHwnd);
                    if (imeWnd == IntPtr.Zero && targetHwnd != hwnd)
                    {
                        imeWnd = ImmGetDefaultIMEWnd(hwnd);
                    }

                    // If we still don't have an IME window, some apps respond if we send directly to the focused window.
                    // But usually IMC_GETCONVERSIONMODE requires the IME window.
                    IntPtr handleToUse = (imeWnd != IntPtr.Zero) ? imeWnd : targetHwnd;

                    if (handleToUse != IntPtr.Zero)
                    {
                        int conversionMode = (int)SendMessage(handleToUse, WM_IME_CONTROL,
                            (IntPtr)IMC_GETCONVERSIONMODE, IntPtr.Zero);

                        // If SendMessage failed or returned 0, it might mean alphanumeric mode (0x0).
                        // In some cases, it might return -1 on error depending on how the window handles it.
                        bool isNative = (conversionMode & IME_CMODE_NATIVE) != 0;
                        if (!isNative)
                        {
                            // IME is in alphanumeric (English) mode
                            output = "en-US";
                        }
                        else if (cultureName.StartsWith("ja"))
                        {
                            bool isKatakana = (conversionMode & IME_CMODE_KATAKANA) != 0;
                            output = isKatakana ? "ja-Katakana" : cultureName;
                        }
                    }
                }

                if (output != lastOutput)
                {
                    lastOutput = output;
                    Console.WriteLine(output);
                    Console.Out.Flush();
                }
            }
            catch
            {
                // Ignore errors and continue polling
            }

            Thread.Sleep(30);
        }
    }
}
