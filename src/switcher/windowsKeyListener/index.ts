/**
 * the keyborad listener is only for listening CTRL release event
 */
import { Worker } from 'worker_threads';
import * as path from 'path';

export const onCtrlReleaseListener = (callback: () => void): (() => void) => {
    try {
        const workerPath = path.join(__dirname, 'worker.js');
        const worker = new Worker(workerPath);

        worker.on('message', (msg) => {
            if (msg === true) {
                callback();
            }
        });

        worker.on('error', (err) => {
            console.warn('[kb-worker] error:', err);
        });

        return () => {
            // 直接终止 Worker，底层线程死亡会自动移除全局键盘 Hook
            console.log('[kb-worker] terminating worker');
            worker.terminate();
        };
    } catch (error) {
        console.warn('[kb-worker] worker start error:', error);
        return () => {}; // 发生错误时返回空函数以保持返回类型一致
    }
};
