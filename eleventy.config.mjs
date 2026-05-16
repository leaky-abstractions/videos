import syntaxHighlight from '@11ty/eleventy-plugin-syntaxhighlight';
import pluginRss from '@11ty/eleventy-plugin-rss';
import { dirname, basename } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import yaml from 'js-yaml';
import matter from 'gray-matter';
import markdownIt from 'markdown-it';
import fg from 'fast-glob';

const md = markdownIt({ html: true, linkify: true });

// Compute estimated reading time for a markdown body.
// Prose at 200 WPM (technical content), code at 100 WPM (read ~2x slower).
// Rounds up to whole minutes; floor at 1.
function computeReadingTime(markdown) {
    const PROSE_WPM = 200;
    const CODE_WPM = 100;

    let codeText = '';
    const proseText = markdown.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) => {
        codeText += ' ' + code;
        return '';
    });

    const proseWords = proseText.split(/\s+/).filter(Boolean).length;
    const codeWords = codeText.split(/\s+/).filter(Boolean).length;

    const minutes = proseWords / PROSE_WPM + codeWords / CODE_WPM;
    return Math.max(1, Math.ceil(minutes));
}

// Path prefix for GitHub Pages subdirectory deployment
// Set via ELEVENTY_PATH_PREFIX env var, defaults to '/' for local dev
const PATH_PREFIX = (process.env.ELEVENTY_PATH_PREFIX || '').replace(/\/$/, '');

const SITE_URL = 'https://leakyabstractions.dev';

function prefixUrl(url) {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return PATH_PREFIX + url;
}

function buildFiletree() {
    const links = yaml.load(readFileSync('site/_data/links.yml', 'utf8')) || [];
    const linksChildren = {};
    for (const link of links) {
        const node = { type: link.type || 'file', url: link.url };
        if (link.type === 'symlink') {
            node.target = link.target;
        }
        if (link.external) {
            node.external = true;
        }
        if (link.icon) {
            node.icon = link.icon;
        }
        linksChildren[link.name] = node;
    }

    const episodesChildren = {};

    // Standalone episodes
    const standaloneMetaFiles = fg.sync('episodes/*/meta.yml');
    for (const metaFile of standaloneMetaFiles) {
        const dir = dirname(metaFile);
        const slug = basename(dir);
        const blogPath = dir + '/blog.md';
        if (!existsSync(blogPath)) continue;

        const meta = yaml.load(readFileSync(metaFile, 'utf8'));
        const { data: blogFm, content: blogBody } = matter(readFileSync(blogPath, 'utf8'));
        episodesChildren[slug + '.md'] = {
            type: 'file',
            url: '/episodes/' + slug + '/',
            date: meta.date || null,
            title: meta.title || slug,
            summary: blogFm.summary || '',
            tags: blogFm.tags || [],
            readingTime: computeReadingTime(blogBody),
        };
    }

    // Series
    const seriesYmlFiles = fg.sync('episodes/_series/*/series.yml');
    for (const seriesFile of seriesYmlFiles) {
        const seriesDir = dirname(seriesFile);
        const seriesMeta = yaml.load(readFileSync(seriesFile, 'utf8'));
        const slug = seriesMeta.slug;

        const seriesChildren = {};

        // README.md
        const readmePath = seriesDir + '/README.md';
        if (existsSync(readmePath)) {
            seriesChildren['README.md'] = { type: 'file', url: '/episodes/' + slug + '/' };
        }

        // Series episodes
        const episodeMetaFiles = fg.sync(seriesDir + '/*/meta.yml');
        for (const epMetaFile of episodeMetaFiles) {
            const epDir = dirname(epMetaFile);
            const epSlug = basename(epDir);
            const blogPath = epDir + '/blog.md';
            if (!existsSync(blogPath)) continue;

            const epMeta = yaml.load(readFileSync(epMetaFile, 'utf8'));
            const { data: epBlogFm, content: epBlogBody } = matter(readFileSync(blogPath, 'utf8'));
            seriesChildren[epSlug + '.md'] = {
                type: 'file',
                url: '/episodes/' + slug + '/' + epSlug + '/',
                date: epMeta.date || null,
                title: epMeta.title || epSlug,
                summary: epBlogFm.summary || '',
                tags: epBlogFm.tags || [],
                readingTime: computeReadingTime(epBlogBody),
            };
        }

        // Find latest episode date
        const epDates = Object.values(seriesChildren).map(function (c) { return c.date || ''; }).sort();
        episodesChildren[slug] = {
            type: 'dir',
            url: '/episodes/' + slug + '/',
            children: seriesChildren,
            title: seriesMeta.title || slug,
            description: seriesMeta.description || '',
            date: epDates[epDates.length - 1] || null,
            episodeCount: Object.values(seriesChildren).filter(function (c) { return c.type === 'file' && c.url; }).length,
        };
    }

    // Content directories from site/_data/ (e.g., legal/)
    const contentDirs = {};
    const dataDirs = fg.sync('site/_data/*/', { onlyDirectories: true });
    for (const dir of dataDirs) {
        const dirName = basename(dir);
        const mdFiles = fg.sync(dir + '/*.md');
        if (mdFiles.length === 0) continue;

        const children = {};
        for (const mdFile of mdFiles) {
            const fileName = basename(mdFile);
            if (fileName.toLowerCase() === 'readme.md') {
                children['README.md'] = { type: 'file', url: '/' + dirName + '/' };
                continue;
            }
            const slug = basename(mdFile, '.md');
            const { data: fm } = matter(readFileSync(mdFile, 'utf8'));
            children[slug + '.md'] = {
                type: 'file',
                url: '/' + dirName + '/' + slug + '/',
                date: fm.date ? new Date(fm.date).toISOString().slice(0, 10) : null,
                title: fm.title || slug.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }),
                summary: fm.summary || '',
                tags: fm.tags || [],
            };
        }
        contentDirs[dirName] = {
            type: 'dir',
            url: '/' + dirName + '/',
            children,
        };
    }

    const rootChildren = {
        'welcome.md': { type: 'file', url: '/' },
        episodes: {
            type: 'dir',
            url: '/episodes/',
            children: episodesChildren,
        },
        ...contentDirs,
        links: {
            type: 'dir',
            children: linksChildren,
        },
    };

    const tree = {
        '~': {
            type: 'dir',
            url: '/',
            children: rootChildren,
        },
    };

    // Apply path prefix to all URLs in the tree
    function prefixTree(node) {
        if (node.url) node.url = prefixUrl(node.url);
        if (node.children) {
            for (const child of Object.values(node.children)) {
                prefixTree(child);
            }
        }
    }
    prefixTree(tree['~']);

    return tree;
}

