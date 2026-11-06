/* Madoka App · app web sin dependencias. Navegación por #hash. */
(function () {
  'use strict';

  // ---------- Datos ----------
  var CHARS = [
    {
      id: 'madoka', name: 'Madoka', full: 'Madoka Kaname', role: 'Corazón del grupo', tag: 'PINK', magic: true,
      bg: '#FFE3EF', line: '#F3B9D2', gem: '#F06BA8', page: '#FFE3EF',
      quote: 'Quiero ser alguien que ayude a los demás.',
      about: 'Amable, tímida y con un corazón enorme. Siempre piensa en sus amigas.',
      facts: [['Color', 'Rosa'], ['Arma', 'Arco de luz'], ['Le encanta', 'Dibujar trajes'], ['Mejor amiga', 'Sayaka']],
      wish: 'Borrar a todas las brujas antes de que nazcan, para salvar a todas las chicas mágicas del pasado y del futuro.',
      wishEp: 12
    },
    {
      id: 'homura', name: 'Homura', full: 'Homura Akemi', role: 'La misteriosa', tag: 'PURPLE', magic: true,
      bg: '#E6DDFB', line: '#CDBDF2', gem: '#8E6BD8', page: '#EFE9FD',
      quote: 'No dejes que nadie te cambie.',
      about: 'Seria y callada; parece fría, pero siempre sabe más de lo que dice.',
      facts: [['Color', 'Morado'], ['Arma', 'Escudo mágico'], ['Poder', 'Detener el tiempo'], ['Llega', 'Chica nueva']],
      wish: 'Volver a conocer a Madoka y esta vez ser ella quien la proteja. Por eso repite el tiempo una y otra vez.',
      wishEp: 10
    },
    {
      id: 'sayaka', name: 'Sayaka', full: 'Sayaka Miki', role: 'La valiente', tag: 'BLUE', magic: true,
      bg: '#DCEBFF', line: '#B5D2F7', gem: '#4F8FE8', page: '#E8F1FF',
      quote: '¡La justicia siempre gana!',
      about: 'Alegre, bromista y muy justa. Defiende a sus amigas de lo que sea.',
      facts: [['Color', 'Azul'], ['Arma', 'Espadas'], ['Le encanta', 'El violín de Kyosuke'], ['Mejor amiga', 'Madoka']],
      wish: 'Curar la mano de Kyosuke, su amigo violinista, para que pudiera volver a tocar.',
      wishEp: 4
    },
    {
      id: 'mami', name: 'Mami', full: 'Mami Tomoe', role: 'La senpai', tag: 'YELLOW', magic: true,
      bg: '#FFF2C9', line: '#F3DC8E', gem: '#E8A817', page: '#FFF7DE',
      quote: 'Una chica mágica nunca pierde el estilo.',
      about: 'Elegante y generosa, la senpai que guía a Madoka y Sayaka.',
      facts: [['Color', 'Amarillo'], ['Arma', 'Mosquetes'], ['Le encanta', 'Té y pasteles'], ['Poder', 'Cintas mágicas']],
      wish: 'Seguir con vida después de un accidente de coche. No tuvo tiempo de pensar otro deseo.',
      wishEp: 3
    },
    {
      id: 'kyoko', name: 'Kyoko', full: 'Kyoko Sakura', role: 'La rebelde', tag: 'RED', magic: true,
      bg: '#FFDCD6', line: '#F4B4A8', gem: '#E5533D', page: '#FFE9E5',
      quote: '¿Quieres un poco? Nunca se tira la comida.',
      about: 'Rebelde y con mucha actitud, siempre con un snack en la mano. Por dentro tiene un gran corazón.',
      facts: [['Color', 'Rojo'], ['Arma', 'Lanza'], ['Le encanta', 'Comer snacks'], ['Ciudad', 'Llega de fuera']],
      wish: 'Que la gente escuchara los sermones de su papá, que era sacerdote.',
      wishEp: 7
    },
    {
      id: 'kyubey', name: 'Kyubey', full: 'Kyubey', role: '¿Mascota?', tag: '???', magic: false,
      bg: '#F1F1F4', line: '#D9D9E2', gem: '#C9C3D1', page: '#F6F6F9',
      quote: '¡Haz un contrato conmigo y conviértete en chica mágica!',
      about: 'Parece una mascota tierna que cumple deseos… pero ¿qué quiere de verdad?',
      facts: [['Color', 'Blanco'], ['Arma', 'Ninguna'], ['Le encanta', 'Hacer contratos'], ['Ojos', 'Rojos']],
      wish: 'No tiene deseo: es un ser de otro planeta que recoge la energía de las chicas mágicas para su especie.',
      wishEp: 9, secretLabel: 'SU SECRETO'
    }
  ];
  var BY_ID = {};
  CHARS.forEach(function (c) { BY_ID[c.id] = c; });

  var EPS = [
    { t: 'Un sueño muy extraño', s: 'Madoka sueña con una batalla y conoce a Homura, la chica nueva.',
      b: ['Madoka sueña con una chica que lucha sola contra algo enorme.', 'En clase llega Homura… ¡y es la chica del sueño!', 'Madoka y Sayaka conocen a Kyubey y a Mami, una chica mágica.'],
      cast: ['madoka', 'homura', 'sayaka', 'mami', 'kyubey'] },
    { t: 'Un deseo a cambio', s: 'Kyubey ofrece cumplir un deseo y Mami enseña cómo luchan.',
      b: ['Kyubey explica el trato: un deseo a cambio de luchar contra las brujas.', 'Mami lleva a Madoka y Sayaka a ver una batalla de verdad.', 'Las dos piensan qué deseo pedirían.'],
      cast: ['madoka', 'sayaka', 'mami', 'homura', 'kyubey'] },
    { t: 'Sin miedo a nada', s: 'Una batalla que lo cambia todo para Madoka y Sayaka.',
      b: ['Madoka le dice a Mami que quiere ser chica mágica como ella.', 'Aparece una bruja muy peligrosa en el hospital.', 'La batalla termina de forma muy triste y todo cambia.'],
      cast: ['madoka', 'sayaka', 'mami', 'homura', 'kyubey'] },
    { t: 'Milagros y magia', s: 'Sayaka toma una gran decisión por alguien a quien quiere.',
      b: ['Madoka está muy triste y asustada.', 'Sayaka pide su deseo por Kyosuke y se convierte en chica mágica.', 'Sayaka llega justo a tiempo para salvar a Madoka.'],
      cast: ['madoka', 'sayaka', 'homura', 'kyubey'] },
    { t: 'Llega una rival', s: 'Aparece Kyoko, una chica mágica que lucha a su manera.',
      b: ['Sayaka está feliz de ser chica mágica.', 'Llega Kyoko, que piensa muy distinto sobre la magia.', 'Sayaka y Kyoko se enfrentan y Homura las detiene.'],
      cast: ['sayaka', 'kyoko', 'homura', 'madoka'] },
    { t: 'Un secreto en la gema', s: 'Madoka descubre algo sorprendente sobre las gemas del alma.',
      b: ['Kyoko y Sayaka siguen sin ponerse de acuerdo.', 'Madoka intenta separarlas y algo sale mal.', 'Kyubey revela qué son en realidad las gemas del alma.'],
      cast: ['madoka', 'sayaka', 'kyoko', 'homura', 'kyubey'] },
    { t: 'Corazones confundidos', s: 'Sayaka tiene sentimientos difíciles y Kyoko cuenta su pasado.',
      b: ['Sayaka se siente muy mal después del secreto de las gemas.', 'Kyoko le cuenta a Sayaka la historia de su familia.', 'Hitomi le confiesa a Sayaka que también quiere a Kyosuke.'],
      cast: ['sayaka', 'kyoko', 'madoka', 'kyubey'] },
    { t: 'Un camino oscuro', s: 'Sayaka se siente cada vez más sola y triste.',
      b: ['Sayaka lucha sin descanso y no quiere ayuda.', 'Madoka intenta animarla, pero Sayaka está muy triste.', 'Se descubre lo que pasa cuando una gema se llena de tristeza.'],
      cast: ['sayaka', 'madoka', 'kyoko', 'homura', 'kyubey'] },
    { t: 'Juntas hasta el final', s: 'Kyoko hace todo lo posible por ayudar a Sayaka.',
      b: ['Kyoko quiere salvar a Sayaka a toda costa.', 'Madoka acompaña a Kyoko en una misión muy peligrosa.', 'Kyubey revela lo que busca de verdad.'],
      cast: ['kyoko', 'sayaka', 'madoka', 'kyubey', 'homura'] },
    { t: 'La historia de Homura', s: 'Por fin descubrimos quién es Homura en realidad.',
      b: ['Homura antes era una chica tímida y enfermiza.', 'Madoka fue su primera amiga.', 'Homura pidió un deseo para protegerla y ha repetido el tiempo muchas veces.'],
      cast: ['homura', 'madoka', 'mami', 'sayaka', 'kyoko'] },
    { t: 'La gran tormenta', s: 'Llega la bruja más poderosa y Homura lucha sola.',
      b: ['Una enorme tormenta se acerca a la ciudad.', 'Homura se enfrenta sola a la bruja más poderosa.', 'Madoka piensa en lo que debe hacer.'],
      cast: ['homura', 'madoka', 'kyubey'] },
    { t: 'Mi mejor amiga', s: 'Madoka pide su deseo y cambia el mundo para siempre.',
      b: ['Madoka pide un deseo que nadie había pedido antes.', 'Se convierte en una fuerza que protege a todas las chicas mágicas.', 'Homura sigue luchando y recuerda a su mejor amiga.'],
      cast: ['madoka', 'homura', 'sayaka', 'mami', 'kyoko', 'kyubey'] }
  ];

  var MOVIES = [
    { t: 'Beginnings y Eternal (2012)', s: 'Dos películas que vuelven a contar la serie con imágenes nuevas.' },
    { t: 'Rebellion (2013)', s: 'Una historia nueva después del final de la serie. Mejor verla al terminar los 12 episodios.' },
    { t: 'Walpurgisnacht: Rising', s: 'Nueva película anunciada que continúa la historia.' }
  ];

  var QUIZ = [
    ['Tienes un sábado libre. ¿Qué haces?', [['Dibujar y estar con mi familia', 'madoka'], ['Una merienda con té y pasteles', 'mami'], ['Salir de aventura con mis amigas', 'sayaka'], ['Buscar comida rica… ¡y compartir!', 'kyoko']]],
    ['Tu amiga está triste. Tú…', [['La escucho y le doy un abrazo', 'madoka'], ['Hago un plan secreto para ayudarla', 'homura'], ['La defiendo de quien sea', 'sayaka'], ['Le preparo algo dulce', 'mami']]],
    ['¿Cuál es tu color favorito?', [['Rosa', 'madoka'], ['Morado', 'homura'], ['Azul', 'sayaka'], ['Amarillo', 'mami'], ['Rojo', 'kyoko']]],
    ['Elige un superpoder', [['Controlar el tiempo', 'homura'], ['Curar a los demás', 'sayaka'], ['Cintas mágicas con mucho estilo', 'mami'], ['Una lanza imparable', 'kyoko']]],
    ['En un grupo K-pop serías…', [['El corazón del grupo', 'madoka'], ['La misteriosa', 'homura'], ['La líder elegante', 'mami'], ['La rebelde con actitud', 'kyoko']]]
  ];
  var RESULT = {
    madoka: 'Eres amable y cariñosa. Tu superpoder es querer a todo el mundo y nunca rendirte con tus amigas.',
    homura: 'Eres tranquila y misteriosa, pero harías cualquier cosa por proteger a quien quieres.',
    sayaka: 'Eres valiente, divertida y justa. Siempre das la cara por tus amigas.',
    mami: 'Eres elegante y generosa: la senpai que todas admiran y que siempre invita a merendar.',
    kyoko: 'Eres rebelde y con mucha actitud, pero escondes un corazón enorme. ¡Y nunca dices no a un snack!'
  };

  // ---------- Estado guardado ----------
  var KEY = 'madoka-app-v1';
  var state = { safe: true, seen: 0, favs: { madoka: true }, filter: 'all', quiz: null, lastQuiz: null, revealed: {} };
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved) { state.safe = saved.safe !== false; state.seen = saved.seen || 0; state.favs = saved.favs || state.favs; state.lastQuiz = saved.lastQuiz || null; }
  } catch (e) { /* sin almacenamiento: seguimos */ }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ safe: state.safe, seen: state.seen, favs: state.favs, lastQuiz: state.lastQuiz })); } catch (e) { }
  }

  // ---------- Piezas ----------
  function gem(color, w) {
    var h = Math.round(w * 1.3);
    return '<svg class="gem" aria-hidden="true" width="' + w + '" height="' + h + '" viewBox="0 0 40 52">' +
      '<path d="M20 2L36 18L20 50L4 18Z" fill="' + color + '" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M4 18H36M12 18L20 2L28 18M12 18L20 50L28 18" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="round" opacity=".8"/></svg>';
  }
  function sparkle(size, top, side, color, opacity) {
    return '<svg class="sparkle" aria-hidden="true" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" style="top:' + top + ';' + side + ';opacity:' + (opacity || 1) + '">' +
      '<path d="M12 0c.8 6 5.2 10.4 12 12-6.8 1.6-11.2 6-12 12-.8-6-5.2-10.4-12-12C6.8 10.4 11.2 6 12 0z" fill="' + color + '"/></svg>';
  }
  function vars(c) { return '--c-bg:' + c.bg + ';--c-line:' + c.line; }
  var BACK = '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>';
  var LOCK = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  var HEART = '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>';
  function isLocked(ep) { return state.safe && ep > state.seen; }
  function favCount() { return Object.keys(state.favs).filter(function (k) { return state.favs[k]; }).length; }
  function biasOfDay() {
    var girls = CHARS.filter(function (c) { return c.magic; });
    var day = Math.floor(Date.now() / 86400000);
    return girls[day % girls.length];
  }

  // ---------- Pantallas ----------
  function home() {
    var c = biasOfDay();
    return '<div class="screen">' +
      sparkle(120, '-20px', 'right:-24px', '#FFD6E7', .6) +
      '<header class="row between">' +
        '<div><div class="kicker">안녕 · HOLA</div><h1 class="title">¡Hola, chica mágica!</h1></div>' +
        '<span class="icon-btn" style="width:52px;height:52px;border-color:#F9B8D3">' + gem('#F06BA8', 24) + '</span>' +
      '</header>' +
      '<button class="toggle" data-act="safe" aria-pressed="' + state.safe + '"><span>Modo sin spoilers</span>' +
        '<span class="state">' + (state.safe ? 'Activado' : 'Apagado') + '<span class="track"><i></i></span></span></button>' +
      '<section class="stack mt">' +
        '<div class="row between"><h2 style="font-size:20px;font-weight:600">Bias del día</h2><span class="muted" style="font-size:12px;font-weight:700">Cambia cada día</span></div>' +
        '<a class="bias" href="#perfil-' + c.id + '" style="' + vars(c) + '">' +
          '<div class="pc tilt">' + gem(c.gem, 58) + c.name.toUpperCase() + '</div>' +
          '<div class="stack" style="gap:6px;justify-content:center">' +
            '<span class="tag dark" style="align-self:flex-start">MY BIAS</span>' +
            '<b style="font-family:Fredoka,sans-serif;font-size:22px;line-height:1.1">' + c.full + '</b>' +
            '<span style="font-size:13px;line-height:1.4">' + c.about + '</span>' +
            '<span style="font-size:13px;font-weight:800;color:var(--accent)">Ver perfil →</span>' +
          '</div></a>' +
      '</section>' +
      '<section class="tiles mt">' +
        '<a class="tile" href="#personajes" style="background:#E6DDFB;border-color:#CDBDF2"><svg aria-hidden="true" viewBox="0 0 24 24"><rect x="4" y="3" width="12" height="16" rx="2"/><path d="M8 21h10a2 2 0 0 0 2-2V7"/></svg><span><b>Personajes</b><small>' + CHARS.length + ' photocards</small></span></a>' +
        '<a class="tile" href="#historia" style="background:#D7F3EA;border-color:#A9E0CD"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/></svg><span><b>Historia</b><small>Visto: ' + state.seen + ' de 12</small></span></a>' +
      '</section>' +
      '<a class="banner mt" href="#quiz"><span class="ic"><svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24"><path d="M12 2c.6 4.6 3.4 7.4 8 8-4.6.6-7.4 3.4-8 8-.6-4.6-3.4-7.4-8-8 4.6-.6 7.4-3.4 8-8z" fill="#E85A9B"/></svg></span>' +
        '<span><b>¿Qué chica mágica eres?</b><small>' + (state.lastQuiz ? 'Tu último resultado: ' + BY_ID[state.lastQuiz].name : 'Quiz de 5 preguntas') + '</small></span></a>' +
    '</div>';
  }

  function characters() {
    var f = state.filter;
    var list = CHARS.filter(function (c) { return f === 'all' || (f === 'magic' ? c.magic : !c.magic); });
    function chip(id, label) { return '<button class="chip" data-act="filter" data-id="' + id + '" aria-pressed="' + (f === id) + '">' + label + '</button>'; }
    return '<div class="screen">' +
      '<header><div class="kicker">MEMBERS</div><div class="row between" style="align-items:baseline"><h1 class="title">Personajes</h1>' +
      '<span style="font-size:13px;font-weight:800;color:var(--accent)">' + favCount() + (favCount() === 1 ? ' favorita' : ' favoritas') + '</span></div></header>' +
      '<div class="row mt" style="flex-wrap:wrap;gap:8px">' + chip('all', 'Todas') + chip('magic', 'Chicas mágicas') + chip('other', 'Otros') + '</div>' +
      '<div class="grid mt">' + list.map(function (c) {
        return '<div class="card" style="' + vars(c) + '">' +
          '<a class="art" href="#perfil-' + c.id + '" aria-label="Ver perfil de ' + c.name + '">' + gem(c.gem, 46) + '</a>' +
          '<div class="row between" style="padding-left:4px"><a href="#perfil-' + c.id + '"><span class="name">' + c.name + '</span><span class="role">' + c.role + '</span></a>' +
          '<button class="heart" data-act="fav" data-id="' + c.id + '" aria-label="Favorita: ' + c.name + '" aria-pressed="' + !!state.favs[c.id] + '">' + HEART + '</button></div>' +
          '<span class="tag">' + c.tag + '</span></div>';
      }).join('') + '</div>' +
    '</div>';
  }

  function profile(id) {
    var c = BY_ID[id];
    if (!c) return characters();
    var locked = isLocked(c.wishEp);
    var open = !!state.revealed[id];
    var label = c.secretLabel || 'SU DESEO';
    var secret = locked
      ? '<div class="spoiler" style="cursor:default"><span class="lbl"><span>' + label + '</span><span>Bloqueado</span></span>' +
        '<span class="locked-note">' + LOCK + 'Se desbloquea al ver el episodio ' + c.wishEp + '</span></div>'
      : '<button class="spoiler" data-act="reveal" data-id="' + id + '" aria-expanded="' + open + '"><span class="lbl"><span>' + label + ' · SPOILER</span><span>' + (open ? 'Ocultar' : 'Toca para ver') + '</span></span>' +
        '<p>' + (open ? c.wish : 'Este texto está escondido. Toca para verlo.') + '</p></button>';
    return '<div class="screen">' +
      sparkle(90, '120px', 'left:-26px', '#FFFFFF', .7) + sparkle(36, '300px', 'right:30px', '#F6C453') +
      '<header class="row between"><a class="icon-btn" href="#personajes" aria-label="Volver a personajes">' + BACK + '</a>' +
        '<span class="kicker">PROFILE</span>' +
        '<button class="heart" style="width:44px;height:44px" data-act="fav" data-id="' + id + '" aria-label="Favorita" aria-pressed="' + !!state.favs[id] + '">' + HEART + '</button></header>' +
      '<div style="position:relative">' +
        '<div class="pc tilt profile-pc" style="' + vars(c) + '">' + gem(c.gem, 84) + c.name.toUpperCase() + '</div>' +
        (state.favs[id] ? '<span class="tag dark" style="position:absolute;top:18px;left:calc(50% - 110px);transform:rotate(-10deg);font-size:11px">MY BIAS</span>' : '') +
      '</div>' +
      '<div class="stack center mt" style="gap:4px"><h1 style="font-size:30px">' + c.full + '</h1>' +
        '<span style="font-size:14px;font-weight:700;color:var(--accent)">“' + c.quote + '”</span>' +
        '<span style="font-size:14px;line-height:1.45;max-width:320px">' + c.about + '</span></div>' +
      '<section class="panel mt"><div class="facts">' + c.facts.map(function (f) { return '<div class="fact"><span>' + f[0] + '</span><b>' + f[1] + '</b></div>'; }).join('') + '</div>' + secret + '</section>' +
      '<a class="btn block mt" href="#historia">Ver la historia →</a>' +
    '</div>';
  }

  function history() {
    var pct = Math.round(state.seen / 12 * 100);
    return '<div class="screen">' +
      '<header><div class="kicker" style="color:#2F6B57">STORY</div><h1 class="title">La historia</h1></header>' +
      '<section class="progress stack mt" style="gap:8px">' +
        '<div class="row between" style="align-items:baseline"><b style="font-size:14px">¿Hasta dónde has visto?</b><span style="font-family:Fredoka,sans-serif;font-size:18px;font-weight:700;color:#2F6B57">Ep. ' + state.seen + '/12</span></div>' +
        '<div class="row" style="gap:10px"><button class="round" data-act="seen" data-d="-1" aria-label="Un episodio menos">−</button>' +
        '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="12" aria-valuenow="' + state.seen + '"><i style="width:' + pct + '%"></i></div>' +
        '<button class="round" data-act="seen" data-d="1" aria-label="Un episodio más">+</button></div>' +
        (state.safe ? '' : '<span class="muted" style="font-size:12px">Modo sin spoilers apagado: todo está visible.</span>') +
      '</section>' +
      '<h2 class="mt" style="font-size:18px;font-weight:600">Serie · 12 episodios</h2>' +
      '<ol class="timeline">' + EPS.map(function (e, i) {
        var n = i + 1, lock = isLocked(n);
        return '<li class="' + (lock ? 'is-locked' : '') + '"><div class="dotcol"><span class="num">' + n + '</span></div>' +
          (lock
            ? '<a class="ep locked" href="#ep-' + n + '">' + LOCK + 'Bloqueado · ¡sin spoilers!</a>'
            : '<a class="ep" href="#ep-' + n + '"><b>' + e.t + '</b><small>' + e.s + '</small></a>') + '</li>';
      }).join('') + '</ol>' +
      '<h2 class="mt" style="font-size:18px;font-weight:600">Películas</h2>' +
      '<div class="stack" style="margin-top:10px">' + MOVIES.map(function (m) {
        return '<div class="ep" style="border-color:#E9D9EF"><b>' + m.t + '</b><small>' + m.s + '</small></div>';
      }).join('') + '</div>' +
    '</div>';
  }

  function episode(n) {
    var e = EPS[n - 1];
    if (!e) return history();
    var hero = '<div class="ep-hero">' + sparkle(60, '70px', 'left:46px', '#FFFFFF') + sparkle(28, '150px', 'right:70px', '#F6C453') +
      (n < 10 ? '0' + n : n) + '<a class="icon-btn" href="#historia" aria-label="Volver a la historia">' + BACK + '</a></div>';
    if (isLocked(n)) {
      return '<div class="screen">' + hero +
        '<div class="ep-head stack center"><span class="tag" style="background:#FFE3EF;color:var(--accent)">EPISODIO ' + n + '</span>' +
        '<h1 style="font-size:24px">¡Alto! Aún no lo has visto</h1>' +
        '<p style="margin:0;line-height:1.5">Este episodio está bloqueado para que no te encuentres spoilers.</p>' +
        '<button class="btn" data-act="markseen" data-n="' + n + '">Ya lo vi, ¡desbloquear!</button></div></div>';
    }
    var dots = ['#F06BA8', '#8E6BD8', '#E8A817'];
    return '<div class="screen">' + hero +
      '<div class="ep-head stack" style="gap:6px"><span class="tag" style="align-self:flex-start;background:#FFE3EF;color:var(--accent)">EPISODIO ' + n + '</span>' +
        '<h1 style="font-size:25px;line-height:1.15">' + e.t + '</h1><span class="muted" style="font-size:13px">' + e.s + '</span></div>' +
      '<h2 class="mt" style="font-size:18px;font-weight:600">¿Qué pasa?</h2>' +
      '<ul class="bullets" style="margin-top:10px">' + e.b.map(function (b, i) { return '<li style="--dot:' + dots[i % 3] + '">' + b + '</li>'; }).join('') + '</ul>' +
      '<h2 class="mt" style="font-size:18px;font-weight:600">Aparecen</h2>' +
      '<div class="cast" style="margin-top:10px">' + e.cast.map(function (id) {
        var c = BY_ID[id];
        return '<a href="#perfil-' + id + '" style="' + vars(c) + '"><span>' + gem(c.gem, 20) + '</span>' + c.name + '</a>';
      }).join('') + '</div>' +
      (state.seen < n ? '<button class="btn light block mt" data-act="markseen" data-n="' + n + '">Marcar como visto</button>' : '') +
      '<div class="pager">' +
        '<a class="btn light" href="#ep-' + (n - 1) + '" aria-disabled="' + (n === 1) + '">← Anterior</a>' +
        '<a class="btn" href="#ep-' + (n + 1) + '" aria-disabled="' + (n === 12) + '">Siguiente →</a></div>' +
    '</div>';
  }

  function quiz() {
    var q = state.quiz;
    var girls = ['madoka', 'homura', 'sayaka', 'mami', 'kyoko'];
    if (!q) {
      return '<div class="screen stack center" style="min-height:70vh;justify-content:center;gap:18px">' +
        sparkle(110, '0', 'right:-30px', '#FFD6E7', .7) +
        '<div class="row" style="gap:6px;align-items:flex-end">' + girls.map(function (id, i) { return gem(BY_ID[id].gem, i === 2 ? 46 : 34); }).join('') + '</div>' +
        '<h1 style="font-size:36px;line-height:1.1">¿Qué chica mágica eres?</h1>' +
        '<p style="margin:0;font-size:16px;line-height:1.5;max-width:290px">Responde 5 preguntas y descubre quién es tu alma gemela del grupo.</p>' +
        '<button class="btn" style="height:56px;padding:0 40px;font-family:Fredoka,sans-serif;font-size:19px;font-weight:600" data-act="qstart">¡Empezar!</button>' +
        '<span class="muted" style="font-size:12px;font-weight:700">Sin spoilers · 1 minuto</span></div>';
    }
    if (q.step < QUIZ.length) {
      var item = QUIZ[q.step], pct = Math.round((q.step + 1) / QUIZ.length * 100);
      return '<div class="screen stack" style="gap:16px">' +
        '<header class="row"><button class="icon-btn" data-act="qreset" aria-label="Salir del quiz">' + BACK + '</button><span class="kicker">QUIZ</span></header>' +
        '<div class="stack" style="gap:8px"><div class="row between" style="font-size:13px;font-weight:800"><span>Pregunta ' + (q.step + 1) + ' de ' + QUIZ.length + '</span><span style="color:var(--accent)">' + pct + '%</span></div>' +
        '<div class="bar" style="background:#fff;height:12px"><i style="width:' + pct + '%;background:var(--pink)"></i></div></div>' +
        '<div class="qcard"><h2 style="font-size:24px;line-height:1.2">' + item[0] + '</h2></div>' +
        '<div class="stack">' + item[1].map(function (a, i) {
          var c = BY_ID[a[1]];
          return '<button class="answer" style="' + vars(c) + '" data-act="qpick" data-id="' + a[1] + '"><i>' + 'ABCDE'[i] + '</i>' + a[0] + '</button>';
        }).join('') + '</div></div>';
    }
    var best = girls[0];
    girls.forEach(function (k) { if ((q.score[k] || 0) > (q.score[best] || 0)) best = k; });
    var r = BY_ID[best];
    return '<div class="screen stack center" style="gap:16px">' +
      '<span class="kicker">TU RESULTADO</span>' +
      '<div class="pc tilt result-pc" style="' + vars(r) + '">' + gem(r.gem, 90) + r.name.toUpperCase() + '</div>' +
      '<h1 style="font-size:32px;margin-top:6px">¡Eres ' + r.name + '!</h1>' +
      '<p style="margin:0;font-size:16px;line-height:1.5;max-width:300px">' + RESULT[best] + '</p>' +
      '<div class="row" style="gap:10px;margin-top:6px"><a class="btn" href="#perfil-' + best + '">Ver su perfil</a>' +
      '<button class="btn light" data-act="qreset">Repetir</button></div></div>';
  }

  // ---------- Router ----------
  var app = document.getElementById('app');
  function route() {
    var h = (location.hash || '#inicio').slice(1);
    var html, tab = h, page = '#FFF7FB';
    if (h.indexOf('perfil-') === 0) {
      var id = h.slice(7); html = profile(id); tab = 'personajes';
      if (BY_ID[id]) page = BY_ID[id].page;
    } else if (h.indexOf('ep-') === 0) {
      html = episode(parseInt(h.slice(3), 10)); tab = 'historia';
    } else if (h === 'personajes') { html = characters(); }
    else if (h === 'historia') { html = history(); page = '#F2FBF7'; }
    else if (h === 'quiz') {
      html = quiz();
      var q = state.quiz;
      if (q && q.step >= QUIZ.length) {
        var girls = ['madoka', 'homura', 'sayaka', 'mami', 'kyoko'], best = girls[0];
        girls.forEach(function (k) { if ((q.score[k] || 0) > (q.score[best] || 0)) best = k; });
        page = BY_ID[best].bg;
      } else { page = '#FFE3EF'; }
    }
    else { html = home(); tab = 'inicio'; }
    app.innerHTML = html;
    document.body.style.setProperty('--page', page);
    document.querySelector('meta[name="theme-color"]').setAttribute('content', page);
    document.body.classList.toggle('hide-tabbar', h.indexOf('ep-') === 0);
    document.querySelectorAll('.tabbar a').forEach(function (a) {
      if (a.getAttribute('data-tab') === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  function rerender(keepScroll) {
    var y = window.scrollY; route(); if (keepScroll) window.scrollTo(0, y);
  }

  app.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act'), id = t.getAttribute('data-id');
    if (act === 'safe') { state.safe = !state.safe; state.revealed = {}; }
    else if (act === 'filter') { state.filter = id; }
    else if (act === 'fav') { state.favs[id] = !state.favs[id]; }
    else if (act === 'reveal') { state.revealed[id] = !state.revealed[id]; }
    else if (act === 'seen') { state.seen = Math.max(0, Math.min(12, state.seen + parseInt(t.getAttribute('data-d'), 10))); }
    else if (act === 'markseen') { state.seen = Math.max(state.seen, parseInt(t.getAttribute('data-n'), 10)); }
    else if (act === 'qstart') { state.quiz = { step: 0, score: {} }; }
    else if (act === 'qpick') {
      state.quiz.score[id] = (state.quiz.score[id] || 0) + 1; state.quiz.step++;
      if (state.quiz.step >= QUIZ.length) {
        var girls = ['madoka', 'homura', 'sayaka', 'mami', 'kyoko'], best = girls[0];
        girls.forEach(function (k) { if ((state.quiz.score[k] || 0) > (state.quiz.score[best] || 0)) best = k; });
        state.lastQuiz = best;
      }
      window.scrollTo(0, 0);
    }
    else if (act === 'qreset') { state.quiz = null; }
    save();
    rerender(act !== 'qpick' && act !== 'qstart' && act !== 'qreset');
  });

  window.addEventListener('hashchange', function () { route(); window.scrollTo(0, 0); });
  route();
})();
