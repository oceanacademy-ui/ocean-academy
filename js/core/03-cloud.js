(function (OA, window) {
  'use strict';
  const config = window.OA_CONFIG || {};
  const enabled = config.backend === 'supabase' && !!config.supabaseUrl && !!config.supabasePublishableKey;
  const sessionKey = 'oa_session';
  const storageBucket = 'oa-files';
  const endpoint = (path) => config.supabaseUrl.replace(/\/$/, '') + path;
  const readSession = function () { try { return JSON.parse(localStorage.getItem(sessionKey) || 'null'); } catch (_) { return null; } };
  const writeSession = function (session) { localStorage.setItem(sessionKey, JSON.stringify(session)); };
  const clearSession = function () { localStorage.removeItem(sessionKey); OA.state.user = null; };
  const jsonHeaders = function (token) { const headers = { apikey:config.supabasePublishableKey, 'Content-Type':'application/json' }; if (token) headers.Authorization = 'Bearer ' + token; return headers; };
  const request = async function (path, options) {
    if (!enabled) throw new Error('Cloud storage is not configured.');
    const opts = Object.assign({}, options || {}); const skipAuth = !!opts.skipAuth; delete opts.skipAuth;
    let session = readSession();
    if (!skipAuth && session && session.expiresAt && session.expiresAt < Date.now() + 30000 && path.indexOf('/auth/v1/token?') !== 0) session = await OA.cloud.refresh();
    const token = !skipAuth && session && session.accessToken;
    const settings = Object.assign({ method:'GET', headers:jsonHeaders(token) }, opts);
    settings.headers = Object.assign(jsonHeaders(token), settings.headers || {});
    const response = await fetch(endpoint(path), settings);
    if (!response.ok) { const body = await response.json().catch(function () { return {}; }); const error = new Error(body.message || body.msg || 'Cloud request failed.'); error.status = response.status; error.code = body.code || 'CLOUD_ERROR'; throw error; }
    if (response.status === 204) return null;
    const type = response.headers.get('content-type') || '';
    return type.includes('application/json') ? response.json() : response.blob();
  };
  const profilePath = function (id, table) { return '/rest/v1/' + table + '?id=eq.' + encodeURIComponent(id) + '&select=*'; };
  const apiProfile = function (profile) { return profile ? { id:profile.id, username:profile.username, email:profile.email || '', fullNameAr:profile.full_name_ar || '', fullNameEn:profile.full_name_en || '', role:profile.role, branchId:profile.branch_id || '', status:profile.status || 'active', createdAt:profile.created_at, updatedAt:profile.updated_at } : null; };
  const saveAuthSession = function (result) { const session = { accessToken:result.access_token, refreshToken:result.refresh_token, expiresAt:Date.now() + (result.expires_in || 3600) * 1000, activityAt:Date.now(), user:{ id:result.user.id, email:result.user.email } }; writeSession(session); return session; };
  const recordPath = function (store, id) { return '/rest/v1/oa_records?store_name=eq.' + encodeURIComponent(store) + '&record_id=eq.' + encodeURIComponent(id) + '&select=record_id,payload'; };
  const saveProfile = async function (profile) {
    const value = { id:profile.id, username:profile.username, email:profile.email, full_name_ar:profile.fullNameAr || '', full_name_en:profile.fullNameEn || '', role:profile.role, branch_id:profile.branchId || '', status:profile.status || 'active' };
    return request('/rest/v1/oa_profiles?id=eq.' + encodeURIComponent(profile.id), { method:'PATCH', headers:{ Prefer:'return=representation' }, body:JSON.stringify(value) });
  };
  const recordForWrite = function (store, item) {
    const payload = Object.assign({}, item); delete payload.passwordHash; delete payload.salt; delete payload.data;
    return { store_name:store, record_id:item.id, owner_id:(readSession() || {}).user && (readSession() || {}).user.id || null, payload:payload };
  };
  const filePath = function (item) { const filename = String(item.name || 'file').replace(/[\\/]/g, '_'); return item.ownerId + '/' + item.id + '/' + filename; };
  const saveBlob = async function (item) {
    if (!(item.data instanceof Blob)) throw new Error('A file is required.');
    const path = filePath(item); const url = endpoint('/storage/v1/object/' + storageBucket + '/' + path.split('/').map(encodeURIComponent).join('/'));
    const headers = { apikey:config.supabasePublishableKey, 'Content-Type':item.mime || item.data.type || 'application/octet-stream', 'x-upsert':'true' };
    const session = readSession(); if (session && session.accessToken) headers.Authorization = 'Bearer ' + session.accessToken;
    const response = await fetch(url, { method:'POST', headers:headers, body:item.data });
    if (!response.ok) throw new Error('Could not upload file to cloud storage.');
    const metadata = Object.assign({}, item, { storagePath:path }); delete metadata.data;
    return request('/rest/v1/oa_records?on_conflict=store_name,record_id', { method:'POST', headers:{ Prefer:'resolution=merge-duplicates,return=minimal' }, body:JSON.stringify(recordForWrite('blobs', metadata)) });
  };
  const loadBlob = async function (row) {
    const item = row && row.payload; if (!item) return undefined;
    if (item.storagePath) {
      const url = endpoint('/storage/v1/object/authenticated/' + storageBucket + '/' + item.storagePath.split('/').map(encodeURIComponent).join('/'));
      const session = readSession(); const headers = { apikey:config.supabasePublishableKey }; if (session && session.accessToken) headers.Authorization = 'Bearer ' + session.accessToken;
      const response = await fetch(url, { headers:headers }); if (!response.ok) throw new Error('Could not read file from cloud storage.'); item.data = await response.blob();
    }
    return item;
  };
  OA.cloud = {
    enabled:enabled,
    request:request,
    session:readSession,
    clearSession:clearSession,
    signIn:async function (email, password) {
      const result = await request('/auth/v1/token?grant_type=password', { method:'POST', skipAuth:true, headers:jsonHeaders(null), body:JSON.stringify({ email:email, password:password }) });
      return saveAuthSession(result).user;
    },
    signUp:async function (email, password, fullNameAr, username) {
      const result = await request('/auth/v1/signup', { method:'POST', skipAuth:true, headers:jsonHeaders(null), body:JSON.stringify({ email:email, password:password, data:{ fullNameAr:fullNameAr, username:username } }) });
      if (result.access_token) saveAuthSession(result);
      return result;
    },
    refresh:async function () {
      const session = readSession(); if (!session || !session.refreshToken) return null;
      const result = await request('/auth/v1/token?grant_type=refresh_token', { method:'POST', skipAuth:true, headers:jsonHeaders(null), body:JSON.stringify({ refresh_token:session.refreshToken }) });
      const next = Object.assign({}, session, { accessToken:result.access_token, refreshToken:result.refresh_token, expiresAt:Date.now() + (result.expires_in || 3600) * 1000, user:{ id:result.user.id, email:result.user.email } }); writeSession(next); return next;
    },
    touch:function () { const session = readSession(); if (session) { session.activityAt = Date.now(); writeSession(session); } },
    signOut:async function () { const session = readSession(); if (session && session.accessToken) await request('/auth/v1/logout', { method:'POST' }).catch(function () {}); clearSession(); },
    currentProfile:async function () { const session = readSession(); if (!session || !session.user) return null; let rows = await request(profilePath(session.user.id, 'oa_profiles')); if (!rows.length) return null; return apiProfile(rows[0]); },
    needsAdminSetup:async function () { const rows = await request('/rest/v1/rpc/oa_needs_admin_setup', { method:'POST', body:'{}' }); return rows === true; },
    records: {
      getAll:async function (store) {
        if (store === 'users') { const user = OA.state.user; const table = user && user.role === 'admin' ? 'oa_profiles' : 'oa_public_profiles'; return (await request('/rest/v1/' + table + '?select=*')).map(apiProfile); }
        const rows = await request('/rest/v1/oa_records?store_name=eq.' + encodeURIComponent(store) + '&select=payload');
        return store === 'blobs' ? Promise.all(rows.map(loadBlob)) : rows.map(function (row) { return row.payload; });
      },
      get:async function (store, id) {
        if (store === 'users') { const rows = await request(profilePath(id, 'oa_profiles')); return apiProfile(rows[0]); }
        const rows = await request(recordPath(store, id)); if (!rows.length) return undefined;
        return store === 'blobs' ? loadBlob(rows[0]) : rows[0].payload;
      },
      put:async function (store, item) {
        if (store === 'users') { const rows = await saveProfile(item); return apiProfile(rows[0]); }
        if (store === 'blobs') { await saveBlob(item); return item; }
        const existing = await request(recordPath(store,item.id));
        const route = '/rest/v1/oa_records?store_name=eq.' + encodeURIComponent(store) + '&record_id=eq.' + encodeURIComponent(item.id);
        const rows = existing.length
          ? await request(route, { method:'PATCH', headers:{ Prefer:'return=representation' }, body:JSON.stringify(recordForWrite(store,item)) })
          : await request('/rest/v1/oa_records', { method:'POST', headers:{ Prefer:'return=representation' }, body:JSON.stringify(recordForWrite(store,item)) });
        return rows.length ? rows[0].payload : item;
      },
      delete:async function (store, id) {
        if (store === 'users') return request('/rest/v1/oa_profiles?id=eq.' + encodeURIComponent(id), { method:'DELETE' });
        if (store === 'blobs') { const blob = await this.get(store,id); if (blob && blob.storagePath) await request('/storage/v1/object/remove/' + storageBucket, { method:'POST', body:JSON.stringify({ prefixes:[blob.storagePath] }) }); }
        return request('/rest/v1/oa_records?store_name=eq.' + encodeURIComponent(store) + '&record_id=eq.' + encodeURIComponent(id), { method:'DELETE' });
      }
    }
  };
})(window.OA = window.OA || {}, window);
