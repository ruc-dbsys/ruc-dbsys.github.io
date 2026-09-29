(() => {
  const badges = document.querySelectorAll('[data-github-repo]');
  const cacheTTL = 5 * 60 * 1000;
  const numberFormat = new Intl.NumberFormat('en-US');

  badges.forEach(async (badge) => {
    const repo = badge.dataset.githubRepo;
    const count = badge.querySelector('.star-count');
    const key = `github-stars:v1:${repo}`;
    const valid = (entry) => entry && Number.isSafeInteger(entry.stars) &&
      entry.stars >= 0 && Number.isFinite(entry.updatedAt) &&
      entry.updatedAt > 0 && entry.updatedAt <= Date.now();
    const render = (entry, stale = false) => {
      count.textContent = numberFormat.format(entry.stars);
      badge.title = `${repo} · ${entry.stars} Stars · ${stale ? '上次同步' : '同步于'} ${new Date(entry.updatedAt).toLocaleString('zh-CN')}（新窗口）`;
      badge.setAttribute('aria-label', badge.title);
    };

    let cached;
    try {
      const entry = JSON.parse(localStorage.getItem(key));
      if (valid(entry)) cached = entry;
    } catch { /* Storage may be unavailable; fetching still works. */ }

    if (cached) {
      render(cached, Date.now() - cached.updatedAt >= cacheTTL);
      if (Date.now() - cached.updatedAt < cacheTTL) return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: { Accept: 'application/vnd.github+json' },
        signal: controller.signal,
        credentials: 'omit',
      });
      if (!response.ok) throw new Error('GitHub unavailable');
      const data = await response.json();
      const entry = { stars: data.stargazers_count, updatedAt: Date.now() };
      if (!valid(entry)) throw new Error('Invalid star count');
      render(entry);
      try { localStorage.setItem(key, JSON.stringify(entry)); } catch { /* Optional cache. */ }
    } catch {
      if (cached) render(cached, true);
      else {
        count.textContent = '查看';
        badge.title = '暂时无法同步 Star 数，点击前往 GitHub 查看（新窗口）';
        badge.setAttribute('aria-label', `${repo}：${badge.title}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  });
})();
