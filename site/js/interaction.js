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

    // --- Prompt path ---
    var pp = CURRENT_PATH;
    if (pp.endsWith('.md')) {
        pp = pp.substring(0, pp.lastIndexOf('/'));
    }
    document.getElementById('prompt-path').textContent = pp;

    // --- Mobile header hide/show on scroll ---
    if (window.innerWidth <= 600) {
        var chrome = document.querySelector('.terminal-chrome');
        var scroller = document.querySelector('.terminal');
        var lastScrollTop = 0;

        scroller.addEventListener('scroll', function () {
            var st = scroller.scrollTop;
            if (st > lastScrollTop && st > chrome.offsetHeight) {
                chrome.classList.add('chrome-hidden');
            } else if (st < lastScrollTop) {
                chrome.classList.remove('chrome-hidden');
            }
            lastScrollTop = st;
        }, { passive: true });
    }
})();
