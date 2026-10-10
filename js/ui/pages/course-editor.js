(function (OA) {
  'use strict';
  const h = OA.dom.h;
  const field = function (label, control) { return h('label', { class:'oa-field' }, h('span', {}, label), control); };
  const urlFor = async function (courseId, blobId) { if (!blobId) return ''; const result = await OA.services.courseContent.asset(courseId, blobId); return result.ok ? URL.createObjectURL(result.data.data) : ''; };
  const fileControl = function (accept, multiple) { return h('input', { class:'oa-input', type:'file', accept:accept, multiple:multiple || false }); };
  const saveCoverForm = async function (course, user, preview) {
    const file = fileControl('.jpg,.jpeg,.png,.webp'); const message = h('p', { class:'oa-muted', role:'status' });
    const form = h('form', { class:'oa-card oa-content-form', onsubmit:async function (event) { event.preventDefault(); if (!file.files[0]) { message.textContent = OA.t('selectCover'); return; } const result = await OA.services.courseContent.saveCover(course.id, file.files[0]); if (!result.ok) { message.textContent = OA.t(result.error.messageKey); return; } await OA.pages.shell({ user:user, params:{ page:'course-content', courseId:course.id } }); } });
    form.append(h('h2', {}, OA.t('courseCover'))); if (preview) form.append(preview);
    form.append(field(OA.t('chooseCover'), file), message, h('button', { class:'oa-button', type:'submit' }, OA.t('saveCover'))); return form;
  };
  const lessonForm = async function (course, modules, lessons, user, selected) {
    const moduleSelect = h('select', { class:'oa-input', name:'moduleId' }); moduleSelect.append(h('option', { value:'' }, OA.t('newModule')));
    modules.forEach(function (item) { moduleSelect.append(h('option', { value:item.id }, item.titleAr)); });
    moduleSelect.value = selected ? selected.moduleId : '';
    const moduleTitle = h('input', { class:'oa-input', value:selected ? (modules.find(function (item) { return item.id === selected.moduleId; }) || {}).titleAr || '' : '', required:'', maxlength:'100' });
    const title = h('input', { class:'oa-input', value:selected ? selected.titleAr : '', required:'', maxlength:'120' });
    const text = h('textarea', { class:'oa-input', rows:'4' }); text.value = selected && selected.content ? selected.content.textAr || '' : '';
    const attachments = fileControl('.pdf,.ppt,.pptx,.jpg,.jpeg,.png,.webp', true); const video = fileControl('.mp4,.webm,.ogg');
    const status = h('p', { class:'oa-muted', role:'status' }); const existing = selected && selected.content ? selected.content : {}; const removeIds = [];
    const form = h('form', { class:'oa-card oa-content-form', onsubmit:async function (event) {
      event.preventDefault(); const result = await OA.services.courseContent.saveLesson({ courseId:course.id, moduleId:moduleSelect.value, moduleTitleAr:moduleTitle.value, lessonId:selected && selected.id, titleAr:title.value, textAr:text.value, files:Array.from(attachments.files), videoFile:video.files[0], removeAssetIds:removeIds, removeVideo:removeVideo.checked });
      if (!result.ok) { status.textContent = OA.t(result.error.messageKey); return; } await OA.pages.shell({ user:user, params:{ page:'course-content', courseId:course.id } });
    } });
    form.append(h('h2', {}, selected ? OA.t('editLesson') : OA.t('addLesson')), field(OA.t('module'), moduleSelect), field(OA.t('moduleTitle'), moduleTitle), field(OA.t('lessonTitle'), title), field(OA.t('lessonText'), text));
    if (existing.attachments && existing.attachments.length) form.append(h('div', { class:'oa-existing-files' }, h('strong', {}, OA.t('currentFiles')), existing.attachments.map(function (item) { const remove = h('input', { type:'checkbox', value:item.blobId }); remove.addEventListener('change', function () { if (remove.checked) removeIds.push(item.blobId); else removeIds.splice(removeIds.indexOf(item.blobId), 1); }); return field(item.name + ' · ' + OA.t('removeFile'), remove); })));
    form.append(h('p', { class:'oa-muted' }, OA.t('uploadLimits')), field(OA.t('lessonFiles'), attachments), field(OA.t('lessonVideo'), video));
    const removeVideo = h('input', { type:'checkbox' });
    if (existing.videoBlobId) { form.append(h('p', { class:'oa-muted' }, existing.videoName || OA.t('currentVideo')), field(OA.t('removeCurrentVideo'), removeVideo)); }
    form.append(status, h('button', { class:'oa-button', type:'submit' }, OA.t('saveLesson'))); return form;
  };
  const render = async function (user, courseId) {
    const result = await OA.services.courseContent.managerContent(courseId);
    if (!result.ok) return h('section', { class:'oa-card' }, h('p', {}, OA.t(result.error.messageKey)));
    const data = result.data; const coverUrl = await urlFor(courseId, data.course.coverBlobId);
    const preview = coverUrl ? h('img', { class:'oa-course-cover', src:coverUrl, alt:data.course.titleAr }) : null;
    const cover = await saveCoverForm(data.course, user, preview); const formArea = h('div', { class:'oa-editor-form-area' });
    formArea.append(await lessonForm(data.course, data.modules, data.lessons, user, null));
    const newButton = h('button', { class:'oa-button oa-button-secondary', type:'button', onclick:async function () { formArea.replaceChildren(await lessonForm(data.course, data.modules, data.lessons, user, null)); } }, OA.t('addLesson'));
    const items = h('div', { class:'oa-lesson-list' });
    data.modules.forEach(function (module) { items.append(h('h2', {}, module.titleAr)); data.lessons.filter(function (lesson) { return lesson.moduleId === module.id; }).forEach(function (lesson) { const edit = h('button', { class:'oa-button oa-button-secondary', type:'button', onclick:async function () { formArea.replaceChildren(await lessonForm(data.course, data.modules, data.lessons, user, lesson)); } }, OA.t('editLesson')); items.append(h('article', { class:'oa-card oa-lesson-card' }, h('div', {}, h('h3', {}, lesson.titleAr), h('p', { class:'oa-muted' }, (lesson.content && lesson.content.textAr) || '')), edit)); }); });
    return h('section', {}, h('div', { class:'oa-page-head' }, h('div', {}, h('p', { class:'oa-eyebrow' }, OA.t('courseManagement')), h('h1', {}, data.course.titleAr)), h('a', { class:'oa-button oa-button-secondary', href:'#/' + user.role + '/courses' }, OA.t('backToCourses'))), cover, h('div', { class:'oa-page-head' }, h('h2', {}, OA.t('courseContent')), newButton), formArea, items);
  };
  OA.pages = OA.pages || {}; OA.pages.courseEditor = { render:render };
})(window.OA = window.OA || {});