function buildContentDirData() {
    const dataDirs = fg.sync('site/_data/*/', { onlyDirectories: true });
    const result = [];
    for (const dir of dataDirs) {
        const dirName = basename(dir);
        const mdFiles = fg.sync(dir + '/*.md');
        if (mdFiles.length === 0) continue;

        // Check for README.md
        const readmePath = dir + '/README.md';
        const readme = existsSync(readmePath) ? readFileSync(readmePath, 'utf8') : '';

        // Exclude README.md from pages list
        const pages = mdFiles
            .filter((f) => basename(f).toLowerCase() !== 'readme.md')
            .map((f) => {
                const slug = basename(f, '.md');
                const raw = readFileSync(f, 'utf8');
                const { data: fm, content: body } = matter(raw);

                // Frontmatter takes priority, then extract from content
                const titleMatch = body.match(/^#\s+(.+)$/m);
                const title = fm.title || (titleMatch ? titleMatch[1] : slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));

                const lines = body.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
                const summary = fm.summary || (lines.length > 0 ? lines[0].trim() : '');

                const date = fm.date ? new Date(fm.date).toISOString().slice(0, 10) : null;

                return {
                    slug,
                    title,
                    summary,
                    date,
                    tags: fm.tags || [],
                    content: body,
                    url: prefixUrl('/' + dirName + '/' + slug + '/'),
                    readingTime: computeReadingTime(body),
                };
            });

        result.push({ dirName, readme, pages });
    }
    return result;
}

