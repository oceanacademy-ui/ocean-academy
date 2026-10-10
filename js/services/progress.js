(function (OA) {
  'use strict';
  const failure = function (code, key) { return { ok:false, error:{ code:code, messageKey:key } }; };
  const getEnrollment = async function (user, courseId) { return (await OA.repo.enrollments.list()).find(function (entry) { return entry.userId === user.id && entry.courseId === courseId && ['enrolled','completed'].includes(entry.status); }); };
  const getProgress = async function (userId, courseId) { return (await OA.repo.lessonProgress.list()).filter(function (item) { return item.userId === userId && item.courseId === courseId; }); };
  OA.services.progress = {
    list: async function (courseId) { const user = OA.services.auth.currentUser(); if (!user || user.role !== 'trainee') return failure('FORBIDDEN', 'forbidden'); return { ok:true, data:(await OA.repo.lessonProgress.list()).filter(function (item) { return item.userId === user.id && (!courseId || item.courseId === courseId); }) }; },
    complete: async function (courseId, lessonId) {
      const user = OA.services.auth.currentUser();
      if (!user || user.role !== 'trainee') return failure('FORBIDDEN', 'forbidden');
      const enrollment = await getEnrollment(user, courseId);
      if (!enrollment) return failure('FORBIDDEN', 'forbidden');
      const lesson = await OA.repo.lessons.get(lessonId);
      if (!lesson || lesson.courseId !== courseId || lesson.status !== 'published') return failure('NOT_FOUND', 'courseUnavailable');
      const all = await getProgress(user.id, courseId);
      let record = all.find(function (item) { return item.lessonId === lessonId; });
      if (record && record.status === 'done') return { ok:true, data:record };
      record = await OA.repo.lessonProgress.save(Object.assign({}, record || {}, { userId:user.id, courseId:courseId, lessonId:lessonId, status:'done', percent:100, completedAt:new Date().toISOString() }));
      const lessons = (await OA.repo.lessons.list()).filter(function (item) { return item.courseId === courseId && item.status === 'published'; });
      const completedCount = all.filter(function (item) { return item.status === 'done'; }).length + 1;
      const finished = completedCount >= lessons.length;
      await OA.repo.enrollments.save(Object.assign({}, enrollment, { progressPct:Math.round(completedCount * 100 / Math.max(lessons.length, 1)), status:finished ? 'completed' : 'enrolled', completedAt:finished ? new Date().toISOString() : null }));
      return { ok:true, data:record };
    }
  };
})(window.OA = window.OA || {});
