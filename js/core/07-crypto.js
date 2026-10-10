(function (OA) {
  'use strict';
  OA.crypto = {
    randomSalt: function () { return Array.from(crypto.getRandomValues(new Uint8Array(16)), function (n) { return n.toString(16).padStart(2, '0'); }).join(''); },
    hash: async function (password, salt) { const data = new TextEncoder().encode(salt + ':' + password); const digest = await crypto.subtle.digest('SHA-256', data); return Array.from(new Uint8Array(digest), function (n) { return n.toString(16).padStart(2, '0'); }).join(''); }
  };
})(window.OA = window.OA || {});
