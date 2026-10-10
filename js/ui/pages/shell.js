(function (OA) {
  'use strict';
  const h = OA.dom.h;
  const links = { admin:[['dashboard','dashboard'],['users','users'],['courses','courses'],['sales','sales'],['sessions','sessions'],['reports','reports'],['settings','settings']], trainer:[['dashboard','dashboard'],['courses','courses'],['sales','sales'],['sessions','sessions']], trainee:[['home','home'],['courses','courses'],['sales','sales'],['sessions','sessions']] };
  const dashboard = async function (user, pageName) {
    const t = OA.t; const users = await OA.repo.users.list(); const courses = await OA.repo.courses.list(); const sessions = await OA.repo.sessions.list();
    const activeCourses = courses.filter(function (course) { return ['published','running'].includes(course.status); });
    const enrollment = user.role === 'trainee' ? (await OA.repo.enrollments.list()).filter(function (entry) { return entry.userId === user.id && entry.status !== 'dropped'; }) : [];
    const stats = user.role === 'admin' ? [['learners',users.filter(function (u) { return u.role === 'trainee'; }).length],['activeCourses',activeCourses.length],['sessions',sessions.length],['branches',(await OA.repo.branches.list()).length]] : user.role === 'trainer' ? [['myCourses',courses.filter(function (course) { return (course.trainerIds || []).includes(user.id); }).length],['activeCourses',activeCourses.length],['sessions',sessions.length],['learners',users.filter(function (u) { return u.role === 'trainee'; }).length]] : [['myCourses',enrollment.length],['learningProgress',enrollment.length ? Math.round(enrollment.reduce(function (sum, item) { return sum + (item.progressPct || 0); }, 0) / enrollment.length) + '%' : '0%'],['activeCourses',activeCourses.length],['sessions',sessions.length]];
    const grid = h('div', { class:'oa-grid' }); stats.forEach(function (item) { grid.append(h('article', { class:'oa-card oa-stat' }, h('span', {}, t(item[0])), h('strong', {}, String(item[1])))); });
    const courseLink = h('a', { class:'oa-button', href:'#/' + user.role + '/courses' }, t(user.role === 'trainee' ? 'browseCourses' : 'manageCourses'));
    return h('div', {}, h('div', { class:'oa-welcome' }, h('p', { class:'oa-eyebrow' }, t('overview')), h('h1', {}, t('welcome', { name:user.fullNameAr }))), grid, h('section', { class:'oa-activity oa-card' }, h('div', { class:'oa-page-head' }, h('h2', {}, t(pageName === 'home' ? 'learningPath' : 'quickAccess'))), h('p', { class:'oa-muted' }, t(user.role === 'trainee' ? 'learningHint' : 'academyHint')), courseLink));
  };
  const shell = async function (ctx) {
    const user = ctx.user; const pageName = ctx.params.page || (ctx.params.courseId ? 'learn' : 'dashboard');
    if (pageName === '403' || pageName === '404') { OA.dom.mount(OA.dom.$('#app'), h('div', { class:'oa-login-wrap' }, h('section', { class:'oa-card' }, h('h1', {}, OA.t(pageName === '403' ? 'forbidden' : 'notFound')), h('a', { class:'oa-button', href:'#/login' }, OA.t('login'))))); return; }
    const app = h('div', { class:'oa-shell' }); const menu = h('nav', { class:'oa-nav', 'aria-label':OA.t('dashboard') });
    (links[user.role] || links.trainee).forEach(function (item) { const href = '#/' + user.role + '/' + item[0]; menu.append(h('a', { href:href, 'aria-current':location.hash === href ? 'page' : null }, OA.t(item[1]))); });
    const sidebar = h('aside', { class:'oa-sidebar' }, h('a', { class:'oa-brand', href:'#/' + user.role + '/dashboard' }, h('img', { class:'oa-brand-logo', src:'assets/img/ocean-academy-logo.jpg', alt:'' }), OA.t('brand')), menu, h('div', { class:'oa-sidebar-foot oa-muted' }, OA.t('networkNote')));
    const main = h('div', { class:'oa-main' }); const top = h('header', { class:'oa-topbar' }, h('strong', {}, user.fullNameAr), h('div', { class:'oa-top-actions' }, h('button', { class:'oa-button oa-button-secondary', onclick:function () { OA.setLang(document.documentElement.lang === 'ar' ? 'en' : 'ar'); shell(ctx); } }, OA.t('language')), h('button', { class:'oa-button oa-button-secondary', onclick:OA.services.auth.logout }, OA.t('logout'))));
    let view;
    if (pageName === 'sales') view = await OA.pages.sales.render(user);
    else if (pageName === 'course-content') view = await OA.pages.courseEditor.render(user, ctx.params.courseId);
    else if (user.role === 'admin' && pageName === 'users') view = await OA.pages.adminUsers.render(user);
    else if (['courses','my-courses'].includes(pageName) || ctx.params.courseId) view = await OA.pages.courses.render(user, ctx.params);
    else view = await dashboard(user, pageName);
    main.append(top, h('div', { class:'oa-content' }, view)); app.append(sidebar, main); OA.dom.mount(OA.dom.$('#app'), app);
  };
  OA.pages = OA.pages || {}; OA.pages.shell = shell;
})(window.OA = window.OA || {});
