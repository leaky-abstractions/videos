var THEMES = {
    "onedark": { name: "One Dark", palette: { base00: "#282c34", base01: "#353b45", base02: "#3e4451", base03: "#545862", base04: "#565c64", base05: "#abb2bf", base06: "#b6bdca", base07: "#c8ccd4", base08: "#e06c75", base09: "#d19a66", base0A: "#e5c07b", base0B: "#98c379", base0C: "#56b6c2", base0D: "#61afef", base0E: "#c678dd", base0F: "#be5046" }},
    "dracula": { name: "Dracula", palette: { base00: "#282a36", base01: "#21222c", base02: "#44475A", base03: "#6272a4", base04: "#9ea8c7", base05: "#f8f8f2", base06: "#f8f8f2", base07: "#ffffff", base08: "#ff5555", base09: "#FFB86C", base0A: "#f1fa8c", base0B: "#50fa7b", base0C: "#8be9fd", base0D: "#bd93f9", base0E: "#ff79c6", base0F: "#993333" }},
    "gruvbox-dark": { name: "Gruvbox Dark", palette: { base00: "#282828", base01: "#3c3836", base02: "#504945", base03: "#665c54", base04: "#bdae93", base05: "#d5c4a1", base06: "#ebdbb2", base07: "#fbf1c7", base08: "#fb4934", base09: "#fe8019", base0A: "#fabd2f", base0B: "#b8bb26", base0C: "#8ec07c", base0D: "#83a598", base0E: "#d3869b", base0F: "#d65d0e" }},
    "catppuccin-mocha": { name: "Catppuccin Mocha", palette: { base00: "#1e1e2e", base01: "#181825", base02: "#313244", base03: "#45475a", base04: "#585b70", base05: "#cdd6f4", base06: "#f5e0dc", base07: "#b4befe", base08: "#f38ba8", base09: "#fab387", base0A: "#f9e2af", base0B: "#a6e3a1", base0C: "#94e2d5", base0D: "#89b4fa", base0E: "#cba6f7", base0F: "#f2cdcd" }},
    "solarized-dark": { name: "Solarized Dark", palette: { base00: "#002b36", base01: "#073642", base02: "#586e75", base03: "#657b83", base04: "#839496", base05: "#93a1a1", base06: "#eee8d5", base07: "#fdf6e3", base08: "#dc322f", base09: "#cb4b16", base0A: "#b58900", base0B: "#859900", base0C: "#2aa198", base0D: "#268bd2", base0E: "#6c71c4", base0F: "#d33682" }},
    "nord": { name: "Nord", palette: { base00: "#2E3440", base01: "#3B4252", base02: "#434C5E", base03: "#4C566A", base04: "#D8DEE9", base05: "#E5E9F0", base06: "#ECEFF4", base07: "#8FBCBB", base08: "#BF616A", base09: "#D08770", base0A: "#EBCB8B", base0B: "#A3BE8C", base0C: "#88C0D0", base0D: "#81A1C1", base0E: "#B48EAD", base0F: "#5E81AC" }},
    "tokyo-night": { name: "Tokyo Night", palette: { base00: "#1A1B26", base01: "#16161E", base02: "#2F3549", base03: "#444B6A", base04: "#787C99", base05: "#A9B1D6", base06: "#CBCCD1", base07: "#D5D6DB", base08: "#C0CAF5", base09: "#A9B1D6", base0A: "#0DB9D7", base0B: "#9ECE6A", base0C: "#B4F9F8", base0D: "#2AC3DE", base0E: "#BB9AF7", base0F: "#F7768E" }},
    "monokai": { name: "Monokai", palette: { base00: "#272822", base01: "#383830", base02: "#49483e", base03: "#75715e", base04: "#a59f85", base05: "#f8f8f2", base06: "#f5f4f1", base07: "#f9f8f5", base08: "#f92672", base09: "#fd971f", base0A: "#f4bf75", base0B: "#a6e22e", base0C: "#a1efe4", base0D: "#66d9ef", base0E: "#ae81ff", base0F: "#cc6633" }},
    "everforest": { name: "Everforest", palette: { base00: "#272e33", base01: "#2e383c", base02: "#414b50", base03: "#859289", base04: "#9da9a0", base05: "#d3c6aa", base06: "#edeada", base07: "#fffbef", base08: "#e67e80", base09: "#e69875", base0A: "#dbbc7f", base0B: "#a7c080", base0C: "#83c092", base0D: "#7fbbb3", base0E: "#d699b6", base0F: "#9da9a0" }},
    "rose-pine": { name: "Rosé Pine", palette: { base00: "#191724", base01: "#1f1d2e", base02: "#26233a", base03: "#6e6a86", base04: "#908caa", base05: "#e0def4", base06: "#e0def4", base07: "#524f67", base08: "#eb6f92", base09: "#f6c177", base0A: "#ebbcba", base0B: "#31748f", base0C: "#9ccfd8", base0D: "#c4a7e7", base0E: "#f6c177", base0F: "#524f67" }},
    "ayu-dark": { name: "Ayu Dark", palette: { base00: "#0b0e14", base01: "#131721", base02: "#202229", base03: "#3e4b59", base04: "#bfbdb6", base05: "#e6e1cf", base06: "#ece8db", base07: "#f2f0e7", base08: "#f07178", base09: "#ff8f40", base0A: "#ffb454", base0B: "#aad94c", base0C: "#95e6cb", base0D: "#59c2ff", base0E: "#d2a6ff", base0F: "#e6b450" }},
    "material": { name: "Material", palette: { base00: "#263238", base01: "#2E3C43", base02: "#314549", base03: "#546E7A", base04: "#B2CCD6", base05: "#EEFFFF", base06: "#EEFFFF", base07: "#FFFFFF", base08: "#F07178", base09: "#F78C6C", base0A: "#FFCB6B", base0B: "#C3E88D", base0C: "#89DDFF", base0D: "#82AAFF", base0E: "#C792EA", base0F: "#FF5370" }},
    "horizon-dark": { name: "Horizon Dark", palette: { base00: "#1C1E26", base01: "#232530", base02: "#2E303E", base03: "#6F6F70", base04: "#9DA0A2", base05: "#CBCED0", base06: "#DCDFE4", base07: "#E3E6EE", base08: "#E93C58", base09: "#E58D7D", base0A: "#EFB993", base0B: "#EFAF8E", base0C: "#24A8B4", base0D: "#DF5273", base0E: "#B072D1", base0F: "#E4A382" }},
    "solarized-light": { name: "Solarized Light", palette: { base00: "#fdf6e3", base01: "#eee8d5", base02: "#93a1a1", base03: "#839496", base04: "#657b83", base05: "#586e75", base06: "#073642", base07: "#002b36", base08: "#dc322f", base09: "#cb4b16", base0A: "#b58900", base0B: "#859900", base0C: "#2aa198", base0D: "#268bd2", base0E: "#6c71c4", base0F: "#d33682" }},
    "gruvbox-light": { name: "Gruvbox Light", palette: { base00: "#fbf1c7", base01: "#ebdbb2", base02: "#d5c4a1", base03: "#bdae93", base04: "#665c54", base05: "#504945", base06: "#3c3836", base07: "#282828", base08: "#9d0006", base09: "#af3a03", base0A: "#b57614", base0B: "#79740e", base0C: "#427b58", base0D: "#076678", base0E: "#8f3f71", base0F: "#d65d0e" }},
    "catppuccin-latte": { name: "Catppuccin Latte", palette: { base00: "#eff1f5", base01: "#e6e9ef", base02: "#ccd0da", base03: "#bcc0cc", base04: "#acb0be", base05: "#4c4f69", base06: "#dc8a78", base07: "#7287fd", base08: "#d20f39", base09: "#fe640b", base0A: "#df8e1d", base0B: "#40a02b", base0C: "#179299", base0D: "#1e66f5", base0E: "#8839ef", base0F: "#dd7878" }}
};

