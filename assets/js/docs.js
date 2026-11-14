// مركز الوثائق — الفهرس، البحث، التقدم في القراءة، حجم الخط، والطباعة
(function () {
  var body = document.getElementById('doc-body');
  if (!body) return;
  var sheet = document.getElementById('sheet');
  var heads = Array.prototype.slice.call(body.querySelectorAll('h2'));

  // 1) الفهرس وروابط المواد: لكل عنوان رابط ثابت (#m-1، #m-2 ...)
  var toc = document.getElementById('toc');
  var links = heads.map(function (h, i) {
    h.id = 'm-' + (i + 1);
    var li = document.createElement('li');
    var a = document.createElement('a');
    a.href = '#' + h.id;
    a.textContent = h.textContent;
    li.appendChild(a);
    toc.appendChild(li);

    var copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'anchor';
    copy.textContent = '#';
    copy.title = body.getAttribute('data-copy-title') || 'نسخ رابط هذه المادة';
    copy.setAttribute('aria-label', copy.title);
    copy.addEventListener('click', function () {
      var url = location.href.split('#')[0] + '#' + h.id;
      history.replaceState(null, '', '#' + h.id);
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () {
        copy.textContent = '✓'; copy.classList.add('done');
        setTimeout(function () { copy.textContent = '#'; copy.classList.remove('done'); }, 1500);
      }).catch(function () {});
    });
    h.appendChild(copy);
    return a;
  });
  // بعد توليد المعرّفات: انتقل إلى المادة المطلوبة في الرابط إن وُجدت
  if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }

  // 2) تمييز المادة الحالية في الفهرس + شريط التقدم
  var bar = document.getElementById('progress');
  var ticking = false;
  function onScroll() {
    ticking = false;
    var r = sheet.getBoundingClientRect();
    var total = r.height - window.innerHeight;
    var done = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
    if (bar) bar.style.width = (done * 100) + '%';
    var cur = -1;
    for (var i = 0; i < heads.length; i++) { if (heads[i].getBoundingClientRect().top < 140) cur = i; else break; }
    links.forEach(function (a, i) { a.classList.toggle('on', i === cur); });
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // على الجوال: الفهرس مطوي، ويُغلق بعد اختيار مادة
  var details = document.querySelector('.toc details');
  if (details && window.matchMedia('(max-width:980px)').matches) {
    details.open = false;
    toc.addEventListener('click', function (e) { if (e.target.tagName === 'A') details.open = false; });
  }

  // 3) البحث داخل الوثيقة: يتجاهل الهمزات والتشكيل
  var input = document.getElementById('find');
  var count = document.getElementById('find-count');
  var hits = [], at = -1;
  function norm(s) {
    return s.toLowerCase().replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ً-ْـ]/g, '\u0001');
  }
  function clear() {
    body.querySelectorAll('mark').forEach(function (m) {
      var p = m.parentNode; p.replaceChild(document.createTextNode(m.textContent), m); p.normalize();
    });
    hits = []; at = -1; count.textContent = '';
  }
  function go(n) {
    if (!hits.length) return;
    if (at >= 0) hits[at].classList.remove('now');
    at = (n + hits.length) % hits.length;
    hits[at].classList.add('now');
    hits[at].scrollIntoView({ block: 'center' });
    count.textContent = (at + 1) + '/' + hits.length;
  }
  function search() {
    clear();
    var q = norm(input.value.trim()).replace(/\u0001/g, '');
    if (q.length < 2) return;
    var walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, null);
    var nodes = [], n;
    while ((n = walker.nextNode())) { if (!n.parentNode.closest('.anchor')) nodes.push(n); }
    nodes.forEach(function (node) {
      var text = node.nodeValue, low = norm(text);
      // خريطة من النص المطبَّع (بدون تشكيل) إلى مواضع النص الأصلي
      var map = [], flat = '';
      for (var i = 0; i < low.length; i++) { if (low[i] !== '\u0001') { map.push(i); flat += low[i]; } }
      var from = 0, idx, parts = [];
      while ((idx = flat.indexOf(q, from)) !== -1) { parts.push([map[idx], map[idx + q.length - 1] + 1]); from = idx + q.length; }
      if (!parts.length) return;
      var frag = document.createDocumentFragment(), last = 0;
      parts.forEach(function (p) {
        frag.appendChild(document.createTextNode(text.slice(last, p[0])));
        var m = document.createElement('mark'); m.textContent = text.slice(p[0], p[1]);
        frag.appendChild(m); hits.push(m); last = p[1];
      });
      frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });
    if (hits.length) go(0); else count.textContent = '0';
  }
  if (input) {
    var timer;
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(search, 160); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); go(at + (e.shiftKey ? -1 : 1)); }
      if (e.key === 'Escape') { input.value = ''; clear(); }
    });
  }

  // 4) حجم الخط: يُحفظ في المتصفح
  var fs = 1;
  try { fs = parseFloat(localStorage.getItem('sifdim-doc-fs')) || 1; } catch (e) {}
  function setFs(v) {
    fs = Math.min(1.3, Math.max(0.85, Math.round(v * 100) / 100));
    sheet.style.setProperty('--fs', fs);
    try { localStorage.setItem('sifdim-doc-fs', fs); } catch (e) {}
  }
  setFs(fs);
  var up = document.getElementById('font-up'), down = document.getElementById('font-down');
  if (up) up.addEventListener('click', function () { setFs(fs + 0.075); });
  if (down) down.addEventListener('click', function () { setFs(fs - 0.075); });

  // 5) الطباعة والحفظ PDF: الطباعة دائماً بحجم الخط الأصلي وبدون تظليل البحث
  function print() { window.print(); }
  window.addEventListener('beforeprint', function () { sheet.style.removeProperty('--fs'); });
  window.addEventListener('afterprint', function () { setFs(fs); });
  ['print', 'save-pdf'].forEach(function (id) {
    var b = document.getElementById(id);
    if (b) b.addEventListener('click', print);
  });
})();
