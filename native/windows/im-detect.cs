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
                    IntPtr imeWnd = ImmGetDefaultIMEWnd(hwnd);
                    if (imeWnd != IntPtr.Zero)
                    {
                        int conversionMode = (int)SendMessage(imeWnd, WM_IME_CONTROL,
                            (IntPtr)IMC_GETCONVERSIONMODE, IntPtr.Zero);

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
