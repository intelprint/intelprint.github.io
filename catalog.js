(() => {
  const endpoint = document.currentScript.dataset.endpoint;
  const status = document.getElementById('catalog-status');
  let ownerBranches;
  let refreshOnReturn = false;
  function apply(branches) {
    window.catalogLoaded = true;
    status.hidden = true;
    window.dispatchEvent(new CustomEvent('intelprint:catalog', {detail: branches}));
  }
  async function loadPublic(refresh = false) {
    if (!refresh) status.textContent = '목록을 불러오는 중…';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(endpoint + '?view=public', {
        credentials: 'omit', cache: 'no-store', signal: controller.signal
      });
      if (!response.ok) throw new Error('catalog');
      const branches = await response.json();
      if (branches.length !== 1 || branches[0].key !== 'study' || !Array.isArray(branches[0].apps)) throw new Error('catalog');
      if (!ownerBranches) {
        apply(branches);
      } else if (refresh) {
        const shared = branches[0];
        const previous = ownerBranches.find(branch => branch.key === 'study');
        const ids = new Map(previous.apps.map(app => [app.url, app.id]));
        shared.apps.forEach(app => { app.id = ids.get(app.url); });
        ownerBranches = ownerBranches.map(branch => branch.key === 'study' ? shared : branch);
        apply(ownerBranches);
      }
    } catch {
      if (ownerBranches || refresh) return;
      status.textContent = '공유 앱 목록을 가져오지 못했어요. ';
      const retry = document.createElement('button');
      retry.textContent = '다시 시도';
      retry.onclick = () => loadPublic();
      status.append(retry);
    } finally {
      clearTimeout(timer);
    }
  }
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== parent || event.data?.type !== 'intelprint:owner') return;
    ownerBranches = event.data.branches;
    apply(ownerBranches);
  });
  window.addEventListener('intelprint:manage-shared', () => { refreshOnReturn = true; });
  function refreshAfterEditing() {
    if (!refreshOnReturn || document.hidden) return;
    refreshOnReturn = false;
    loadPublic(true);
  }
  document.addEventListener('visibilitychange', refreshAfterEditing);
  window.addEventListener('focus', refreshAfterEditing);
  document.getElementById('account-help').addEventListener('click', event => {
    event.preventDefault();
    parent.postMessage({type: 'intelprint:help'}, location.origin);
  });
  parent.postMessage({type: 'intelprint:home-ready'}, location.origin);
  loadPublic();
})();
