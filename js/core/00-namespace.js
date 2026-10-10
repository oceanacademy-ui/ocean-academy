(function (OA) {
  'use strict';
  OA.version = '0.1.0';
  OA.log = { debug: function () {}, error: function (error) { console.error('[OA]', error); } };
  OA.uid = function () { return crypto.randomUUID ? crypto.randomUUID() : 'oa-' + Date.now() + '-' + Math.random().toString(16).slice(2); };
  OA.state = { db: null, user: null, route: '' };
})(window.OA = window.OA || {});
