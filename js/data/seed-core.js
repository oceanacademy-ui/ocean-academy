(function (OA) {
  'use strict';
  const branches = ['الرياض','جدة','الدمام','المدينة','أبها'];
  const trainers = [
    { username:'trainer', name:'مدرب تجريبي' },
    { username:'trainer2', name:'نورة العتيبي' },
    { username:'trainer3', name:'عبدالله القحطاني' }
  ];
  const traineeNames = ['سارة الحربي','محمد الدوسري','نورة الشهري','خالد المطيري','ريم الزهراني','فهد الغامدي','مها العتيبي','عبدالرحمن القحطاني','جود السبيعي','تركي العنزي','لينا الشمري','سلمان الحربي','هيا الدوسري','بدر القحطاني','دانة المطيري','عمر الزهراني','رهف الغامدي','فيصل العتيبي','لمى الشهري','زياد السبيعي','شهد العنزي','ماجد الشمري','أمل القحطاني','نايف الدوسري','متدرب تجريبي'];
  const addAccount = async function (account, branchId) { const existing = (await OA.repo.users.list()).find(function (user) { return user.username === account.username; }); if (existing) return existing; const salt = OA.crypto.randomSalt(); return OA.repo.users.save({ id:OA.uid(), username:account.username, role:account.role, fullNameAr:account.name, branchId:branchId || '', email:account.username + '@ocean.local', salt:salt, passwordHash:await OA.crypto.hash(account.password, salt), status:'active', failedLogins:0 }); };
  OA.seedCore = async function () {
    if (OA.cloud && OA.cloud.enabled && (!OA.state.user || OA.state.user.role !== 'admin')) return;
    let storedBranches = await OA.repo.branches.list();
    if (OA.cloud && OA.cloud.enabled) { for (const name of branches) if (!storedBranches.some(function (branch) { return branch.nameAr === name; })) await OA.repo.branches.save({ nameAr:name, city:name }); return; }
    if (!await OA.store.get('meta', 'seededAt')) {
      for (const name of branches) { if (!storedBranches.some(function (branch) { return branch.nameAr === name; })) storedBranches.push(await OA.repo.branches.save({ nameAr:name, city:name })); }
      await addAccount({ username:'admin', role:'admin', name:'مدير الأكاديمية', password:'Admin123!' });
      await addAccount({ username:'trainer', role:'trainer', name:'مدرب تجريبي', password:'Trainer123!' }, storedBranches[0] && storedBranches[0].id);
      await addAccount({ username:'trainee', role:'trainee', name:'متدرب تجريبي', password:'Trainee123!' }, storedBranches[0] && storedBranches[0].id);
      await OA.store.put('meta', { id:'seededAt', value:new Date().toISOString() });
    }
    storedBranches = await OA.repo.branches.list();
    if (storedBranches.length < branches.length) { for (const name of branches) if (!storedBranches.some(function (branch) { return branch.nameAr === name; })) storedBranches.push(await OA.repo.branches.save({ nameAr:name, city:name })); }
    if (!await OA.store.get('meta', 'demoPopulationSeededAt')) {
      for (let index = 1; index < trainers.length; index += 1) await addAccount({ username:trainers[index].username, role:'trainer', name:trainers[index].name, password:'Trainer123!' }, storedBranches[index] && storedBranches[index].id);
      for (let index = 0; index < traineeNames.length; index += 1) { const username = index === traineeNames.length - 1 ? 'trainee' : 'trainee' + String(index + 1).padStart(2, '0'); await addAccount({ username:username, role:'trainee', name:traineeNames[index], password:'Trainee123!' }, storedBranches[index % storedBranches.length] && storedBranches[index % storedBranches.length].id); }
      await OA.store.put('meta', { id:'demoPopulationSeededAt', value:new Date().toISOString() });
    }
  };
})(window.OA = window.OA || {});
