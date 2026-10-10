(function (OA) {
  'use strict';
  OA.repo = {};
  ['users','branches','categories','courses','modules','lessons','sessions','enrollments','attendance','lessonProgress','notifications','auditLog','meta','blobs','salesSubmissions'].forEach(function (name) {
    OA.repo[name] = {
      list: async function () { return (await OA.store.getAll(name)).filter(function (item) { return !item.deletedAt; }); },
      get: async function (id) { return OA.store.get(name, id); },
      save: async function (item) { const now = new Date().toISOString(); const value = Object.assign({}, item, { id: item.id || OA.uid(), createdAt: item.createdAt || now, updatedAt: now, deletedAt: item.deletedAt || null }); await OA.store.put(name, value); return value; }
    };
  });
})(window.OA = window.OA || {});
