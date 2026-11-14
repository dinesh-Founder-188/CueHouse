(function () {
    function stabilizeLiveChatPosition() {
        // LiveChat measures its greeting at full chat-window size, then shrinks
        // the fixed container. Bottom/right anchoring moves its layout origin
        // on every measurement (large post-load CLS, even with no page reflow).
        // Keep that origin fixed and preserve the same visible bottom/right
        // alignment with a translation. Do not change chat sizes or visibility.
        var style = document.createElement('style')
        style.textContent = '@supports (translate: 0 0) { #chat-widget-container.rdt-chat-anchored {' +
            'left:100%!important;top:100%!important;right:auto!important;bottom:auto!important;' +
            'translate:calc(-100% - var(--rdt-chat-right, 0px)) calc(-100% - var(--rdt-chat-bottom, 0px))!important;' +
            '} }'
        document.head.appendChild(style)

        function attach() {
            var container = document.getElementById('chat-widget-container')
            if (!container) return false

            var minimizedFrame = null
            var frameDocument = null
            var frameObserver = null

            function anchorGreeting() {
                // The minimized greeting is a same-origin about:blank iframe.
                // Its bottom/right-positioned root otherwise shifts whenever
                // LiveChat resizes the iframe for measurement. CrUX includes
                // these subframe shifts even when a page observer cannot.
                var nextDocument
                try {
                    nextDocument = minimizedFrame && minimizedFrame.contentDocument
                } catch (error) {
                    return // Leave any future cross-origin widget untouched.
                }
                if (!nextDocument || nextDocument === frameDocument) return
                if (frameObserver) frameObserver.disconnect()
                frameDocument = nextDocument

                function ensureFrameStyle() {
                    if (!frameDocument.documentElement || frameDocument.getElementById('rdt-chat-position')) return
                    var frameStyle = frameDocument.createElement('style')
                    frameStyle.id = 'rdt-chat-position'
                    frameStyle.textContent = '@supports (translate: 0 0) { body > [role="main"][data-lc-id="0"] {' +
                        'left:0!important;top:0!important;right:auto!important;bottom:auto!important;' +
                        'translate:calc(100vw - 100%) calc(100vh - 100%)!important;' +
                        '} }'
                    ;(frameDocument.head || frameDocument.documentElement).appendChild(frameStyle)
                }

                ensureFrameStyle()
                // Reapply if the vendor replaces the blank document's content.
                frameObserver = new MutationObserver(ensureFrameStyle)
                frameObserver.observe(frameDocument, { childList: true, subtree: true })
            }

            function watchGreeting() {
                var frame = container.querySelector('#chat-widget-minimized')
                if (!frame || frame === minimizedFrame) return
                if (minimizedFrame) minimizedFrame.removeEventListener('load', anchorGreeting)
                minimizedFrame = frame
                frame.addEventListener('load', anchorGreeting)
                anchorGreeting()
            }

            function syncOffsets() {
                // Read the vendor's INLINE offsets, not our computed overrides.
                // Only write changed values so our style observer cannot loop.
                var right = container.style.right
                var bottom = container.style.bottom
                var rightAnchored = right && right !== 'auto' && bottom && bottom !== 'auto'

                if (rightAnchored) {
                    if (container.style.getPropertyValue('--rdt-chat-right') !== right) {
                        container.style.setProperty('--rdt-chat-right', right)
                    }
                    if (container.style.getPropertyValue('--rdt-chat-bottom') !== bottom) {
                        container.style.setProperty('--rdt-chat-bottom', bottom)
                    }
                }
                container.classList.toggle('rdt-chat-anchored', Boolean(rightAnchored))
            }

            syncOffsets()
            new MutationObserver(syncOffsets).observe(container, {
                attributes: true,
                attributeFilter: ['style']
            })
            watchGreeting()
            new MutationObserver(watchGreeting).observe(container, { childList: true })
            return true
        }

        if (attach()) return
        var insertionObserver = new MutationObserver(function () {
            if (attach()) insertionObserver.disconnect()
        })
        insertionObserver.observe(document.body, { childList: true, subtree: true })
    }

    function initializeNewsletter() {
        var form = document.querySelector('#newsletterSignupForm')
        var message = document.querySelector('#newsletterMessage')

        if (!form || !message || form.dataset.initialized === 'true') return
        form.dataset.initialized = 'true'

        form.addEventListener('submit', async function (event) {
            event.preventDefault()
            if (!form.reportValidity()) return

            var submitButton = form.querySelector('[type="submit"]')
            if (submitButton) submitButton.disabled = true

            try {
                var response = await fetch(form.action, {
                    method: 'POST',
                    body: new FormData(form),
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                })
                var payload = await response.json().catch(function () { return {} })

                message.textContent = payload.message || (response.ok
                    ? 'Thank you for subscribing!'
                    : 'Something went wrong!')
                message.style.color = response.ok ? 'white' : '#ffb4ab'

                if (response.ok) form.reset()
            } catch (error) {
                message.textContent = 'Something went wrong!'
                message.style.color = '#ffb4ab'
            } finally {
                if (submitButton) submitButton.disabled = false
            }
        })
    }

    function scheduleLiveChat() {
        if (window.__rdtLiveChatScheduled) return
        window.__rdtLiveChatScheduled = true
        stabilizeLiveChatPosition()

        var loaded = false
        var load = function () {
            if (loaded) return
            loaded = true
            window.__lc = window.__lc || {}
            window.__lc.license = 6950811

            var script = document.createElement('script')
            script.async = true
            script.src = 'https://cdn.livechatinc.com/tracking.js'
            document.head.appendChild(script)
        }

        ;['pointerdown', 'keydown', 'touchstart'].forEach(function (eventName) {
            window.addEventListener(eventName, load, { once: true, passive: true })
        })

        window.addEventListener('load', function () {
            if ('requestIdleCallback' in window) {
                window.requestIdleCallback(load, { timeout: 5000 })
            } else {
                window.setTimeout(load, 3000)
            }
        }, { once: true })
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeNewsletter, { once: true })
    } else {
        initializeNewsletter()
    }

    scheduleLiveChat()
})()
