// Álbum familiar · Kai & Cele
document.addEventListener('DOMContentLoaded', function () {

  // Pestañas de cartas (Papá / Mamá / Abuela Elsa)
  document.querySelectorAll('.tabs').forEach(function (tabs) {
    var scope = tabs.parentElement;
    tabs.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('on'); });
        tab.classList.add('on');
        scope.querySelectorAll('[data-letter]').forEach(function (l) {
          l.hidden = l.getAttribute('data-letter') !== tab.getAttribute('data-show');
        });
      });
    });
  });

  // Visor de fotos para la galería
  var box = document.createElement('div');
  box.className = 'lightbox';
  box.innerHTML = '<figure><img alt=""><figcaption></figcaption></figure>';
  document.body.appendChild(box);
  var boxImg = box.querySelector('img');
  var boxCap = box.querySelector('figcaption');

  document.querySelectorAll('.board figure').forEach(function (fig) {
    fig.addEventListener('click', function () {
      var img = fig.querySelector('img');
      var cap = fig.querySelector('figcaption');
      boxImg.src = img.src;
      boxImg.alt = img.alt;
      boxCap.textContent = cap ? cap.textContent : '';
      box.classList.add('open');
    });
  });
  box.addEventListener('click', function () { box.classList.remove('open'); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') box.classList.remove('open');
  });
});
