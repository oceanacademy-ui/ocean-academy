(function (OA) {
  'use strict';
  const h = OA.dom.h;
  const localDate = function () { const now = new Date(); return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-'); };
  const photoUrl = async function (submission, blobId) { const result = await OA.services.sales.asset(submission.id, blobId); return result.ok ? URL.createObjectURL(result.data.data) : ''; };
  const uploadForm = function (user, message) {
    const files = h('input', { class:'oa-input', type:'file', accept:'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp', multiple:true, required:'' });
    const description = h('textarea', { class:'oa-input', rows:'4', required:'', maxlength:'1000' });
    const date = h('input', { class:'oa-input', type:'date', required:'', max:localDate(), value:localDate() });
    const consent = h('input', { type:'checkbox', required:'' }); const status = h('p', { class:'oa-muted', role:'status' });
    const form = h('form', { class:'oa-card oa-sales-form', onsubmit:async function (event) {
      event.preventDefault(); const result = await OA.services.sales.submit({ files:Array.from(files.files), descriptionAr:description.value, saleDate:date.value, consentConfirmed:consent.checked });
      if (!result.ok) { status.textContent = OA.t(result.error.messageKey); return; } message.textContent = OA.t('salesSubmitted'); form.reset(); date.value = localDate(); await OA.pages.shell({ user:user, params:{ page:'sales' } });
    } });
    form.append(h('h2', {}, OA.t('submitSale')), h('p', { class:'oa-alert' }, OA.t('salesPrivacyNotice')), field(OA.t('invoicePhotos'), files), field(OA.t('saleDescription'), description), field(OA.t('saleDate'), date), field(OA.t('salesPrivacyConfirm'), consent), status, h('button', { class:'oa-button', type:'submit' }, OA.t('submitForReview'))); return form;
  };
  const field = function (label, control) { return h('label', { class:'oa-field' }, h('span', {}, label), control); };
  const reviewActions = function (item, user, status) {
    const note = h('textarea', { class:'oa-input', rows:'2', maxlength:'300', placeholder:OA.t('salesReviewNote') });
    const approve = h('button', { class:'oa-button', type:'button', onclick:async function () { const result = await OA.services.sales.review(item.id, 'approved', note.value); status.textContent = OA.t(result.ok ? 'salesApproved' : result.error.messageKey); await OA.pages.shell({ user:user, params:{ page:'sales' } }); } }, OA.t('approveSale'));
    const reject = h('button', { class:'oa-button oa-button-secondary', type:'button', onclick:async function () { const result = await OA.services.sales.review(item.id, 'rejected', note.value); status.textContent = OA.t(result.ok ? 'salesRejected' : result.error.messageKey); await OA.pages.shell({ user:user, params:{ page:'sales' } }); } }, OA.t('rejectSale'));
    return h('div', { class:'oa-sales-review' }, field(OA.t('salesReviewNote'), note), approve, reject);
  };
  const card = async function (item, user, status) {
    const photos = h('div', { class:'oa-sales-photos' });
    for (const id of item.imageBlobIds || []) { const url = await photoUrl(item, id); if (url) photos.append(h('a', { href:url, target:'_blank', rel:'noopener', 'aria-label':OA.t('openInvoicePhoto') }, h('img', { src:url, alt:OA.t('invoicePhotoAlt') }))); }
    const children = [h('div', { class:'oa-course-meta' }, h('span', { class:'oa-badge' }, OA.t('sales_' + item.status)), h('span', { class:'oa-muted' }, item.saleDate)), h('p', { class:'oa-muted' }, OA.t('salesBy') + ': ' + (item.traineeNameAr || OA.t('trainee'))), h('p', {}, item.descriptionAr), photos];
    if (item.reviewNote) children.push(h('p', { class:'oa-muted' }, OA.t('salesReviewNote') + ': ' + item.reviewNote));
    if (user.role === 'trainer' && item.status === 'pending') children.push(reviewActions(item, user, status));
    return h('article', { class:'oa-card oa-sales-card' }, children);
  };
  const render = async function (user) {
    const result = await OA.services.sales.list();
    if (!result.ok) return h('section', { class:'oa-card' }, h('p', {}, OA.t(result.error.messageKey)));
    const items = result.data; const approved = items.filter(function (item) { return item.status === 'approved'; });
    const own = user.role === 'trainee' ? items.filter(function (item) { return item.userId === user.id && item.status !== 'approved'; }) : [];
    const pending = user.role === 'trainer' ? items.filter(function (item) { return item.status === 'pending'; }) : [];
    const status = h('p', { class:'oa-muted', role:'status' }); const gallery = h('div', { class:'oa-sales-grid' });
    for (const item of (user.role === 'admin' ? items : approved)) gallery.append(await card(item, user, status));
    const sections = [h('div', { class:'oa-page-head' }, h('div', {}, h('p', { class:'oa-eyebrow' }, OA.t('sales')), h('h1', {}, OA.t('salesTitle')))), status];
    if (user.role === 'trainee') sections.push(uploadForm(user, status));
    if (user.role === 'trainer') { const queue = h('div', { class:'oa-sales-grid' }); for (const item of pending) queue.append(await card(item, user, status)); sections.push(h('h2', {}, OA.t('salesReviewQueue')), queue); }
    if (own.length) { const ownList = h('div', { class:'oa-sales-grid' }); for (const item of own) ownList.append(await card(item, user, status)); sections.push(h('h2', {}, OA.t('mySalesSubmissions')), ownList); }
    sections.push(h('h2', {}, OA.t(user.role === 'admin' ? 'allSalesSubmissions' : 'approvedSales')), gallery.childElementCount ? gallery : h('div', { class:'oa-card oa-empty' }, h('p', {}, OA.t('salesEmpty'))));
    return h('section', {}, sections);
  };
  OA.pages = OA.pages || {}; OA.pages.sales = { render:render };
})(window.OA = window.OA || {});
