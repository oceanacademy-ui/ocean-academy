(function (OA) {
  'use strict';
  const fail = function (code, key) { return { ok:false, error:{ code:code, messageKey:key } }; };
  const allowedImage = function (file) {
    const extension = (file.name.split('.').pop() || '').toLowerCase();
    return ['jpg','jpeg','png','webp'].includes(extension) && (!file.type || file.type.indexOf('image/') === 0);
  };
  const today = function () { const now = new Date(); return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-'); };
  const validDate = function (value) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '') || value > today()) return false; const parts = value.split('-').map(Number); const date = new Date(parts[0], parts[1] - 1, parts[2]); return date.getFullYear() === parts[0] && date.getMonth() === parts[1] - 1 && date.getDate() === parts[2]; };
  const failStorage = function () { return fail('STORAGE', 'salesUploadFailed'); };
  const saveAudit = async function (user, action, recordId) { await OA.repo.auditLog.save({ actorId:user.id, action:action, entity:'salesSubmissions', entityId:recordId, at:new Date().toISOString() }); };
  const storeImages = async function (files, user) {
    const ids = [];
    for (const file of files) { const blob = await OA.repo.blobs.save({ mime:file.type || 'application/octet-stream', size:file.size, name:file.name, data:file, ownerId:user.id }); ids.push(blob.id); }
    return ids;
  };
  const submit = async function (input) {
    const user = OA.services.auth.currentUser();
    if (!user || user.role !== 'trainee') return fail('FORBIDDEN', 'forbidden');
    const files = Array.from(input.files || []); const descriptionAr = (input.descriptionAr || '').trim();
    if (!input.consentConfirmed) return fail('CONSENT_REQUIRED', 'salesPrivacyRequired');
    if (descriptionAr.length < 5 || descriptionAr.length > 1000 || !validDate(input.saleDate)) return fail('INVALID', 'salesFieldsInvalid');
    if (!files.length || files.length > 5 || files.some(function (file) { return !allowedImage(file) || !file.size || file.size > 10 * 1024 * 1024; })) return fail('INVALID_FILE', 'salesImagesInvalid');
    try {
      const imageBlobIds = await storeImages(files, user);
      const saved = await OA.repo.salesSubmissions.save({ userId:user.id, descriptionAr:descriptionAr, saleDate:input.saleDate, imageBlobIds:imageBlobIds, status:'pending', consentConfirmed:true, submittedAt:new Date().toISOString(), reviewedBy:null, reviewedAt:null, reviewNote:'' });
      await saveAudit(user, 'sales.submit', saved.id); return { ok:true, data:saved };
    } catch (_) { return failStorage(); }
  };
  const list = async function () {
    const user = OA.services.auth.currentUser(); if (!user || !['admin','trainer','trainee'].includes(user.role)) return fail('FORBIDDEN', 'forbidden');
    const users = await OA.repo.users.list(); const visible = (await OA.repo.salesSubmissions.list()).filter(function (item) { return user.role !== 'trainee' || item.status === 'approved' || item.userId === user.id; });
    visible.sort(function (a,b) { return (b.submittedAt || '').localeCompare(a.submittedAt || ''); });
    return { ok:true, data:visible.map(function (item) { const owner = users.find(function (entry) { return entry.id === item.userId; }); const reviewer = users.find(function (entry) { return entry.id === item.reviewedBy; }); return Object.assign({}, item, { traineeNameAr:owner ? owner.fullNameAr : '', reviewerNameAr:reviewer ? reviewer.fullNameAr : '' }); }) };
  };
  const review = async function (id, decision, note) {
    const user = OA.services.auth.currentUser(); if (!user || user.role !== 'trainer') return fail('FORBIDDEN', 'forbidden');
    if (!['approved','rejected'].includes(decision)) return fail('INVALID', 'salesReviewInvalid');
    const item = await OA.repo.salesSubmissions.get(id); if (!item || item.status !== 'pending') return fail('NOT_FOUND', 'salesAlreadyReviewed');
    const reviewNote = (note || '').trim(); if (reviewNote.length > 300) return fail('INVALID', 'salesReviewNoteRequired');
    if (decision === 'rejected' && !reviewNote) return fail('INVALID', 'salesReviewNoteRequired');
    const saved = await OA.repo.salesSubmissions.save(Object.assign({}, item, { status:decision, reviewedBy:user.id, reviewedAt:new Date().toISOString(), reviewNote:reviewNote }));
    await saveAudit(user, 'sales.' + decision, id); return { ok:true, data:saved };
  };
  const asset = async function (submissionId, blobId) {
    const user = OA.services.auth.currentUser(); const item = await OA.repo.salesSubmissions.get(submissionId);
    if (!user || !item || !(item.imageBlobIds || []).includes(blobId)) return fail('NOT_FOUND', 'salesNotFound');
    if (user.role === 'trainee' && item.status !== 'approved' && item.userId !== user.id) return fail('FORBIDDEN', 'forbidden');
    if (!['admin','trainer','trainee'].includes(user.role)) return fail('FORBIDDEN', 'forbidden');
    const blob = await OA.repo.blobs.get(blobId); return blob ? { ok:true, data:blob } : fail('NOT_FOUND', 'salesNotFound');
  };
  const safe = async function (operation) { try { return await operation(); } catch (_) { return fail('STORAGE', 'salesOperationFailed'); } };
  OA.services.sales = {
    submit:function (input) { return safe(function () { return submit(input); }); },
    list:function () { return safe(list); },
    review:function (id, decision, note) { return safe(function () { return review(id, decision, note); }); },
    asset:function (id, blobId) { return safe(function () { return asset(id, blobId); }); }
  };
})(window.OA = window.OA || {});