function urlToVirtualPath(url, filetree) {
    const urlMap = {};
    function walk(node, vpath) {
        if (node.url) {
            // Prefer dir nodes over file nodes when URLs collide
            if (!urlMap[node.url] || node.type === 'dir') {
                urlMap[node.url] = vpath;
            }
        }
        if (node.children) {
            for (const [name, child] of Object.entries(node.children)) {
                walk(child, vpath === '~' ? '~/' + name : vpath + '/' + name);
            }
        }
    }
    walk(filetree['~'], '~');

    const normalized = url.replace(/index\.html$/, '').replace(/\/$/, '') || '/';
    const withSlash = normalized.endsWith('/') ? normalized : normalized + '/';

    return urlMap[normalized] || urlMap[withSlash] || urlMap[url] || '~';
}

function buildSeriesData() {
    const seriesFiles = fg.sync('episodes/_series/*/series.yml');
    return seriesFiles.map((file) => {
        const seriesDir = dirname(file);
        const meta = yaml.load(readFileSync(file, 'utf8'));
        const slug = meta.slug;

        // Read README.md
        const readmePath = seriesDir + '/README.md';
        const readme = existsSync(readmePath) ? readFileSync(readmePath, 'utf8') : '';

        // Collect episodes
        const episodeMetaFiles = fg.sync(seriesDir + '/*/meta.yml');
        const episodes = [];
        for (const epMetaFile of episodeMetaFiles) {
            const epDir = dirname(epMetaFile);
            const epSlug = basename(epDir);
            const blogPath = epDir + '/blog.md';
            if (!existsSync(blogPath)) continue;

            const epMeta = yaml.load(readFileSync(epMetaFile, 'utf8'));
            const { data: blogData, content: blogBody } = matter(readFileSync(blogPath, 'utf8'));
            episodes.push({
                slug: epSlug,
                title: epMeta.title,
                date: new Date(epMeta.date).toISOString().slice(0, 10),
                episode: epMeta.episode || 0,
                summary: blogData.summary || '',
                tags: blogData.tags || [],
                url: prefixUrl('/episodes/' + slug + '/' + epSlug + '/'),
                readingTime: computeReadingTime(blogBody),
            });
        }
        episodes.sort((a, b) => a.episode - b.episode);
        const total = episodes.length;
        episodes.forEach((ep, i) => {
            ep.seriesPosition = (i + 1) + ' of ' + total;
        });

        return {
            slug,
            title: meta.title,
            description: meta.description || '',
            readme,
            episodes,
            url: prefixUrl('/episodes/' + slug + '/'),
        };
    });
}

// Flat list of every episode (standalone + series) with display fields and
// metadata needed for related-episodes scoring. Series episodes inherit
// seriesPosition (e.g. "1 of 3") from the already-built seriesData.
function buildAllEpisodesData(seriesData) {
    const items = [];

    const standaloneMetaFiles = fg.sync('episodes/*/meta.yml');
    for (const metaFile of standaloneMetaFiles) {
        const dir = dirname(metaFile);
        const slug = basename(dir);
        const blogPath = dir + '/blog.md';
        if (!existsSync(blogPath)) continue;
        const meta = yaml.load(readFileSync(metaFile, 'utf8'));
        const { data: fm, content: body } = matter(readFileSync(blogPath, 'utf8'));
        items.push({
            slug,
            title: meta.title || slug,
            date: meta.date ? new Date(meta.date).toISOString().slice(0, 10) : null,
            summary: fm.summary || '',
            tags: fm.tags || [],
            readingTime: computeReadingTime(body),
            url: prefixUrl('/episodes/' + slug + '/'),
            inputPath: blogPath,
            seriesSlug: null,
            seriesPosition: null,
        });
    }

    for (const series of seriesData) {
        for (const ep of series.episodes) {
            items.push({
                slug: ep.slug,
                title: ep.title,
                date: ep.date,
                summary: ep.summary,
                tags: ep.tags,
                readingTime: ep.readingTime,
                url: ep.url,
                inputPath: 'episodes/_series/' + series.slug + '/' + ep.slug + '/blog.md',
                seriesSlug: series.slug,
                seriesPosition: ep.seriesPosition,
            });
        }
    }

    return items;
}

