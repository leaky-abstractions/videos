(function () {
    var input = document.getElementById('shell-input');
    var hint = document.getElementById('shell-hint');
    if (!input || typeof FILETREE === 'undefined') return;

    function resolveNode(path) {
        var parts = path.replace(/^~\/?/, '').split('/').filter(Boolean);
        var node = FILETREE['~'];
        for (var i = 0; i < parts.length; i++) {
            if (!node.children || !node.children[parts[i]]) return null;
            node = node.children[parts[i]];
        }
        return node;
    }

    // Resolve a relative or absolute path from the current directory
    function resolvePath(input) {
        var parts;
        if (input.startsWith('~/') || input === '~') {
            parts = input.replace(/^~\/?/, '').split('/').filter(Boolean);
        } else {
            var base = getCurrentDir().replace(/^~\/?/, '').split('/').filter(Boolean);
            var segments = input.split('/').filter(Boolean);
            parts = base.slice();
            for (var i = 0; i < segments.length; i++) {
                if (segments[i] === '..') {
                    parts.pop();
                } else if (segments[i] !== '.') {
                    parts.push(segments[i]);
                }
            }
        }
        var node = FILETREE['~'];
        for (var i = 0; i < parts.length; i++) {
            if (!node.children || !node.children[parts[i]]) return null;
            node = node.children[parts[i]];
        }
        return node;
    }

    function getCurrentDir() {
        var p = CURRENT_PATH;
        if (p.endsWith('.md')) {
            p = p.substring(0, p.lastIndexOf('/'));
        }
        return p;
    }

    function getCurrentNode() {
        return resolveNode(getCurrentDir());
    }

    function getParentPath() {
        var dir = getCurrentDir();
        var parts = dir.split('/').filter(Boolean);
        if (parts.length <= 1) return '~';
        parts.pop();
        return parts.join('/');
    }

    function urlToVirtualPath(url) {
        var normalized = url.replace(/\/$/, '') || '/';
        var result = null;
        function walk(node, vpath) {
            var nodeUrl = (node.url || '').replace(/\/$/, '') || '/';
            if (nodeUrl === normalized) result = vpath;
            if (node.children) {
                for (var name in node.children) {
                    walk(node.children[name], vpath + '/' + name);
                }
            }
        }
        walk(FILETREE['~'], '~');
        return result;
    }

    function getIcon(child, name) {
        if (child.icon) return child.icon;
        if (child.type === 'dir') return 'fa-solid fa-folder';
        if (child.type === 'symlink') return 'fa-solid fa-folder';
        if (name.endsWith('.md')) return 'fa-brands fa-markdown';
        return 'fa-solid fa-file-lines';
    }

    function makeEntry(name, child, tag) {
        var suffix = (child.type === 'dir' || child.type === 'symlink') && !name.endsWith('/') ? '/' : '';
        var el = document.createElement(child.url ? 'a' : tag);
        el.className = 'ls-entry ls-type-' + (child.type || 'file') + (child.external ? ' ls-external' : '');
        if (child.url) {
            el.href = child.url;
            if (child.external) {
                el.target = '_blank';
                el.rel = 'noopener';
            }
        }

        var icon = document.createElement('i');
        icon.className = getIcon(child, name);
        el.appendChild(icon);
        el.appendChild(document.createTextNode(' '));

        var text = document.createElement('span');
        text.className = 'link-text';
        text.textContent = name + suffix;
        el.appendChild(text);

        return el;
    }

    function makePostCard(name, child) {
        var isSeries = child.type === 'dir' && child.title;
        var post = document.createElement('div');
        post.className = 'post' + (isSeries ? ' series' : '');

        var titleDiv = document.createElement('div');
        titleDiv.className = 'post-title';
        var link = document.createElement('a');
        link.href = child.url;

        var icon = document.createElement('i');
        icon.className = getIcon(child, name);
        link.appendChild(icon);
        link.appendChild(document.createTextNode(' '));

        var text = document.createElement('span');
        text.className = 'link-text';
        text.textContent = child.title || name;
        link.appendChild(text);
        titleDiv.appendChild(link);
        post.appendChild(titleDiv);

        var metaDiv = document.createElement('div');
        metaDiv.className = 'post-meta';

        if (child.date) {
            var dateSpan = document.createElement('span');
            dateSpan.className = 'date';
            dateSpan.textContent = child.date;
            metaDiv.appendChild(dateSpan);
        }

        var desc = isSeries ? child.description : child.summary;
        if (desc) {
            if (child.date) metaDiv.appendChild(document.createTextNode(' — '));
            metaDiv.appendChild(document.createTextNode(desc));
        }

        if (child.tags && child.tags.length) {
            child.tags.forEach(function (tag) {
                var tagSpan = document.createElement('span');
                tagSpan.className = 'tag';
                tagSpan.textContent = tag;
                metaDiv.appendChild(tagSpan);
            });
        }

        if (isSeries && child.episodeCount) {
            if (desc) metaDiv.appendChild(document.createTextNode(' '));
            var countSpan = document.createElement('span');
            countSpan.className = 'tag tag-count';
            countSpan.textContent = child.episodeCount + ' episode' + (child.episodeCount !== 1 ? 's' : '');
            metaDiv.appendChild(countSpan);
        }

        post.appendChild(metaDiv);
        return post;
    }

    function hasRichEntries(node) {
        return Object.values(node.children).some(function (c) { return c.title; });
    }

    function listChildren(node, flags) {
        if (!node || !node.children) return null;
        var entries = Object.entries(node.children);

        if (flags.indexOf('t') !== -1) {
            entries.sort(function (a, b) {
                var dateA = a[1].date || '';
                var dateB = b[1].date || '';
                if (dateB > dateA) return 1;
                if (dateA > dateB) return -1;
                return 0;
            });
        }

        var container = document.createElement('div');

        // Rich listing for directories with metadata (episodes, content pages)
        if (hasRichEntries(node)) {
            entries.forEach(function (entry) {
                if (entry[0] === 'README.md') return;
                container.appendChild(makePostCard(entry[0], entry[1]));
            });
            return container;
        }

        // Flat listing for plain directories (links, etc.)
        var longFormat = flags.indexOf('l') !== -1;
        if (!longFormat) {
            container.className = 'ls-output';
            entries.forEach(function (entry) {
                container.appendChild(makeEntry(entry[0], entry[1], 'span'));
            });
        } else {
            container.className = 'ls-output-long';
            entries.forEach(function (entry) {
                var name = entry[0];
                var child = entry[1];
                var symlink = child.type === 'symlink' ? ' -> ' + child.target : '';
                var line = document.createElement('div');
                line.className = 'ls-entry-line';

                var entryEl = makeEntry(name, child, 'span');
                var date = child.date || '          ';

                var datePart = document.createElement('span');
                datePart.className = 'ls-date';
                datePart.textContent = date + '  ';
                line.appendChild(datePart);
                line.appendChild(entryEl);
                if (symlink) {
                    line.appendChild(document.createTextNode(symlink));
                }
                container.appendChild(line);
            });
        }

        return container;
    }

    // Get completions for a path argument, walking into subdirectories
    function getPathCompletions(prefix, partial) {
        var results = [];
        var parts = partial.split('/');
        var lastPart = parts.pop();
        var dirPath = parts.join('/');

        // Resolve the directory we're completing in
        var node;
        if (dirPath) {
            node = resolvePath(dirPath);
        } else {
            node = getCurrentNode();
        }
        if (!node || !node.children) return results;

        var pathPrefix = dirPath ? dirPath + '/' : '';
        Object.keys(node.children).forEach(function (name) {
            if (!lastPart || name.toLowerCase().startsWith(lastPart.toLowerCase())) {
                var child = node.children[name];
                var suffix = child.type === 'dir' ? '/' : '';
                results.push(prefix + pathPrefix + name + suffix);
            }
        });
        return results;
    }

    function isValidCommand(cmd) {
        var lower = cmd.toLowerCase();
        if (lower === 'help' || lower === 'ls' || lower === 'cd' || lower === 'cd ~' || lower === 'cd ..') return true;
        if (lower.startsWith('grep ') && lower.length > 5) return true;
        if (lower === 'theme' || lower === 'themes') return true;
        if (lower.startsWith('theme ') && THEMES[lower.substring(6).trim()]) return true;

        if (lower.startsWith('cd ') || lower.startsWith('cat ')) {
            var arg = cmd.substring(4).trim();
            if (lower.startsWith('cd ')) arg = cmd.substring(3).trim().replace(/\/$/, '');
            return !!resolvePath(arg);
        }
        if (lower.startsWith('ls ')) {
            var lsArg = cmd.substring(3).trim().replace(/^-[a-z]+ ?/, '').replace(/\/$/, '');
            if (!lsArg) return true;
            return !!resolvePath(lsArg);
        }
        return false;
    }

    function findCompletion(val) {
        if (!val) return '';
        var lower = val.toLowerCase();

        // Static commands
        var statics = ['help', 'ls', 'cd ', 'cd ..', 'cd ~', 'cat ', 'grep ', 'theme', 'theme '];
        for (var i = 0; i < statics.length; i++) {
            if (statics[i].startsWith(lower) && statics[i] !== lower) {
                return statics[i];
            }
        }

        // Theme completions
        if (lower.startsWith('theme ')) {
            var themePart = lower.substring(6);
            var themeKeys = Object.keys(THEMES);
            for (var i = 0; i < themeKeys.length; i++) {
                if (themeKeys[i].startsWith(themePart) && themeKeys[i] !== themePart) {
                    return 'theme ' + themeKeys[i];
                }
            }
        }

        // Path completions for cd, cat, ls
        var match;
        if ((match = val.match(/^(cd |cat |ls (?:-[a-z]+ )?)(.*)/i))) {
            var prefix = match[1];
            var partial = match[2];
            var comps = getPathCompletions(prefix, partial);
            if (comps.length > 0) return comps[0];
        }

        return '';
    }

    var promptPath = getCurrentDir();

    // Command history (persists across page navigations within session)
    var history = JSON.parse(sessionStorage.getItem('shellHistory') || '[]');
    var historyIndex = history.length;
    var savedInput = '';

    function pushHistory(cmd) {
        if (cmd && (history.length === 0 || history[history.length - 1] !== cmd)) {
            history.push(cmd);
            sessionStorage.setItem('shellHistory', JSON.stringify(history));
        }
        historyIndex = history.length;
        savedInput = '';
    }

    input.addEventListener('input', function () {
        var val = input.value;
        var completion = findCompletion(val);
        hint.textContent = completion && val ? completion : '';
        if (val.trim() && isValidCommand(val.trim())) {
            input.classList.add('valid');
        } else {
            input.classList.remove('valid');
        }
    });

    input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (history.length === 0) return;
            if (historyIndex === history.length) savedInput = input.value;
            if (historyIndex > 0) {
                historyIndex--;
                input.value = history[historyIndex];
                hint.textContent = '';
                input.dispatchEvent(new Event('input'));
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex < history.length - 1) {
                historyIndex++;
                input.value = history[historyIndex];
            } else {
                historyIndex = history.length;
                input.value = savedInput;
            }
            hint.textContent = '';
            input.dispatchEvent(new Event('input'));
            return;
        }

        if (e.key === 'c' && e.ctrlKey) {
            e.preventDefault();
            if (input.value) {
                showOutput('^C', 'err');
            }
            input.value = '';
            hint.textContent = '';
            input.classList.remove('valid');
            historyIndex = history.length;
            savedInput = '';
            return;
        }

        if (e.key === 'Tab' || (e.key === 'ArrowRight' && input.selectionStart === input.value.length)) {
            var completion = findCompletion(input.value);
            if (completion) {
                e.preventDefault();
                input.value = completion;
                hint.textContent = '';
                input.dispatchEvent(new Event('input'));
            }
            return;
        }

        if (e.key !== 'Enter') return;
        var raw = input.value.trim();
        var cmd = raw.toLowerCase();
        if (!cmd) return;

        hint.textContent = '';
        input.classList.remove('valid');
        pushHistory(raw);

        if (cmd === 'help') {
            showOutput(
                [
                    '  ls              list current directory',
                    '  ls <dir>        list a subdirectory',
                    '  cd <dir>        enter a directory',
                    '  cd ..           go up one level',
                    '  cd ~            go home',
                    '  cat <file>      read a file',
                    '  grep <term>     search all content',
                    '  theme           list available themes',
                    '  theme <name>    apply a theme',
                    '  clear           reset terminal',
                    '  help            show this message',
                ].join('\n'),
                'ok',
            );
            input.value = '';
            return;
        }

        if (cmd === 'clear') {
            window.location.reload();
            return;
        }

        if (cmd === 'cd ~' || cmd === 'cd') {
            window.location.href = FILETREE['~'].url;
            return;
        }

        if (cmd === 'cd ..') {
            var parentPath = getParentPath();
            var parentNode = resolveNode(parentPath);
            window.location.href = (parentNode && parentNode.url) || FILETREE['~'].url;
            return;
        }

        if (cmd.startsWith('cd ')) {
            var dirPath = raw.substring(3).trim().replace(/\/$/, '');
            var target = resolvePath(dirPath);
            if (target && target.type === 'file') {
                showOutput('cd: not a directory: ' + dirPath, 'err');
                input.value = '';
                return;
            }
            if (target && target.url) {
                if (target.external) {
                    window.open(target.url, '_blank', 'noopener');
                } else {
                    window.location.href = target.url;
                }
                return;
            }
            showOutput('cd: no such directory: ' + dirPath, 'err');
            input.value = '';
            return;
        }

        if (cmd.startsWith('cat ')) {
            var filePath = raw.substring(4).trim();
            var fileNode = resolvePath(filePath.replace(/\/$/, ''));
            if (fileNode && (fileNode.type === 'dir' || fileNode.type === 'symlink')) {
                showOutput('cat: is a directory: ' + filePath, 'err');
                input.value = '';
                return;
            }
            if (fileNode && fileNode.url) {
                // If the file points to the current page, print its content inline
                var currentUrl = window.location.pathname.replace(/\/$/, '') || '/';
                var targetUrl = fileNode.url.replace(/\/$/, '') || '/';
                if (currentUrl === targetUrl) {
                    var contentEl = document.querySelector('.post-content') || document.querySelector('.welcome');
                    if (contentEl) {
                        showHtmlOutput(contentEl.innerHTML);
                        input.value = '';
                        return;
                    }
                }
                if (fileNode.external) {
                    window.open(fileNode.url, '_blank', 'noopener');
                } else {
                    window.location.href = fileNode.url;
                }
                return;
            }
            showOutput('cat: no such file: ' + filePath, 'err');
            input.value = '';
            return;
        }

        if (cmd === 'ls' || cmd.startsWith('ls ')) {
            var lsArgs = raw.substring(2).trim();
            var flags = '';
            var lsDir = '';
            var flagMatch = lsArgs.match(/^-([a-z]+)\s*(.*)/);
            if (flagMatch) {
                flags = flagMatch[1];
                lsDir = flagMatch[2].trim().replace(/\/$/, '');
            } else {
                lsDir = lsArgs.replace(/\/$/, '');
            }

            var targetNode;
            if (lsDir) {
                targetNode = resolvePath(lsDir);
                if (!targetNode) {
                    showOutput('ls: no such directory: ' + lsDir, 'err');
                    input.value = '';
                    return;
                }
            } else {
                targetNode = getCurrentNode();
            }

            var result = listChildren(targetNode, flags);
            if (!result) {
                showOutput('not a directory', 'err');
            } else {
                showDomOutput(result);
            }
            input.value = '';
            return;
        }

        if (cmd === 'theme' || cmd === 'themes') {
            var lines = Object.keys(THEMES).map(function (id) {
                var marker = id === getCurrentTheme() ? ' *' : '';
                return '  ' + id + marker;
            });
            showOutput(lines.join('\n'), 'ok');
            input.value = '';
            return;
        }

        if (cmd.startsWith('theme ')) {
            var name = cmd.substring(6).trim();
            if (applyTheme(name)) {
                showOutput('theme set to ' + name, 'ok');
            } else {
                showOutput('unknown theme: ' + name, 'err');
            }
            input.value = '';
            return;
        }

        if (cmd.startsWith('grep ')) {
            var query = raw.substring(5).trim();
            if (!query) {
                showOutput('usage: grep <term>', 'err');
                input.value = '';
                return;
            }
            var savedCmd = input.value;
            input.value = '';

            (async function () {
                try {
                    if (!window._pagefind) {
                        window._pagefind = await import('/pagefind/pagefind.js');
                    }
                    var pf = window._pagefind;
                    var search = await pf.search(query);
                    if (search.results.length === 0) {
                        showOutput('grep: no results for "' + query + '"', 'err', savedCmd);
                        return;
                    }
                    var results = await Promise.all(
                        search.results.slice(0, 10).map(function (r) { return r.data(); })
                    );

                    var container = document.createElement('div');
                    results.forEach(function (data) {
                        var vpath = urlToVirtualPath(data.url);
                        var child = {
                            type: 'file',
                            url: data.url,
                            title: data.meta.title || data.url,
                            tags: [],
                        };
                        var card = makePostCard('result.md', child);

                        if (vpath) {
                            var pathDiv = document.createElement('div');
                            pathDiv.className = 'grep-path';
                            pathDiv.textContent = vpath;
                            card.insertBefore(pathDiv, card.querySelector('.post-meta'));
                        }

                        if (data.excerpt) {
                            var excerpt = document.createElement('div');
                            excerpt.className = 'grep-excerpt';
                            // Pagefind excerpts contain only <mark> tags from its own index
                            var template = document.createElement('template');
                            template.innerHTML = data.excerpt;
                            excerpt.appendChild(template.content.cloneNode(true));
                            card.appendChild(excerpt);
                        }
                        container.appendChild(card);
                    });

                    showDomOutput(container, savedCmd);
                } catch (e) {
                    showOutput('grep: search unavailable', 'err', savedCmd);
                }
            })();
            return;
        }

        showOutput('command not found: ' + raw, 'err');
        input.value = '';
    });

    function showOutput(text, type, cmdText) {
        var cmdLine = document.createElement('div');
        cmdLine.className = 'prompt';
        var pathSpan = document.createElement('span');
        pathSpan.className = 'path';
        pathSpan.textContent = promptPath;
        var dollarSpan = document.createElement('span');
        dollarSpan.className = 'dollar';
        dollarSpan.textContent = '$';
        cmdLine.appendChild(pathSpan);
        cmdLine.appendChild(document.createTextNode(' '));
        cmdLine.appendChild(dollarSpan);
        cmdLine.appendChild(document.createTextNode(' ' + (cmdText || input.value)));

        var resultDiv = document.createElement('div');
        resultDiv.className = 'cmd-output';
        var span = document.createElement('span');
        span.className = type;
        span.textContent = text;
        resultDiv.appendChild(span);

        var inputLine = input.closest('.input-line');
        inputLine.parentNode.insertBefore(cmdLine, inputLine);
        inputLine.parentNode.insertBefore(resultDiv, inputLine);
        input.scrollIntoView({ behavior: 'smooth' });
    }

    function showHtmlOutput(sourceHtml) {
        var cmdLine = document.createElement('div');
        cmdLine.className = 'prompt';
        var pathSpan = document.createElement('span');
        pathSpan.className = 'path';
        pathSpan.textContent = promptPath;
        var dollarSpan = document.createElement('span');
        dollarSpan.className = 'dollar';
        dollarSpan.textContent = '$';
        cmdLine.appendChild(pathSpan);
        cmdLine.appendChild(document.createTextNode(' '));
        cmdLine.appendChild(dollarSpan);
        cmdLine.appendChild(document.createTextNode(' ' + input.value));

        // Clone the rendered content to preserve styling
        // sourceHtml comes from the page's own rendered content, not user input
        var resultDiv = document.createElement('div');
        resultDiv.className = 'post-content';
        var template = document.createElement('template');
        template.innerHTML = sourceHtml;
        resultDiv.appendChild(template.content.cloneNode(true));

        var inputLine = input.closest('.input-line');
        inputLine.parentNode.insertBefore(cmdLine, inputLine);
        inputLine.parentNode.insertBefore(resultDiv, inputLine);
        input.scrollIntoView({ behavior: 'smooth' });
    }

    function showDomOutput(element, cmdText) {
        var cmdLine = document.createElement('div');
        cmdLine.className = 'prompt';
        var pathSpan = document.createElement('span');
        pathSpan.className = 'path';
        pathSpan.textContent = promptPath;
        var dollarSpan = document.createElement('span');
        dollarSpan.className = 'dollar';
        dollarSpan.textContent = '$';
        cmdLine.appendChild(pathSpan);
        cmdLine.appendChild(document.createTextNode(' '));
        cmdLine.appendChild(dollarSpan);
        cmdLine.appendChild(document.createTextNode(' ' + (cmdText || input.value)));

        var resultDiv = document.createElement('div');
        resultDiv.className = 'cmd-output';
        resultDiv.appendChild(element);

        var inputLine = input.closest('.input-line');
        inputLine.parentNode.insertBefore(cmdLine, inputLine);
        inputLine.parentNode.insertBefore(resultDiv, inputLine);
        input.scrollIntoView({ behavior: 'smooth' });
    }
})();
