// موقع سيفديم — سكربتات خفيفة

// 1) الشريط المتحرك: يكرر الوحدة المكتوبة في الصفحة حتى يمتلئ السطر، ثم يبدأ الحركة
(function () {
  var ticker = document.querySelector('.ticker');
  if (!ticker) return;
  var REPEAT = 10;
  ticker.querySelectorAll('.tk').forEach(function (track) {
    var unit = track.innerHTML;
    track.innerHTML = new Array(REPEAT + 1).join(unit);
  });
  ticker.classList.add('is-ready');
})();

// 2) صورة المؤسس: تظهر فقط إذا وُجد الملف assets/img/founder.jpg
(function () {
  var fig = document.querySelector('.portrait');
  if (!fig) return;
  var img = fig.querySelector('img');
  function show() { fig.hidden = false; fig.parentElement.classList.add('has-photo'); }
  if (img.complete && img.naturalWidth) show();
  else { img.addEventListener('load', show); img.addEventListener('error', function () { fig.remove(); }); }
})();

// 3) زر نسخ البريد
(function () {
  var btn = document.getElementById('copy');
  var mail = document.getElementById('mail');
  if (!btn || !mail) return;
  var label = btn.textContent;
  function selectText() {
    var r = document.createRange(); r.selectNodeContents(mail);
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  btn.addEventListener('click', function () {
    try {
      navigator.clipboard.writeText(mail.textContent.trim()).then(function () {
        btn.textContent = btn.getAttribute('data-done') || 'تم النسخ';
        setTimeout(function () { btn.textContent = label; }, 1800);
      }).catch(selectText);
    } catch (e) { selectText(); }
  });
})();
