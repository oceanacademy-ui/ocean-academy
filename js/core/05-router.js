(function (OA) {
  'use strict';
  const routes = [];
  let started = false;
  const parse = function (path) {
    for (const route of routes) {
      const names = [];
      const pattern = route.path.replace(/:[^/]+/g, function (token) { names.push(token.slice(1)); return '([^/]+)'; });
      const match = path.match(new RegExp('^' + pattern + '$'));
      if (match) return { route:route, params:Object.fromEntries(names.map(function (name, index) { return [name, decodeURIComponent(match[index + 1])]; })) };
    }
    return null;
  };
  const showError = function (error) {
    OA.log.error(error);
    OA.dom.mount(OA.dom.$('#app'), OA.dom.h('div', { class:'oa-login-wrap' }, OA.dom.h('section', { class:'oa-card oa-startup', role:'alert' }, OA.dom.h('h1', {}, OA.t('startupFailed')), OA.dom.h('p', {}, OA.t('pageError')), OA.dom.h('pre', { class:'oa-error-detail' }, error && error.message ? error.message : ''))));
  };
  const go = async function () {
    try {
      const path = location.hash.slice(1) || '/login';
      let found = parse(path) || parse('/404');
      let user = OA.services.auth.currentUser();
      if (found.route.roles && (!user || !found.route.roles.includes(user.role))) {
        if (!user) { OA.router.navigate('/login'); return; }
        found = parse('/403');
      }
      OA.state.route = path;
      await found.route.render({ params:found.params, user:user });
      window.dispatchEvent(new CustomEvent('oa:route'));
    } catch (error) { showError(error); }
  };
  OA.router = {
    register: function (path, config) { routes.push(Object.assign({ path:path }, config)); },
    navigate: function (path) { const next = path.charAt(0) === '#' ? path : '#/' + path.replace(/^\//, ''); if (location.hash === next) go(); else location.hash = next; },
    start: function () { if (!started) { started = true; window.addEventListener('hashchange', go); } go(); }
  };
})(window.OA = window.OA || {});
