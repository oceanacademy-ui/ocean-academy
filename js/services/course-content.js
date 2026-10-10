(function (OA) {
  'use strict';
  const fail = function (code, key) { return { ok:false, error:{ code:code, messageKey:key } }; };
  const allowed = function (user, course) { return user && course && (user.role === 'admin' || (user.role === 'trainer' && (course.trainerIds || []).includes(user.id))); };
  const rules = {
    cover:{ extensions:['jpg','jpeg','png','webp'], max:5 * 1024 * 1024 },
    attachment:{ extensions:['pdf','ppt','pptx','jpg','jpeg','png','webp'], max:25 * 1024 * 1024 },
    video:{ extensions:['mp4','webm','ogg'], max:80 * 1024 * 1024 }
  };
  const extension = function (file) { return (file.name.split('.').pop() || '').toLowerCase(); };
  const validFile = function (file, type) { const rule = rules[type]; return file && file.size > 0 && rule.extensions.includes(extension(file)) && file.size <= rule.max; };
  const loadCourse = async function (courseId, user) { const course = await OA.repo.courses.get(courseId); if (!allowed(user, course) || course.deletedAt) return null; return course; };
  const storeFile = async function (file, user) { return OA.repo.blobs.save({ mime:file.type || 'application/octet-stream', size:file.size, name:file.name, data:file, ownerId:user.id }); };
  const protect = async function (operation) { try { return await operation(); } catch (_) { return fail('STORAGE', 'uploadFailed'); } };
  const audit = async function (user, courseId, action, entityId) { await OA.repo.auditLog.save({ actorId:user.id, action:action, entity:'courses', entityId:courseId, details:{ contentId:entityId }, at:new Date().toISOString() }); };
  const maxOrder = function (items) { return items.reduce(function (max, item) { return Math.max(max, Number(item.order) || 0); }, 0) + 1; };
  const validateFiles = function (files, type) { return files.every(function (file) { return validFile(file, type); }); };
  const managerContent = async function (courseId) {
    const user = OA.services.auth.currentUser(); const course = await loadCourse(courseId, user);
    if (!course) return fail('FORBIDDEN', 'forbidden');
    const modules = (await OA.repo.modules.list()).filter(function (item) { return item.courseId === courseId; }).sort(function (a,b) { return a.order - b.order; });
    const lessons = (await OA.repo.lessons.list()).filter(function (item) { return item.courseId === courseId; }).sort(function (a,b) { return a.order - b.order; });
    return { ok:true, data:{ course:course, modules:modules, lessons:lessons } };
  };
  const saveCover = async function (courseId, file) {
    const user = OA.services.auth.currentUser(); const course = await loadCourse(courseId, user);
    if (!course) return fail('FORBIDDEN', 'forbidden');
    if (!validFile(file, 'cover')) return fail('INVALID_FILE', file && file.size > rules.cover.max ? 'fileTooLarge' : 'fileInvalid');
    const blob = await storeFile(file, user); const saved = await OA.repo.courses.save(Object.assign({}, course, { coverBlobId:blob.id }));
    await audit(user, courseId, 'course.cover.update', blob.id); return { ok:true, data:saved };
  };
  const saveLesson = async function (input) {
    const user = OA.services.auth.currentUser(); const course = await loadCourse(input.courseId, user);
    if (!course) return fail('FORBIDDEN', 'forbidden');
    const files = Array.from(input.files || []); const video = input.videoFile || null;
    if (files.some(function (file) { return file.size > rules.attachment.max; }) || (video && video.size > rules.video.max)) return fail('FILE_TOO_LARGE', 'fileTooLarge');
    if (!validateFiles(files, 'attachment') || (video && !validFile(video, 'video'))) return fail('INVALID_FILE', 'fileInvalid');
    const titleAr = (input.titleAr || '').trim(); const moduleTitleAr = (input.moduleTitleAr || '').trim();
    if (!titleAr || !moduleTitleAr) return fail('INVALID', 'lessonFieldsRequired');
    const modules = (await OA.repo.modules.list()).filter(function (item) { return item.courseId === course.id; });
    const existingLessons = (await OA.repo.lessons.list()).filter(function (item) { return item.courseId === course.id; });
    const previous = existingLessons.find(function (item) { return item.id === input.lessonId; });
    if (input.lessonId && !previous) return fail('NOT_FOUND', 'courseUnavailable');
    let module = modules.find(function (item) { return item.id === input.moduleId; });
    if (input.moduleId && !module) return fail('FORBIDDEN', 'forbidden');
    module = await OA.repo.modules.save(Object.assign({}, module || { courseId:course.id, order:maxOrder(modules), status:'published' }, { titleAr:moduleTitleAr }));
    const content = Object.assign({}, previous && previous.content || {}, { textAr:(input.textAr || '').trim() });
    const kept = (content.attachments || []).filter(function (item) { return !(input.removeAssetIds || []).includes(item.blobId); });
    for (const file of files) { const blob = await storeFile(file, user); kept.push({ blobId:blob.id, name:blob.name, mime:blob.mime, size:blob.size }); }
    content.attachments = kept;
    if (input.removeVideo) { delete content.videoBlobId; delete content.videoName; }
    if (video) { const blob = await storeFile(video, user); content.videoBlobId = blob.id; content.videoName = blob.name; }
    const nextOrder = maxOrder(existingLessons.filter(function (item) { return item.moduleId === module.id; }));
    const lesson = await OA.repo.lessons.save(Object.assign({}, previous || { courseId:course.id, order:nextOrder, version:1, status:'published' }, { moduleId:module.id, titleAr:titleAr, type:content.videoBlobId ? 'video' : 'text', content:content }));
    await audit(user, course.id, previous ? 'course.lesson.update' : 'course.lesson.create', lesson.id);
    return { ok:true, data:{ module:module, lesson:lesson } };
  };
  const asset = async function (courseId, blobId) {
    const user = OA.services.auth.currentUser(); const course = await OA.repo.courses.get(courseId);
    if (!user || !course || course.deletedAt) return fail('NOT_FOUND', 'courseUnavailable');
    const isCover = course.coverBlobId === blobId;
    if (!isCover) {
      const result = await OA.services.courses.content(courseId); if (!result.ok) return result;
      const referenced = result.data.lessons.some(function (lesson) { const content = lesson.content || {}; return content.videoBlobId === blobId || (content.attachments || []).some(function (file) { return file.blobId === blobId; }); });
      if (!referenced) return fail('NOT_FOUND', 'courseUnavailable');
    } else if (user.role === 'trainer' && !allowed(user, course)) return fail('FORBIDDEN', 'forbidden');
    else if (user.role === 'trainee' && !['published','running'].includes(course.status)) return fail('NOT_FOUND', 'courseUnavailable');
    const blob = await OA.repo.blobs.get(blobId); return blob ? { ok:true, data:blob } : fail('NOT_FOUND', 'courseUnavailable');
  };
  OA.services.courseContent = {
    managerContent:function (id) { return protect(function () { return managerContent(id); }); },
    saveCover:function (id, file) { return protect(function () { return saveCover(id, file); }); },
    saveLesson:function (input) { return protect(function () { return saveLesson(input); }); },
    asset:function (courseId, blobId) { return protect(function () { return asset(courseId, blobId); }); }
  };
})(window.OA = window.OA || {});
