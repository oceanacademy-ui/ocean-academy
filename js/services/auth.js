(function (OA) {
  'use strict';
  const sessionKey = 'oa_session';
  const safeUser = function (user) { const copy = Object.assign({}, user); delete copy.passwordHash; delete copy.salt; return copy; };
  const fail = function (code, messageKey) { return { ok:false, error:{ code:code, messageKey:messageKey } }; };
  OA.services = OA.services || {};
  OA.services.auth = {
    login: async function (username, password) {
      if (OA.cloud && OA.cloud.enabled) {
        try { await OA.cloud.signIn(username.trim().toLowerCase(), password); const cloudUser = await OA.cloud.currentProfile(); if (!cloudUser || cloudUser.status !== 'active') { await OA.cloud.signOut(); return fail('AUTH_INVALID','badLogin'); } OA.state.user = safeUser(cloudUser); if (cloudUser.role === 'admin') await OA.seedCore(); return { ok:true, data:OA.state.user }; }
        catch (_) { return fail('AUTH_INVALID','badLogin'); }
      }
      const users = await OA.repo.users.list(); const user = users.find(function (item) { return item.username.toLowerCase() === username.trim().toLowerCase(); }); if (!user || user.status !== 'active') return fail('AUTH_INVALID','badLogin'); if (user.lockedUntil && Date.parse(user.lockedUntil) > Date.now()) return fail('AUTH_LOCKED','locked'); const valid = await OA.crypto.hash(password, user.salt) === user.passwordHash; if (!valid) { const failures = (user.failedLogins || 0) + 1; await OA.repo.users.save(Object.assign({}, user, { failedLogins:failures, lockedUntil:failures >= 5 ? new Date(Date.now() + 300000).toISOString() : null })); return fail(failures >= 5 ? 'AUTH_LOCKED' : 'AUTH_INVALID', failures >= 5 ? 'locked' : 'badLogin'); } await OA.repo.users.save(Object.assign({}, user, { failedLogins:0, lockedUntil:null, lastLoginAt:new Date().toISOString() })); localStorage.setItem(sessionKey, JSON.stringify({ userId:user.id, activityAt:Date.now() })); OA.state.user = safeUser(user); return { ok:true, data:OA.state.user };
    },
    bootstrapAdmin:async function (email, password, name, username) {
      if (!OA.cloud || !OA.cloud.enabled) return fail('UNAVAILABLE','userError');
      try { if (!await OA.cloud.needsAdminSetup()) return fail('SETUP_CLOSED','adminSetupClosed'); const result = await OA.cloud.signUp(email.trim().toLowerCase(), password, name.trim(), username.trim().toLowerCase()); if (!result.access_token) return { ok:true, data:{ confirmationRequired:true } }; const user = await OA.cloud.currentProfile(); if (!user || user.role !== 'admin') return fail('SETUP_FAILED','adminSetupFailed'); OA.state.user = safeUser(user); await OA.seedCore(); return { ok:true, data:OA.state.user }; }
      catch (_) { return fail('SETUP_FAILED','adminSetupFailed'); }
    },
    registerTrainee:async function (email, password, name, username) {
      if (!OA.cloud || !OA.cloud.enabled) return fail('UNAVAILABLE','userError');
      try { if (await OA.cloud.needsAdminSetup()) return fail('SETUP_OPEN','adminSetupClosed'); const result = await OA.cloud.signUp(email.trim().toLowerCase(), password, name.trim(), username.trim().toLowerCase()); if (!result.access_token) return { ok:true, data:{ confirmationRequired:true } }; const user = await OA.cloud.currentProfile(); if (!user || user.role !== 'trainee') { await OA.cloud.signOut(); return fail('SIGNUP_FAILED','userError'); } OA.state.user = safeUser(user); return { ok:true, data:OA.state.user }; }
      catch (_) { return fail('SIGNUP_FAILED','userError'); }
    },
    currentUser: function () { try { const session = JSON.parse(localStorage.getItem(sessionKey) || 'null'); if (!session) return null; if (Date.now() - session.activityAt > 1800000) { if (OA.cloud && OA.cloud.enabled) OA.cloud.clearSession(); else localStorage.removeItem(sessionKey); OA.state.user = null; return null; } if (OA.cloud && OA.cloud.enabled) { OA.cloud.touch(); return OA.state.user; } session.activityAt = Date.now(); localStorage.setItem(sessionKey, JSON.stringify(session)); return OA.state.user; } catch (_) { return null; } },
    touch: function () { if (OA.cloud && OA.cloud.enabled) { OA.cloud.touch(); return; } try { const session = JSON.parse(localStorage.getItem(sessionKey) || 'null'); if (session) { session.activityAt = Date.now(); localStorage.setItem(sessionKey, JSON.stringify(session)); } } catch (_) {} },
    logout: function () { if (OA.cloud && OA.cloud.enabled) OA.cloud.signOut(); else localStorage.removeItem(sessionKey); OA.state.user = null; OA.router.navigate('/login'); }
  };
})(window.OA = window.OA || {});
