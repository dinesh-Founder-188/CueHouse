(function () {
    'use strict';

    let observer;
    const visibleVideos = new Set();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = window.matchMedia('(min-width: 768px)');

    function getVideoSource(video) {
        return video.dataset.homeVideoSrc || video.dataset.videoSrc || '';
    }

    function mayAutoplay(video) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

        return video.dataset.videoAutoplay === 'true'
            && !reduceMotion.matches
            && !connection?.saveData;
    }

    function playVideo(video) {
        if (!mayAutoplay(video) || document.hidden || video.dataset.videoVisible !== 'true') {
            return;
        }

        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.then(function () {
                video.closest('.hero__background')?.classList.add('has-playing-video');
                video.closest('.homeVideoReviews__slide')?.classList.add('has-playing-video');
            }).catch(function () {});
        }
    }

    function loadVideo(video) {
        if (video.dataset.videoLoaded === 'true') {
            playVideo(video);
            return;
        }

        const source = getVideoSource(video);
        if (!source) {
            return;
        }

        video.muted = true;
        video.playsInline = true;
        video.preload = 'metadata';
        video.src = source;
        video.dataset.videoLoaded = 'true';
        video.removeAttribute('data-home-video-src');
        video.removeAttribute('data-video-src');
        video.addEventListener('canplay', function () {
            playVideo(video);
        }, { once: true });
        video.load();
        playVideo(video);
    }

    function setVisibility(video, isVisible) {
        video.dataset.videoVisible = isVisible ? 'true' : 'false';

        if (isVisible) {
            visibleVideos.add(video);
            loadVideo(video);
        } else {
            visibleVideos.delete(video);
            if (!video.paused) {
                video.pause();
            }
        }
    }

    function initHomepageVideos() {
        observer?.disconnect();
        visibleVideos.clear();

        const videos = Array.from(document.querySelectorAll('video[data-home-video-src], video[data-video-src]'))
            .filter(function (video) {
                return video.dataset.videoDesktopOnly !== 'true' || desktop.matches;
            });

        if (!videos.length) {
            return;
        }

        const afterLcpVideos = videos.filter(function (video) {
            return video.dataset.videoAfterLcp === 'true';
        });
        const deferredVideos = videos.filter(function (video) {
            return video.dataset.videoAfterLcp !== 'true';
        });

        const loadAfterCriticalRendering = function () {
            const start = function () {
                afterLcpVideos.forEach(function (video) {
                    setVisibility(video, true);
                });
            };

            if ('requestIdleCallback' in window) {
                window.requestIdleCallback(start, { timeout: 2500 });
            } else {
                window.setTimeout(start, 1500);
            }
        };

        if (document.readyState === 'complete') {
            loadAfterCriticalRendering();
        } else {
            window.addEventListener('load', loadAfterCriticalRendering, { once: true });
        }

        ['pointerdown', 'keydown'].forEach(function (eventName) {
            window.addEventListener(eventName, loadAfterCriticalRendering, { once: true, passive: true });
        });

        if (!('IntersectionObserver' in window)) {
            deferredVideos.forEach(function (video) {
                setVisibility(video, true);
            });
            return;
        }

        observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                setVisibility(entry.target, entry.isIntersecting);
            });
        }, {
            rootMargin: '250px 0px',
            threshold: 0.01,
        });

        deferredVideos.forEach(function (video) {
            observer.observe(video);
        });
    }

    function initArticleVideoControls() {
        document.querySelectorAll('.articleVideo').forEach(function (articleVideo) {
            const cover = articleVideo.querySelector('.articleVideo__cover');
            if (!cover || cover.dataset.videoControlReady === 'true') {
                return;
            }

            cover.dataset.videoControlReady = 'true';
            const iframe = articleVideo.querySelector('iframe');
            const video = articleVideo.querySelector('video');

            cover.addEventListener('click', function () {
                if (iframe) {
                    const separator = iframe.src.includes('?') ? '&' : '?';
                    iframe.src = iframe.src + separator + 'autoplay=1';
                } else if (video) {
                    video.dataset.videoVisible = 'true';
                    loadVideo(video);
                    const playPromise = video.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(function () {});
                    }
                }

                cover.classList.add('hidden');
            });
        });
    }

    function initVideos() {
        initHomepageVideos();
        initArticleVideoControls();
    }

    document.addEventListener('visibilitychange', function () {
        visibleVideos.forEach(function (video) {
            if (document.hidden) {
                video.pause();
            } else {
                playVideo(video);
            }
        });
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initVideos, { once: true });
    } else {
        initVideos();
    }
})();
