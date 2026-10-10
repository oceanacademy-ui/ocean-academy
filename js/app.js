(function (OA) {
  'use strict';
  const registerRoutes = function () {
    OA.router.register('/login', { render:OA.pages.login });
    OA.router.register('/admin/:page/:courseId', { roles:['admin'], render:OA.pages.shell });
    OA.router.register('/trainer/:page/:courseId', { roles:['trainer'], render:OA.pages.shell });
    OA.router.register('/403', { render:function () { OA.pages.shell({ user:{ role:'trainee', fullNameAr:'—' }, params:{ page:'403' } }); } });
    OA.router.register('/404', { render:function () { OA.pages.shell({ user:{ role:'trainee', fullNameAr:'—' }, params:{ page:'404' } }); } });
    OA.router.register('/trainee/learn/:courseId', { roles:['trainee'], render:OA.pages.shell });
    ['admin','trainer','trainee'].forEach(function (role) { OA.router.register('/' + role + '/:page', { roles:[role], render:OA.pages.shell }); });
  };
  const start = async function () { const root = OA.dom.$('#app'); const showStartup = function (key) { root.replaceChildren(OA.dom.h('div', { class:'oa-login-wrap' }, OA.dom.h('section', { class:'oa-card oa-startup', role:'status' }, OA.t(key)))); }; try { showStartup('starting'); await OA.store.open(); if (!OA.cloud.enabled) { showStartup('seedingCore'); await OA.seedCore(); showStartup('seedingCourses'); await OA.seedCourses(); } showStartup('routing'); const session = OA.cloud.enabled ? OA.cloud.session() : JSON.parse(localStorage.getItem('oa_session') || 'null'); if (session && session.activityAt && Date.now() - session.activityAt <= 1800000) { const user = await OA.repo.users.get(OA.cloud.enabled ? session.user.id : session.userId); if (user && user.status === 'active') OA.state.user = user; else if (OA.cloud.enabled) OA.cloud.clearSession(); } registerRoutes(); if (!OA.state.user) OA.pages.login(); OA.router.start(); } catch (error) { OA.log.error(error); root.replaceChildren(OA.dom.h('div', { class:'oa-login-wrap' }, OA.dom.h('section', { class:'oa-card oa-startup', role:'alert' }, OA.dom.h('h1', {}, OA.t('startupFailed')), OA.dom.h('p', {}, OA.cloud.enabled ? OA.t('cloudError') : OA.t('dbError')), OA.dom.h('pre', { class:'oa-error-detail' }, error && error.message ? error.message : '')))); } };
  document.addEventListener('pointerdown', OA.services.auth.touch);
  document.addEventListener('keydown', OA.services.auth.touch);
  window.setInterval(function () { if (localStorage.getItem('oa_session') && !OA.services.auth.currentUser()) OA.router.navigate('/login'); }, 30000);
  start();
})(window.OA = window.OA || {});
