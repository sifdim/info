/* استمارة الاهتمام: sifdim.sa/join
   ترسل التسجيل إلى تطبيق Google Apps Script (الرابط في _data/join.yml).
   إن تعذّر الإرسال يُحفظ التسجيل في الجهاز ويُعاد إرساله تلقائياً. */
(function () {
  'use strict';
  var form = document.getElementById('join');
  if (!form) return;

  var endpoint = (form.getAttribute('data-endpoint') || '').trim();
  var rest = document.getElementById('rest');
  var step3 = document.getElementById('step3');
  var statusEl = document.getElementById('status');
  var done = document.getElementById('done');
  var sendBtn = form.querySelector('.send');
  var QKEY = 'sifdim-join-queue';
  var src = (new URLSearchParams(location.search).get('src') || 'direct').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20) || 'direct';

  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- إظهار أسئلة الفئة المختارة ---------- */
  function setEnabled(root, on) {
    $all('input, select, textarea', root).forEach(function (el) { el.disabled = !on; });
  }
  function applyWhen() {
    $all('[data-when]', form).forEach(function (box) {
      var parts = box.getAttribute('data-when').split('=');
      var picked = form.querySelector('input[name="' + parts[0] + '"]:checked');
      var groupOn = !box.closest('.group') || !box.closest('.group').hidden;
      var on = groupOn && !!picked && picked.value === parts.slice(1).join('=');
      box.hidden = !on;
      setEnabled(box, on);
    });
  }
  function showCategory(cat) {
    $all('.group', form).forEach(function (g) {
      var on = g.getAttribute('data-cat') === cat;
      g.hidden = !on;
      setEnabled(g, on);
    });
    applyWhen();
    var r = form.querySelector('input[name="category"]:checked');
    step3.textContent = (r && r.getAttribute('data-step')) || 'تفاصيل';
    var first = rest.hidden;
    rest.hidden = false;
    document.getElementById('err-category').hidden = true;
    if (first) {
      setTimeout(function () {
        rest.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      }, 60);
    }
  }
  $all('.group', form).forEach(function (g) { setEnabled(g, false); });
  form.addEventListener('change', function (e) {
    var t = e.target;
    if (t.name === 'category') showCategory(t.value);
    else if (t.type === 'radio') applyWhen();
    clearError(t);
  });
  form.addEventListener('input', function (e) { clearError(e.target); });

  /* ---------- التحقق ---------- */
  function holder(el) { return el.closest('.q') || el.closest('.f') || null; }
  function clearError(el) {
    var h = holder(el);
    if (h && h.classList.contains('is-bad')) {
      h.classList.remove('is-bad');
      var m = h.querySelector('.err'); if (m) m.hidden = true;
    }
    if (el.name === 'consent') document.getElementById('err-consent').hidden = true;
  }
  function flag(h) {
    if (!h) return;
    h.classList.add('is-bad');
    var m = h.querySelector('.err'); if (m) m.hidden = false;
  }
  function normPhone(v) {
    v = (v || '').replace(/[\s\-().]/g, '').replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); });
    return v;
  }
  function phoneOk(v) {
    return /^05\d{8}$/.test(v) || /^(\+|00)9665\d{8}$/.test(v) || /^9665\d{8}$/.test(v) || /^(\+|00)(?!966)\d{7,15}$/.test(v);
  }
  function validate() {
    var bad = [];
    if (!form.querySelector('input[name="category"]:checked')) {
      document.getElementById('err-category').hidden = false;
      return [document.querySelector('.who')];
    }
    // الحقول الإلزامية الظاهرة
    $all('[required]', form).forEach(function (el) {
      if (el.disabled || el.name === 'consent') return;
      var ok = el.type === 'radio' ? !!form.querySelector('input[name="' + el.name + '"]:checked') : el.value.trim() !== '';
      if (!ok) { var h = holder(el); if (bad.indexOf(h) < 0) { flag(h); bad.push(h); } }
    });
    var phone = form.elements.phone;
    phone.value = normPhone(phone.value);
    if (phone.value && !phoneOk(phone.value)) { var hp = holder(phone); if (bad.indexOf(hp) < 0) { flag(hp); bad.push(hp); } }
    var email = form.elements.email;
    if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) { flag(holder(email)); bad.push(holder(email)); }
    var link = form.elements.f_link;
    if (link && !link.disabled && link.value.trim() && !/^https?:\/\/\S+\.\S+/.test(link.value.trim())) { flag(holder(link)); bad.push(holder(link)); }
    $all('.q[data-min]', form).forEach(function (q) {
      if (q.closest('.group').hidden) return;
      var n = $all('input:checked', q).length;
      if (n < Number(q.getAttribute('data-min'))) { flag(q); bad.push(q); }
    });
    if (!form.elements.consent.checked) { document.getElementById('err-consent').hidden = false; bad.push(form.elements.consent.closest('.chk')); }
    return bad;
  }

  /* ---------- تجهيز البيانات ---------- */
  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }
  function collect() {
    var r = form.querySelector('input[name="category"]:checked');
    var details = {};
    var group = form.querySelector('.group[data-cat="' + r.value + '"]');
    $all('.q[data-label]', group).forEach(function (q) {
      if (q.hidden || (q.closest('[data-when]') && q.closest('[data-when]').hidden)) return;
      var vals = [];
      $all('input, select', q).forEach(function (el) {
        if (el.disabled) return;
        if ((el.type === 'radio' || el.type === 'checkbox')) { if (el.checked) vals.push(el.value); }
        else if (el.value.trim()) vals.push(el.value.trim());
      });
      if (vals.length) details[q.getAttribute('data-label')] = vals.join('، ');
    });
    return {
      id: uid(),
      sent_at: new Date().toISOString(),
      src: src,
      category: r.value,
      category_label: r.getAttribute('data-label'),
      name: form.elements.name.value.trim(),
      phone: form.elements.phone.value,
      email: form.elements.email.value.trim(),
      city: form.elements.city.value.trim(),
      details: details,
      note: form.elements.note.value.trim(),
      consent: true,
      news: form.elements.news.checked,
      website: form.elements.website.value
    };
  }

  /* ---------- الإرسال ---------- */
  function post(payload) {
    var body = JSON.stringify(payload);
    // نص عادي حتى لا يحتاج المتصفح طلب إذن مسبق (CORS)
    return fetch(endpoint, { method: 'POST', body: body, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow' })
      .then(function (res) { return res.json(); })
      .then(function (j) {
        if (j && j.ok) return true;
        var e = new Error((j && j.error) || 'rejected'); e.rejected = true; throw e;
      })
      .catch(function (err) {
        if (err.rejected) throw err;
        // إن منع المتصفح قراءة الرد نرسل بلا قراءة، والسكربت يتجاهل التكرار بالمعرّف
        return fetch(endpoint, { method: 'POST', body: body, mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' } }).then(function () { return true; });
      });
  }
  function queueGet() { try { return JSON.parse(localStorage.getItem(QKEY) || '[]'); } catch (e) { return []; } }
  function queueSet(q) { try { if (q.length) localStorage.setItem(QKEY, JSON.stringify(q)); else localStorage.removeItem(QKEY); } catch (e) {} }
  function flush() {
    if (!endpoint || !navigator.onLine) return;
    var q = queueGet(); if (!q.length) return;
    var item = q[0];
    post(item).then(function () { queueSet(queueGet().filter(function (x) { return x.id !== item.id; })); flush(); }).catch(function () {});
  }

  function busy(on) {
    sendBtn.disabled = on;
    sendBtn.classList.toggle('busy', on);
    sendBtn.querySelector('.lbl').textContent = on ? 'جارٍ الإرسال' : 'أرسل التسجيل';
  }
  function say(msg, bad) { statusEl.textContent = msg; statusEl.classList.toggle('bad', !!bad); }
  function finish() {
    form.hidden = true;
    done.hidden = false;
    done.focus({ preventScroll: true });
    done.scrollIntoView({ block: 'center' });
  }

  var pending = null;
  function submit(payload) {
    pending = payload;
    busy(true); say('');
    if (!endpoint) { busy(false); say('الاستمارة غير مفعّلة بعد. تواصل معنا على info@sifdim.sa', true); return; }
    post(payload).then(function () {
      pending = null; busy(false); finish();
    }).catch(function (err) {
      busy(false);
      if (err && err.rejected) { say('لم نستطع حفظ التسجيل. راجع بياناتك ثم أعد المحاولة.', true); return; }
      var q = queueGet(); if (!q.some(function (x) { return x.id === payload.id; })) { q.push(payload); queueSet(q); }
      statusEl.classList.add('bad');
      statusEl.innerHTML = '';
      statusEl.appendChild(document.createTextNode('تعذّر الإرسال الآن، وحفظنا تسجيلك على جهازك. '));
      var b = document.createElement('button'); b.type = 'button'; b.textContent = 'أعد المحاولة';
      b.addEventListener('click', function () { submit(pending); });
      statusEl.appendChild(b);
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sendBtn.disabled) return;
    var bad = validate();
    if (bad.length) {
      say('راجع الحقول المعلّمة.', true);
      var first = bad[0];
      if (first) {
        first.scrollIntoView({ block: 'center' });
        var f = first.querySelector && first.querySelector('input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
        if (f) f.focus({ preventScroll: true });
      }
      return;
    }
    var payload = collect();
    if (payload.website) { finish(); return; } // حقل الفخ: تسجيل آلي
    delete payload.website;
    submit(payload);
  });

  document.getElementById('again').addEventListener('click', function () {
    form.reset();
    $all('.group, [data-when]', form).forEach(function (g) { g.hidden = true; setEnabled(g, false); });
    $all('.is-bad', form).forEach(function (h) { h.classList.remove('is-bad'); });
    $all('.err', form).forEach(function (m) { m.hidden = true; });
    rest.hidden = true; say('');
    done.hidden = true; form.hidden = false;
    window.scrollTo({ top: 0 });
  });

  window.addEventListener('online', flush);
  flush();
})();