var DEFAULT_THEME = "onedark";

function applyTheme(id) {
    var theme = THEMES[id];
    if (!theme) return false;
    var root = document.documentElement;
    var palette = theme.palette;
    Object.keys(palette).forEach(function(key) {
        root.style.setProperty('--' + key, palette[key]);
    });
    localStorage.setItem('theme', JSON.stringify(palette));
    localStorage.setItem('theme-name', id);
    updatePickerActive(id);
    return true;
}

function getCurrentTheme() {
    return localStorage.getItem('theme-name') || DEFAULT_THEME;
}

function toggleThemePicker() {
    var picker = document.getElementById('theme-picker');
    var toggle = document.querySelector('.theme-toggle');
    if (picker.classList.contains('open')) {
        picker.classList.remove('open');
        if (toggle) toggle.classList.remove('theme-active');
        return;
    }
    if (!picker.hasChildNodes()) {
        var current = getCurrentTheme();
        Object.keys(THEMES).forEach(function(id) {
            var btn = document.createElement('button');
            btn.textContent = THEMES[id].name;
            btn.setAttribute('data-theme', id);
            if (id === current) btn.className = 'active';
            btn.addEventListener('click', function() {
                applyTheme(id);
                picker.classList.remove('open');
                var toggle = document.querySelector('.theme-toggle');
                if (toggle) toggle.classList.remove('theme-active');
            });
            picker.appendChild(btn);
        });
    }
    picker.classList.toggle('open');
    if (toggle) toggle.classList.add('theme-active');
}

function updatePickerActive(id) {
    var picker = document.getElementById('theme-picker');
    var buttons = picker.querySelectorAll('button');
    buttons.forEach(function(btn) {
        btn.className = btn.getAttribute('data-theme') === id ? 'active' : '';
    });
}

document.addEventListener('click', function(e) {
    var picker = document.getElementById('theme-picker');
    if (!picker) return;
    if (!e.target.closest('.theme-toggle') && !e.target.closest('.theme-picker')) {
        picker.classList.remove('open');
        var toggle = document.querySelector('.theme-toggle');
        if (toggle) toggle.classList.remove('theme-active');
    }
});
