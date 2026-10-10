(function (OA) {
  'use strict';
  const categories = ['الأدوية والصرف','التجميل والعناية','المكملات والأعشاب','الأجهزة والمستلزمات الطبية','اللوائح والتشريعات السعودية','سلامة المريض والتداخلات','خدمة العملاء والمبيعات','إدارة المخزون وسلسلة التبريد','الأدوية المراقبة','نظم المعلومات الصحية'];
  const catalog = [
    ['pharmacy-basics','أساسيات الصرف الدوائي','الأدوية والصرف','مدخل عملي لقراءة الوصفة ومراجعة سلامة الصرف.'],
    ['patient-safety','سلامة المريض والتداخلات','سلامة المريض والتداخلات','خطوات عملية للحد من أخطاء الدواء ومراجعة التداخلات.'],
    ['cosmetic-care','العناية الجلدية ومستحضرات التجميل','التجميل والعناية','مبادئ اختيار منتجات العناية وتقديم إرشاد مناسب.'],
    ['supplements','المكملات والأعشاب','المكملات والأعشاب','أساسيات الاستفسار عن المكملات وتقييم الاستخدام الآمن.'],
    ['medical-devices','الأجهزة والمستلزمات الطبية','الأجهزة والمستلزمات الطبية','التعريف بالأجهزة الشائعة وطريقة شرح استخدامها.'],
    ['saudi-pharmacy-regulations','مدخل إلى الامتثال الصيدلي','اللوائح والتشريعات السعودية','مبادئ عامة للتعامل المهني والتحقق من المتطلبات الرسمية.'],
    ['cosmetics-regulations','مبادئ الامتثال لمستحضرات التجميل','اللوائح والتشريعات السعودية','مدخل عام لمراجعة مصادر ومتطلبات مستحضرات التجميل الرسمية.'],
    ['inventory-cold-chain','إدارة المخزون وسلسلة التبريد','إدارة المخزون وسلسلة التبريد','ممارسات تشغيلية لمتابعة المخزون وحفظ المنتجات.'],
    ['customer-service','خدمة العملاء في الصيدلية','خدمة العملاء والمبيعات','مهارات الإصغاء والتواصل وتوجيه العميل بمسؤولية.']
  ];
  const topics = ['المفاهيم الأساسية','خطوات العمل اليومية','التواصل مع المستفيد','مراجعة السلامة والجودة','ملخص وتطبيق عملي'];
  const texts = ['تعرّف على المفاهيم والمصطلحات الأساسية لهذا المحور، وراجع سياسة المنشأة والمراجع المهنية المعتمدة قبل التطبيق.','اتبع إجراءات العمل المعتمدة، وتحقق من اكتمال المعلومات، ووثّق الخطوات عند الحاجة.','ابدأ بالاستماع إلى احتياج المستفيد، واشرح الخيارات بلغة واضحة، وأحِل الأسئلة خارج نطاقك إلى المختص.','راجع عوامل الخطر والحساسية والتداخلات المحتملة، واطلب المشورة المهنية عند وجود شك.','لخّص ما تعلمته، ثم طبّقه ضمن نطاق الممارسة والسياسات المعتمدة في جهة العمل.'];
  OA.seedCourses = async function () {
    if (await OA.store.get('meta', 'catalogSeededAt')) return;
    let existingCategories = await OA.repo.categories.list();
    for (const name of categories) if (!existingCategories.some(function (item) { return item.nameAr === name; })) { const item = await OA.repo.categories.save({ nameAr:name, nameEn:'', type:'course', order:existingCategories.length }); existingCategories.push(item); }
    const trainers = (await OA.repo.users.list()).filter(function (user) { return user.role === 'trainer'; });
    for (let index = 0; index < catalog.length; index += 1) {
      const item = catalog[index]; const category = existingCategories.find(function (entry) { return entry.nameAr === item[2]; });
      const course = await OA.repo.courses.save({ id:'course-' + item[0], code:'OA-' + String(index + 1).padStart(3, '0'), titleAr:item[1], titleEn:'', descriptionAr:item[3], categoryId:category ? category.id : '', trainerIds:trainers.length ? [trainers[index % trainers.length].id] : [], maxSeats:30, durationHours:2, status:'published', level:'basic', isMandatory:false, passingAttendancePct:80, certificateEnabled:false, tags:[] });
      const module = await OA.repo.modules.save({ id:'module-' + item[0], courseId:course.id, titleAr:'الوحدة الأولى: ' + item[1], order:1, status:'published' });
      for (let lessonIndex = 0; lessonIndex < topics.length; lessonIndex += 1) {
        const legislative = item[0] === 'saudi-pharmacy-regulations' || item[0] === 'cosmetics-regulations';
        await OA.repo.lessons.save({ id:'lesson-' + item[0] + '-' + String(lessonIndex + 1), courseId:course.id, moduleId:module.id, titleAr:topics[lessonIndex], titleEn:'', order:lessonIndex + 1, type:'text', content:{ textAr:(legislative ? 'محتوى تمهيدي عام، بانتظار مراجعة مختص والتحقق من المصدر الرسمي. ' : '') + texts[lessonIndex], durationMin:8 }, status:'published', reviewedAt:null, sourceRef:legislative ? { authority:'', refNo:'', url:'', reviewRequired:true } : null, version:1 });
      }
    }
    const trainee = (await OA.repo.users.list()).find(function (user) { return user.role === 'trainee'; });
    if (trainee) await OA.repo.enrollments.save({ id:'enrollment-demo-' + trainee.id, courseId:'course-pharmacy-basics', userId:trainee.id, status:'enrolled', progressPct:0, source:'admin' });
    await OA.store.put('meta', { id:'catalogSeededAt', value:new Date().toISOString() });
  };
})(window.OA = window.OA || {});
