(function (OA) {
  'use strict';
  const h = OA.dom.h;
  const render = async function () {
    const app = OA.dom.$('#app'); let mode = 'login'; let firstAdmin = false;
    const error = h('div', { class:'oa-alert', role:'alert', hidden:true }); const nameFields = h('div', { hidden:true });
    const email = h('input', { class:'oa-input', name:'email', type:OA.cloud.enabled ? 'email' : 'text', autocomplete:'username', required:'', 'aria-label':OA.t(OA.cloud.enabled ? 'email' : 'username') });
    const username = h('input', { class:'oa-input', name:'username', type:'text', autocomplete:'username', 'aria-label':OA.t('username') });
    const fullName = h('input', { class:'oa-input', name:'fullNameAr', type:'text', autocomplete:'name', 'aria-label':OA.t('fullName') });
    const password = h('input', { class:'oa-input', name:'password', type:'password', autocomplete:'current-password', required:'', 'aria-label':OA.t('password') });
    const emailField = h('div', { class:'oa-field' }, h('label', { for:'oa-email' }, OA.t(OA.cloud.enabled ? 'email' : 'username')), email);
    const passwordField = h('div', { class:'oa-field' }, h('label', { for:'oa-password' }, OA.t('password')), password); email.id = 'oa-email'; password.id = 'oa-password';
    const nameField = h('div', { class:'oa-field' }, h('label', { for:'oa-name' }, OA.t('fullName')), fullName);
    const userField = h('div', { class:'oa-field' }, h('label', { for:'oa-username' }, OA.t('username')), username); fullName.id = 'oa-name'; username.id = 'oa-username';
    nameFields.append(nameField,userField);
    const submit = h('button', { class:'oa-button', type:'submit' }, OA.t('signIn'));
    const form = h('form', { class:'oa-card oa-login-card', onsubmit:async function (event) {
      event.preventDefault(); error.hidden = true; const emailValue = email.value.trim(); const passwordValue = password.value;
      const result = mode === 'setup' ? await OA.services.auth.bootstrapAdmin(emailValue,passwordValue,fullName.value,username.value) : mode === 'register' ? await OA.services.auth.registerTrainee(emailValue,passwordValue,fullName.value,username.value) : await OA.services.auth.login(emailValue,passwordValue);
      if (result.ok && result.data.confirmationRequired) { error.textContent = OA.t('adminCheckEmail'); error.hidden = false; return; }
      if (result.ok) OA.router.navigate('/' + result.data.role + '/dashboard'); else { error.textContent = OA.t(result.error.messageKey); error.hidden = false; }
    } });
    const setMode = function (next) { mode = next; const needsDetails = mode === 'setup' || mode === 'register'; nameFields.hidden = !needsDetails; username.required = needsDetails; fullName.required = needsDetails; password.autocomplete = needsDetails ? 'new-password' : 'current-password'; submit.textContent = OA.t(mode === 'setup' ? 'createAdmin' : mode === 'register' ? 'registerTrainee' : 'signIn'); setup.textContent = OA.t(mode === 'setup' ? 'cancel' : 'createFirstAdmin'); register.textContent = OA.t(mode === 'register' ? 'cancel' : 'registerTrainee'); error.hidden = true; };
    const setup = h('button', { class:'oa-button oa-button-secondary', type:'button', hidden:true, onclick:function () { setMode(mode === 'setup' ? 'login' : 'setup'); } }, OA.t('createFirstAdmin'));
    const register = h('button', { class:'oa-button oa-button-secondary', type:'button', hidden:true, onclick:function () { setMode(mode === 'register' ? 'login' : 'register'); } }, OA.t('registerTrainee'));
    const demos = h('div', { class:'oa-demo' }, h('strong', {}, OA.t('demo')));
    if (!OA.cloud.enabled) [['admin','Admin123!'],['trainer','Trainer123!'],['trainee','Trainee123!']].forEach(function (account) { demos.append(h('button', { class:'oa-button oa-button-secondary', type:'button', onclick:function () { form.querySelector('[name="username"]').value = account[0]; password.value = account[1]; } }, account[0])); });
    const extras = [setup,register]; if (!OA.cloud.enabled) extras.push(demos); extras.push(h('p', { class:'oa-muted' }, OA.t(OA.cloud.enabled ? 'networkNoteCloud' : 'networkNote')), h('button', { class:'oa-button oa-button-secondary', type:'button', onclick:function () { OA.setLang(document.documentElement.lang === 'ar' ? 'en' : 'ar'); render(); } }, OA.t('language')));
    form.append(h('a', { class:'oa-brand', href:'#/login' }, h('img', { class:'oa-brand-logo', src:'assets/img/ocean-academy-logo.jpg', alt:'' }), OA.t('brand')), h('p', { class:'oa-muted' }, OA.t('tagline')), error, emailField, passwordField, nameFields, submit); form.append.apply(form,extras); OA.dom.mount(app, h('div', { class:'oa-login-wrap' }, form));
    if (OA.cloud.enabled) { try { firstAdmin = await OA.cloud.needsAdminSetup(); setup.hidden = !firstAdmin; register.hidden = firstAdmin; } catch (_) { setup.hidden = true; register.hidden = true; } }
  };
  OA.pages = OA.pages || {}; OA.pages.login = render;
})(window.OA = window.OA || {});
