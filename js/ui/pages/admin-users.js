(function (OA) {
  'use strict';
  const h = OA.dom.h;
  const render = async function () {
    const t = OA.t; const app = h('section', {}); const search = h('input', { class:'oa-input', type:'search', placeholder:t('search'), 'aria-label':t('search') });
    const message = h('p', { class:'oa-muted', role:'status' }); const list = h('div', { class:'oa-card' });
    const draw = async function () {
      const result = await OA.services.users.list(search.value); if (!result.ok) { message.textContent = t(result.error.messageKey); return; }
      list.replaceChildren(); message.textContent = t('userCount', { count:result.data.length });
      if (!result.data.length) list.append(h('p', { class:'oa-muted' }, t('noUsers')));
      result.data.forEach(function (user) {
        const role = h('select', { class:'oa-input', 'aria-label':t('role') }, h('option', { value:'trainee', selected:user.role === 'trainee' }, t('trainee')), h('option', { value:'trainer', selected:user.role === 'trainer' }, t('trainer')));
        const controls = h('div', { class:'oa-user-actions' }, h('button', { class:'oa-button oa-button-secondary', type:'button', onclick:async function () { const response = await OA.services.users.setRole(user.id,role.value,user.branchId); message.textContent = t(response.ok ? 'roleUpdated' : response.error.messageKey); await draw(); } }, t('save')), h('button', { class:'oa-button oa-button-secondary', type:'button', disabled:user.status !== 'active', onclick:async function () { await OA.services.users.disable(user.id); await draw(); } }, t('disable')));
        list.append(h('div', { class:'oa-user-row' }, h('div', {}, h('strong', {}, user.fullNameAr), h('p', { class:'oa-muted' }, (user.email || user.username) + ' · ' + t(user.role) + ' · ' + t(user.status))), controls, role));
      });
    };
    const form = h('form', { class:'oa-card oa-user-form', onsubmit:async function (event) { event.preventDefault(); const fields = new FormData(form); const result = await OA.services.users.create(Object.fromEntries(fields.entries())); if (!result.ok) { message.textContent = t(result.error.messageKey); message.className = 'oa-alert'; return; } message.className = 'oa-badge'; message.textContent = t('enabled') + ' ' + t('password') + ': ' + result.data.temporaryPassword; form.reset(); await draw(); } });
    [['fullNameAr','fullName'],['username','username'],['email','email']].forEach(function (field) { const input = h('input', { class:'oa-input', name:field[0], required:'', type:field[0] === 'email' ? 'email' : 'text' }); form.append(h('label', { class:'oa-field' }, h('span', {}, t(field[1])), input)); });
    const role = h('select', { class:'oa-input', name:'role' }, h('option', { value:'trainee' }, t('trainee')), h('option', { value:'trainer' }, t('trainer'))); const branch = h('select', { class:'oa-input', name:'branchId' });
    const branches = await OA.repo.branches.list(); branches.forEach(function (item) { branch.append(h('option', { value:item.id }, item.nameAr)); }); form.append(h('label', { class:'oa-field' }, h('span', {}, t('role')), role), h('label', { class:'oa-field' }, h('span', {}, t('branch')), branch), h('button', { class:'oa-button', type:'submit' }, t('save')));
    if (OA.cloud.enabled) { form.hidden = true; message.textContent = t('cloudRegistrationHelp'); }
    app.append(h('div', { class:'oa-page-head' }, h('div', {}, h('p', { class:'oa-eyebrow' }, t('role_admin')), h('h1', {}, t('users'))), h('span', { class:'oa-badge' }, t('status'))), form, h('label', { class:'oa-field' }, h('span', {}, t('search')), search), message, list);
    search.addEventListener('input', draw); await draw(); return app;
  };
  OA.pages = OA.pages || {}; OA.pages.adminUsers = { render:render };
})(window.OA = window.OA || {});