// For each episode, compute its top 3 related episodes by tag-overlap score
// (recency tiebreaker). Excludes self and same-series. Falls back to the
// 3 most recent (also exclusions applied) when no tag overlap exists.
function buildRelatedByInputPath(allEpisodes) {
    const map = {};
    for (const current of allEpisodes) {
        const currentTags = new Set(current.tags);
        const candidates = allEpisodes
            .filter((e) => e.inputPath !== current.inputPath)
            .filter((e) => !current.seriesSlug || e.seriesSlug !== current.seriesSlug);

        const scored = candidates
            .map((e) => ({ ...e, overlap: e.tags.filter((t) => currentTags.has(t)).length }))
            .sort((a, b) => {
                if (b.overlap !== a.overlap) return b.overlap - a.overlap;
                return (b.date || '').localeCompare(a.date || '');
            });

        const hasMatch = scored.length > 0 && scored[0].overlap > 0;
        const items = hasMatch ? scored.filter((e) => e.overlap > 0).slice(0, 3) : scored.slice(0, 3);

        map[current.inputPath] = {
            items,
            isFallback: !hasMatch,
            searchTags: current.tags,
        };
    }
    return map;
}

export default function (eleventyConfig) {
    eleventyConfig.addPlugin(syntaxHighlight);
    eleventyConfig.addPlugin(pluginRss);

    // Date formatting filter
    eleventyConfig.addFilter('date', (value, format) => {
        const d = new Date(value);
        if (format === 'Y') return d.getFullYear().toString();
        return d.toISOString().slice(0, 10);
    });

    // Markdown rendering filter
    eleventyConfig.addFilter('md', (value) => md.render(value));

    // Default layout for all pages
    eleventyConfig.addGlobalData('layout', 'base.njk');

    // Copy static files to output
    eleventyConfig.addPassthroughCopy({ 'site/css': 'css' });
    eleventyConfig.addPassthroughCopy({ 'site/js': 'js' });
    eleventyConfig.addPassthroughCopy({ 'site/favicon.svg': 'favicon.svg' });

    // Load welcome.md as global data
    eleventyConfig.addGlobalData('welcome', () => readFileSync('site/_data/welcome.md', 'utf8'));

    // Add YAML data file support
    eleventyConfig.addDataExtension('yml,yaml', (contents) => yaml.load(contents));

    // Build filetree (single source of truth)
    const filetree = buildFiletree();
    eleventyConfig.addGlobalData('filetree', filetree);

    // All posts
    eleventyConfig.addCollection('posts', function (collectionApi) {
        return collectionApi.getFilteredByGlob('episodes/**/blog.md').sort((a, b) => {
            return (b.date || 0) - (a.date || 0);
        });
    });

    // Standalone episodes only
    eleventyConfig.addCollection('standaloneEpisodes', function (collectionApi) {
        return collectionApi
            .getFilteredByGlob('episodes/**/blog.md')
            .filter((item) => !item.inputPath.includes('_series/'))
            .sort((a, b) => (b.date || 0) - (a.date || 0));
    });

    // Series episodes grouped
    eleventyConfig.addCollection('seriesEpisodes', function (collectionApi) {
        const episodes = collectionApi
            .getFilteredByGlob('episodes/**/blog.md')
            .filter((item) => item.inputPath.includes('_series/'));
        const grouped = {};
        for (const ep of episodes) {
            const metaPath = dirname(ep.inputPath) + '/meta.yml';
            try {
                const meta = yaml.load(readFileSync(metaPath, 'utf8'));
                if (meta?.series) {
                    if (!grouped[meta.series]) grouped[meta.series] = [];
                    grouped[meta.series].push(ep);
                }
            } catch (e) {
                console.warn('Warning: could not read', metaPath, e.message);
            }
        }
        for (const key of Object.keys(grouped)) {
            grouped[key].sort((a, b) => {
                const metaA = yaml.load(readFileSync(dirname(a.inputPath) + '/meta.yml', 'utf8'));
                const metaB = yaml.load(readFileSync(dirname(b.inputPath) + '/meta.yml', 'utf8'));
                return (metaA?.episode || 0) - (metaB?.episode || 0);
            });
        }
        return grouped;
    });

    // Programmatic series pages
    const seriesData = buildSeriesData();
    eleventyConfig.addGlobalData('allSeriesData', seriesData);

    // Related episodes — pre-computed once, looked up by inputPath at render time.
    const relatedByInputPath = buildRelatedByInputPath(buildAllEpisodesData(seriesData));

    // Content directory pages (legal/, etc.)
    const contentDirData = buildContentDirData();
    // Flatten into individual pages for pagination
    const contentPages = [];
    const contentListings = [];
    for (const dir of contentDirData) {
        contentListings.push({ dirName: dir.dirName, readme: dir.readme, pages: dir.pages });
        for (const page of dir.pages) {
            contentPages.push({ dirName: dir.dirName, ...page });
        }
    }
    eleventyConfig.addGlobalData('contentListings', contentListings);
    eleventyConfig.addGlobalData('contentPages', contentPages);

    eleventyConfig.addCollection('seriesPages', function () {
        return seriesData.map((s) => ({
            slug: s.slug,
            title: s.title,
        }));
    });

    // Computed data
    eleventyConfig.addGlobalData('eleventyComputed', {
        permalink(data) {
            if (!data.page?.inputPath?.includes('episodes/')) return data.permalink;
            if (data.permalink) return data.permalink;

            const inputPath = data.page.inputPath;
            const parentDir = basename(dirname(inputPath));

            const metaPath = dirname(inputPath) + '/meta.yml';
            let slug = parentDir;
            try {
                const meta = yaml.load(readFileSync(metaPath, 'utf8'));
                if (meta?.series) {
                    slug = meta.series + '/' + parentDir;
                }
            } catch (e) {
                console.warn('Warning: could not read', metaPath, e.message);
            }

            return '/episodes/' + slug + '/index.html';
        },
        virtualPath(data) {
            const permalink = data.permalink || data.page?.url;
            if (!permalink) return '~';
            return urlToVirtualPath(permalink, filetree);
        },
        readingTime(data) {
            if (!data.page?.inputPath?.includes('blog.md')) return undefined;
            try {
                const { content } = matter(readFileSync(data.page.inputPath, 'utf8'));
                return computeReadingTime(content);
            } catch (e) {
                return undefined;
            }
        },
        seriesProgress(data) {
            const inputPath = data.page?.inputPath;
            if (!inputPath || !inputPath.includes('_series/') || !inputPath.includes('blog.md')) {
                return undefined;
            }
            const epSlug = basename(dirname(inputPath));
            const seriesSlug = basename(dirname(dirname(inputPath)));
            const series = seriesData.find((s) => s.slug === seriesSlug);
            if (!series) return undefined;
            const idx = series.episodes.findIndex((e) => e.slug === epSlug);
            if (idx === -1) return undefined;
            return {
                seriesSlug,
                index: idx + 1,
                total: series.episodes.length,
            };
        },
        relatedEpisodes(data) {
            const inputPath = data.page?.inputPath;
            if (!inputPath || !inputPath.includes('blog.md')) return undefined;
            const normalized = inputPath.replace(/^\.\//, '');
            return relatedByInputPath[normalized];
        },
        seriesNav(data) {
            const inputPath = data.page?.inputPath;
            if (!inputPath || !inputPath.includes('_series/') || !inputPath.includes('blog.md')) {
                return undefined;
            }
            const epSlug = basename(dirname(inputPath));
            const seriesSlug = basename(dirname(dirname(inputPath)));
            const series = seriesData.find((s) => s.slug === seriesSlug);
            if (!series) return undefined;
            const idx = series.episodes.findIndex((e) => e.slug === epSlug);
            if (idx === -1) return undefined;
            return {
                prev: idx > 0 ? series.episodes[idx - 1] : null,
                next: idx < series.episodes.length - 1 ? series.episodes[idx + 1] : null,
            };
        },
    });

    // Expose path prefix to templates
    eleventyConfig.addGlobalData('pathPrefix', PATH_PREFIX || '');

    // Expose canonical site URL to templates
    eleventyConfig.addGlobalData('siteUrl', SITE_URL);

    return {
        pathPrefix: PATH_PREFIX || '/',
        dir: {
            input: '.',
            output: '_site',
            includes: 'site/_includes',
            data: 'site/_data',
        },
        markdownTemplateEngine: 'njk',
        htmlTemplateEngine: 'njk',
    };
}
