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
                } else {
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

    function listChildren(node, flags) {
        if (!node || !node.children) return 'not a directory';
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

        var longFormat = flags.indexOf('l') !== -1;
        var lines = entries.map(function (entry) {
            var name = entry[0];
            var child = entry[1];
            var suffix = child.type === 'dir' ? '/' : '';
            var symlink = child.type === 'symlink' ? ' -> ' + child.target : '';

            if (longFormat && child.date) {
                return '  ' + (child.date || '          ') + '  ' + name + suffix + symlink;
            }
            return '  ' + name + suffix + symlink;
        });
        return lines.join('\n');
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
        var statics = ['help', 'ls', 'cd ', 'cd ..', 'cd ~', 'cat ', 'theme', 'theme '];
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

            showOutput(listChildren(targetNode, flags), 'ok');
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

        showOutput('command not found: ' + raw, 'err');
        input.value = '';
    });

    function showOutput(text, type) {
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
})();
