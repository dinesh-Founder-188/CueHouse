/* Mirrored in frontend and backend: bounded, boolean-only typing signals. */
(function () {
    'use strict';
    window.RedDotChatTyping = function ({input, canType, identity, send}) {
        let desired = false, sent = false, busy = false, last = 0, retryAt = 0, key, idleTimer, sendTimer;
        async function flush() {
            clearTimeout(sendTimer);
            if (busy) return;
            const currentKey = identity();
            if (currentKey !== key) { key = currentKey; sent = false; last = 0; }
            if (!key) return;
            const value = desired && canType();
            if (!value && !sent) return;
            const delay = Math.max(0, retryAt - Date.now(), value && sent ? 2500 - (Date.now() - last) : 0);
            if (delay) { sendTimer = setTimeout(flush, delay); return; }
            busy = true; sent = value; last = Date.now();
            try { await send(value, currentKey); retryAt = 0; }
            catch (_) { retryAt = Date.now() + 5000; } // Typing failures must not block sending.
            finally { busy = false; if (desired !== value || identity() !== currentKey) flush(); }
        }
        function stop() { desired = false; clearTimeout(idleTimer); flush(); }
        input.addEventListener('input', () => {
            desired = canType() && !!input.value.trim();
            clearTimeout(idleTimer);
            if (desired) idleTimer = setTimeout(stop, 3500);
            flush();
        });
        input.addEventListener('blur', stop);
        document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
        return {stop};
    };
})();
