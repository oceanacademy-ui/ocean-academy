(function (OA) {
  'use strict';
  const h = OA.dom.h;
  const courseCard = function (course, actions, note, coverUrl) {
    return h('article', { class:'oa-card oa-course-card' }, coverUrl ? h('img', { class:'oa-course-thumb', src:coverUrl, alt:course.titleAr }) : null, h('div', { class:'oa-course-meta' }, h('span', { class:'oa-badge' }, OA.t(course.status || 'draft')), h('span', { class:'oa-muted' }, (course.durationHours || 1) + ' ' + OA.t('hours'))), h('h2', {}, course.titleAr), h('p', { class:'oa-muted' }, course.descriptionAr || OA.t('courseDescription')), note || null, h('div', { class:'oa-course-actions' }, actions));
  };
  const createForm = async function (user) {
    const trainers = (await OA.repo.users.list()).filter(function (item) { return item.role === 'trainer' && item.status === 'active'; });
    const title = h('input', { class:'oa-input', name:'titleAr', required:'', maxlength:'100' }); const description = h('textarea', { class:'oa-input', name:'descriptionAr', rows:'3' });
    const category = h('select', { class:'oa-input', name:'categoryId' }); (await OA.repo.categories.list()).forEach(function (item) { category.append(h('option', { value:item.id }, item.nameAr)); });
    const trainerSelect = h('select', { class:'oa-input', name:'trainerIds', required:'' }); trainers.forEach(function (item) { trainerSelect.append(h('option', { value:item.id }, item.fullNameAr)); });
    const message = h('p', { role:'status', class:'oa-muted' });
    const form = h('form', { class:'oa-card oa-course-form', onsubmit:async function (event) {
      event.preventDefault(); const selectedTrainer = user.role === 'trainer' ? user.id : trainerSelect.value;
      const result = await OA.services.courses.save({ titleAr:title.value, descriptionAr:description.value, categoryId:category.value, trainerIds:selectedTrainer ? [selectedTrainer] : [], maxSeats:20, durationHours:1, status:'published' });
      if (!result.ok) { message.textContent = OA.t(result.error.messageKey); return; }
      message.textContent = OA.t('courseSaved'); form.reset(); await OA.pages.shell({ user:user, params:{ page:'courses' } });
    } });
    form.append(h('h2', {}, OA.t('createCourse')), h('label', { class:'oa-field' }, h('span', {}, OA.t('courseTitle')), title), h('label', { class:'oa-field' }, h('span', {}, OA.t('courseDescription')), description), h('label', { class:'oa-field' }, h('span', {}, OA.t('category')), category));
    if (user.role === 'admin') form.append(h('label', { class:'oa-field' }, h('span', {}, OA.t('trainer')), trainerSelect));
    form.append(message, h('button', { class:'oa-button', type:'submit' }, OA.t('publishCourse'))); return form;
  };
  const assetUrl = async function (courseId, blobId) { if (!blobId) return ''; const result = await OA.services.courseContent.asset(courseId, blobId); return result.ok ? URL.createObjectURL(result.data.data) : ''; };
  const lessonMaterials = async function (courseId, lesson) {
    const content = lesson.content || {}; const nodes = [];
    if (content.videoBlobId) { const url = await assetUrl(courseId, content.videoBlobId); if (url) nodes.push(h('video', { class:'oa-course-video', controls:true, preload:'metadata', src:url }, OA.t('videoUnsupported'))); }
    for (const file of content.attachments || []) { const url = await assetUrl(courseId, file.blobId); if (!url) continue; if (file.mime && file.mime.indexOf('image/') === 0) nodes.push(h('img', { class:'oa-lesson-image', src:url, alt:file.name })); else nodes.push(h('a', { class:'oa-material-link', href:url, download:file.name }, file.name)); }
    return nodes;
  };
  const learningView = async function (user, courseId) {
    const result = await OA.services.courses.content(courseId);
    if (!result.ok) return h('section', { class:'oa-card' }, h('p', {}, OA.t(result.error.messageKey)));
    const course = result.data.course; const progressResult = await OA.services.progress.list(courseId); const completed = progressResult.ok ? progressResult.data : [];
    const cover = await assetUrl(courseId, course.coverBlobId);
    const heading = h('div', { class:'oa-page-head' }, cover ? h('img', { class:'oa-course-cover', src:cover, alt:course.titleAr }) : null, h('div', {}, h('p', { class:'oa-eyebrow' }, OA.t('courses')), h('h1', {}, course.titleAr), h('p', { class:'oa-muted' }, course.descriptionAr || '')));
    const list = h('div', { class:'oa-lesson-list' });
    for (const module of result.data.modules) {
      list.append(h('h2', {}, module.titleAr));
      for (const lesson of result.data.lessons.filter(function (item) { return item.moduleId === module.id; })) {
        const done = completed.some(function (record) { return record.lessonId === lesson.id && record.status === 'done'; });
        const materials = await lessonMaterials(courseId, lesson); const body = h('div', {}, h('h3', {}, lesson.titleAr), h('p', { class:'oa-muted' }, lesson.content && lesson.content.textAr || ''), materials);
        const button = h('button', { class:'oa-button ' + (done ? 'oa-button-secondary' : ''), type:'button', disabled:done, onclick:async function () { const saved = await OA.services.progress.complete(courseId, lesson.id); if (saved.ok) { button.textContent = OA.t('lessonDone'); button.disabled = true; } } }, done ? OA.t('lessonDone') : OA.t('completeLesson'));
        list.append(h('article', { class:'oa-card oa-lesson-card' }, body, button));
      }
    }
    return h('section', {}, heading, list, h('a', { class:'oa-button oa-button-secondary', href:'#/' + user.role + '/courses' }, OA.t('backToCourses')));
  };
  const courseActions = function (user, course, status) {
    if (user.role === 'trainee') return h('button', { class:'oa-button', type:'button', onclick:async function () { const result = await OA.services.courses.enroll(course.id); status.textContent = result.ok ? OA.t(result.data.status === 'waitlist' ? 'waitlisted' : 'enrolled') : OA.t(result.error.messageKey); await OA.pages.shell({ user:user, params:{ page:'courses' } }); } }, OA.t('enroll'));
    const items = [h('span', { class:'oa-muted' }, user.role === 'trainer' ? OA.t('myCourse') : OA.t('courseReady')), h('a', { class:'oa-button oa-button-secondary', href:'#/' + user.role + '/course-content/' + course.id }, OA.t('manageContent'))];
    if (user.role === 'admin') items.push(h('button', { class:'oa-button oa-button-secondary', type:'button', onclick:async function () { if (!window.confirm(OA.t('courseDeleteConfirm', { title:course.titleAr }))) return; const removed = await OA.services.courses.remove(course.id); status.textContent = OA.t(removed.ok ? 'courseDeleted' : removed.error.messageKey); await OA.pages.shell({ user:user, params:{ page:'courses' } }); } }, OA.t('deleteCourse')));
    return h('div', { class:'oa-course-actions' }, items);
  };
  const render = async function (user, params) {
    if (params.courseId) return learningView(user, params.courseId);
    const result = await OA.services.courses.list(); const courses = result.ok ? result.data : []; const enrolled = await OA.repo.enrollments.list();
    const cards = h('div', { class:'oa-course-grid' }); const status = h('p', { class:'oa-muted', role:'status' });
    for (const course of courses) {
      const registration = enrolled.find(function (item) { return item.courseId === course.id && item.userId === user.id && item.status !== 'dropped'; });
      const action = user.role === 'trainee' && registration && ['enrolled','completed'].includes(registration.status) ? h('a', { class:'oa-button', href:'#/trainee/learn/' + course.id }, OA.t('openCourse')) : courseActions(user, course, status);
      const note = registration ? h('p', { class:'oa-muted' }, OA.t('progressLabel') + ': ' + (registration.progressPct || 0) + '%') : null;
      const coverUrl = await assetUrl(course.id, course.coverBlobId); cards.append(courseCard(course, action, note, coverUrl));
    }
    const title = user.role === 'trainee' ? 'learning' : user.role === 'admin' ? 'courseManagement' : 'myTeaching';
    const children = [h('div', { class:'oa-page-head' }, h('div', {}, h('p', { class:'oa-eyebrow' }, OA.t(title)), h('h1', {}, OA.t('courses')))), status];
    if (user.role !== 'trainee') children.push(await createForm(user));
    children.push(courses.length ? cards : h('div', { class:'oa-card oa-empty' }, h('h2', {}, OA.t('emptyCourses')), h('p', { class:'oa-muted' }, OA.t('emptyCoursesHint'))));
    return h('section', {}, children);
  };
  OA.pages = OA.pages || {}; OA.pages.courses = { render:render };
})(window.OA = window.OA || {});
