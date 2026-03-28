import koffi from 'koffi';
import { parentPort } from 'worker_threads';

const startWindowsKeyboardListener = (): void => {
    if (process.platform !== 'win32') {
        return undefined;
    }

    const user32 = koffi.load('user32.dll');
    const kernel32 = koffi.load('kernel32.dll');

    koffi.struct('KBDLLHOOKSTRUCT', {
        vkCode: 'uint32',
        scanCode: 'uint32',
        flags: 'uint32',
        time: 'uint32',
        dwExtraInfo: 'uintptr'
    });

    const HookProc = koffi.proto('long __stdcall HookProc(int nCode, uintptr wParam, void* lParam)');
    // 3. 绑定系统 API
    const SetWindowsHookEx = user32.func('void* __stdcall SetWindowsHookExA(int idHook, HookProc* lpfn, void* hMod, uint32 dwThreadId)');
    const CallNextHookEx = user32.func('long __stdcall CallNextHookEx(void* hhk, int nCode, uintptr wParam, void* lParam)');
    const GetMessage = user32.func('int __stdcall GetMessageA(void* lpMsg, void* hWnd, uint wMsgFilterMin, uint wMsgFilterMax)');
    const GetModuleHandle = kernel32.func('void* __stdcall GetModuleHandleA(const char* lpModuleName)');

    // 常量
    const WH_KEYBOARD = 13; // lowlevel keyboard hook
    // const WH_KEYBOARD = 2; // standard keyboard hook
    // const WM_KEYDOWN = 0x0100;
    const WM_KEYUP = 0x0101;
    let hHook: any = null;

    const hookCallback = koffi.register(
        (nCode: number, wParam: number, lParam: any) => {
            if (nCode >= 0 && wParam === WM_KEYUP) {
                const kb = koffi.decode(lParam, 'KBDLLHOOKSTRUCT');
                // only report left ctrl event
                if (kb.vkCode === 162) {
                    parentPort?.postMessage(true);
                }
            }
            // 将事件传递给下一个钩子（必须）
            return CallNextHookEx(hHook, nCode, wParam, lParam);
        },
        koffi.pointer(HookProc)
    );

    // set global hook
    const hMod = GetModuleHandle(null);
    hHook = SetWindowsHookEx(WH_KEYBOARD, hookCallback, hMod, 0);    

    console.log('[kb-worker] keyboard hook installed');
    const msg = Buffer.alloc(64);
    // 阻塞维持系统消息队列。我们不需要在此处手动监听和退出，
    // 当主线程调用 worker.terminate()，该底层线程就会死亡，Windows 会自动帮你销毁和卸载 hHook。
    while (GetMessage(msg, null, 0, 0) > 0) { }

};

startWindowsKeyboardListener();