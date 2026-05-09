(function () {
    // --- Breadcrumbs ---
    var parts = CURRENT_PATH.split('/').filter(Boolean);
    var bc = document.getElementById('breadcrumbs');
    var tree = FILETREE['~'];
    var urls = ['/'];
    var node = tree;
    for (var i = 1; i < parts.length; i++) {
        if (node.children && node.children[parts[i]]) {
            node = node.children[parts[i]];
            urls.push(node.url || null);
        } else {
            urls.push(null);
        }
    }
    var isMobile = window.innerWidth <= 600;

    function renderBreadcrumbs(startIndex, ellipsisUrl) {
        while (bc.firstChild) bc.removeChild(bc.firstChild);

        // Desktop: always show root
        if (!isMobile && startIndex > 0) {
            var rootLink = document.createElement('a');
            rootLink.href = urls[0] || '/';
            rootLink.textContent = parts[0];
            bc.appendChild(rootLink);

            var sep = document.createElement('span');
            sep.className = 'sep';
            sep.textContent = ' / ';
            bc.appendChild(sep);
        }

        // Ellipsis if we're skipping segments
        if (ellipsisUrl) {
            var ellipsis = document.createElement('a');
            ellipsis.href = ellipsisUrl;
            ellipsis.textContent = '...';
            bc.appendChild(ellipsis);

            var sep = document.createElement('span');
            sep.className = 'sep';
            sep.textContent = ' / ';
            bc.appendChild(sep);
        }

        // Visible segments
        for (var i = startIndex; i < parts.length; i++) {
            if (i > startIndex) {
                var sep = document.createElement('span');
                sep.className = 'sep';
                sep.textContent = ' / ';
                bc.appendChild(sep);
            }
            if (i === parts.length - 1) {
                bc.appendChild(document.createTextNode(parts[i]));
            } else {
                var a = document.createElement('a');
                a.href = urls[i] || '/';
                a.textContent = parts[i];
                bc.appendChild(a);
            }
        }
    }

    // Start with all segments, then truncate until it fits
    // Desktop starts at 1 (root rendered separately), mobile at 0
    var startIndex = isMobile ? 0 : 1;
    renderBreadcrumbs(startIndex, null);

    while (bc.scrollWidth > bc.clientWidth && startIndex < parts.length - 1) {
        startIndex++;
        var ellipsisUrl = urls[startIndex - 1] || '/';
        renderBreadcrumbs(startIndex, ellipsisUrl);
    }

    // --- Shell input focus & autocomplete tap ---
    var shellInput = document.getElementById('shell-input');
    if (window.matchMedia('(pointer: fine)').matches) {
        shellInput.focus({ preventScroll: true });
        document.addEventListener('click', function (e) {
            if (!e.target.closest('a, button, input, .theme-picker')) {
                shellInput.focus({ preventScroll: true });
            }
        });
    } else {
        document.addEventListener('click', function (e) {
            if (e.target.closest('a, button, input, .theme-picker')) return;
            var hint = document.getElementById('shell-hint');
            if (hint && hint.textContent) {
                shellInput.value = hint.textContent;
                hint.textContent = '';
                shellInput.dispatchEvent(new Event('input'));
            }
        });
    }

    // --- Blinking cursor ---
    var cursor = document.getElementById('shell-cursor');
    var measure = document.createElement('span');
    measure.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font:inherit;font-size:0.85rem;';
    document.body.appendChild(measure);

    function updateCursor() {
        measure.textContent = shellInput.value.substring(0, shellInput.selectionStart) || '';
        cursor.style.left = measure.offsetWidth + 'px';
    }

    shellInput.addEventListener('input', updateCursor);
    shellInput.addEventListener('keyup', updateCursor);
    shellInput.addEventListener('click', updateCursor);
    shellInput.addEventListener('focus', function () { cursor.style.display = ''; updateCursor(); });
    shellInput.addEventListener('blur', function () { cursor.style.display = 'none'; });
    updateCursor();

    // --- Search overlay ---
    var searchShortcut = document.getElementById('search-shortcut');
    if (searchShortcut) {
        searchShortcut.textContent = navigator.platform.indexOf('Mac') > -1 ? '⌘K' : 'Ctrl+K';
        searchShortcut.addEventListener('click', openSearch);
    }
    var searchBtn = document.getElementById('search-btn');
    var searchOverlay = document.getElementById('search-overlay');
    var searchInput = document.getElementById('search-input');
    var searchResults = document.getElementById('search-results');
    var searchTimeout = null;
    var activeIndex = -1;

    function openSearch() {
        searchOverlay.classList.add('open');
        searchInput.value = '';
        searchResults.textContent = '';
        activeIndex = -1;
        searchInput.focus();
    }

    function closeSearch() {
        searchOverlay.classList.remove('open');
        searchInput.value = '';
        searchResults.textContent = '';
    }

    function updateActive() {
        var items = searchResults.querySelectorAll('.search-result');
        items.forEach(function (el, i) {
            el.classList.toggle('active', i === activeIndex);
        });
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', openSearch);
    }

    // Ctrl+K / Cmd+K shortcut
    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            if (searchOverlay.classList.contains('open')) {
                closeSearch();
            } else {
                openSearch();
            }
        }
    });

    searchOverlay.addEventListener('click', function (e) {
        if (e.target === searchOverlay) closeSearch();
    });

    searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeSearch();
            return;
        }
        var items = searchResults.querySelectorAll('.search-result');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = Math.min(activeIndex + 1, items.length - 1);
            updateActive();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = Math.max(activeIndex - 1, 0);
            updateActive();
        } else if (e.key === 'Enter' && activeIndex >= 0 && items[activeIndex]) {
            e.preventDefault();
            window.location.href = items[activeIndex].href;
        }
    });

    searchInput.addEventListener('input', function () {
        var query = searchInput.value.trim();
        if (!query) {
            searchResults.textContent = '';
            activeIndex = -1;
            return;
        }
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async function () {
            try {
                if (!window._pagefind) {
                    window._pagefind = await import('/pagefind/pagefind.js');
                }
                var search = await window._pagefind.search(query);
                searchResults.textContent = '';

                if (search.results.length === 0) {
                    activeIndex = -1;
                    var empty = document.createElement('div');
                    empty.className = 'search-results-empty';
                    empty.textContent = 'no results for "' + query + '"';
                    searchResults.appendChild(empty);
                    return;
                }

                var results = await Promise.all(
                    search.results.slice(0, 8).map(function (r) { return r.data(); })
                );

                results.forEach(function (data) {
                    var link = document.createElement('a');
                    link.className = 'search-result';
                    link.href = data.url;

                    var titleDiv = document.createElement('div');
                    titleDiv.className = 'search-result-title';
                    var icon = document.createElement('i');
                    icon.className = 'fa-brands fa-markdown';
                    titleDiv.appendChild(icon);
                    titleDiv.appendChild(document.createTextNode(data.meta.title || data.url));
                    link.appendChild(titleDiv);

                    if (data.excerpt) {
                        var excerptDiv = document.createElement('div');
                        excerptDiv.className = 'search-result-excerpt';
                        var template = document.createElement('template');
                        template.innerHTML = data.excerpt;
                        excerptDiv.appendChild(template.content.cloneNode(true));
                        link.appendChild(excerptDiv);
                    }

                    searchResults.appendChild(link);
                });
                if (activeIndex < 0) {
                    activeIndex = 0;
                } else if (activeIndex >= results.length) {
                    activeIndex = results.length - 1;
                }
                updateActive();
            } catch (e) {
                searchResults.textContent = '';
                var err = document.createElement('div');
                err.className = 'search-results-empty';
                err.textContent = 'search unavailable';
                searchResults.appendChild(err);
            }
        }, 150);
    });

    // --- Code block copy buttons ---
    document.querySelectorAll('.post-content pre').forEach(function (pre) {
        var btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.textContent = 'copy';
        btn.addEventListener('click', function () {
            var code = pre.querySelector('code');
            var text = (code || pre).textContent;
            navigator.clipboard.writeText(text).then(function () {
                btn.textContent = 'copied!';
                setTimeout(function () { btn.textContent = 'copy'; }, 1500);
            });
        });
        pre.appendChild(btn);
    });

    // --- Prompt path ---
    var pp = CURRENT_PATH;
    if (pp.endsWith('.md')) {
        pp = pp.substring(0, pp.lastIndexOf('/'));
    }
    document.getElementById('prompt-path').textContent = pp;

    // --- Reading progress & mobile header hide/show ---
    var isMobilePage = window.innerWidth <= 600;
    var progressBar = document.getElementById('reading-progress');
    var hasContent = !!document.querySelector('.post-content');
    var chrome = document.querySelector('.terminal-chrome');
    var scroller = isMobilePage ? document.querySelector('.terminal') : document.querySelector('.terminal-body');
    var lastScrollTop = 0;

    if (scroller) {
        scroller.addEventListener('scroll', function () {
            var st = scroller.scrollTop;
            var scrollHeight = scroller.scrollHeight - scroller.clientHeight;

            // Reading progress (only on content pages)
            if (hasContent && progressBar && scrollHeight > 0) {
                var progress = Math.min((st / scrollHeight) * 100, 100);
                progressBar.style.width = progress + '%';
            }

            // Mobile header hide/show
            if (isMobilePage && chrome) {
                if (st > lastScrollTop && st > chrome.offsetHeight) {
                    chrome.classList.add('chrome-hidden');
                } else if (st < lastScrollTop) {
                    chrome.classList.remove('chrome-hidden');
                }
            }

            lastScrollTop = st;
        }, { passive: true });
    }

    // --- Mobile swipe for prev/next episode ---
    if (isMobilePage) {
        var touchStartX = 0;
        var touchStartY = 0;
        var terminalBody = document.querySelector('.terminal-body');

        if (terminalBody) {
            terminalBody.addEventListener('touchstart', function (e) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }, { passive: true });

            terminalBody.addEventListener('touchend', function (e) {
                var dx = e.changedTouches[0].clientX - touchStartX;
                var dy = e.changedTouches[0].clientY - touchStartY;

                // Only trigger on horizontal swipes (not vertical scrolling)
                if (Math.abs(dx) < 80 || Math.abs(dy) > Math.abs(dx)) return;

                var backLink = document.querySelector('.back-link');
                if (!backLink) return;

                if (dx > 0) {
                    // Swipe right → previous episode
                    var prev = backLink.querySelector('a[href*="cat "]') || backLink.querySelector('a:nth-child(2)');
                    if (prev && prev.textContent.indexOf('←') > -1 && prev.textContent.indexOf('cat') > -1) {
                        window.location.href = prev.href;
                    }
                } else {
                    // Swipe left → next episode
                    var links = backLink.querySelectorAll('a');
                    for (var i = 0; i < links.length; i++) {
                        if (links[i].textContent.indexOf('→') > -1) {
                            window.location.href = links[i].href;
                            break;
                        }
                    }
                }
            }, { passive: true });
        }
    }
})();
