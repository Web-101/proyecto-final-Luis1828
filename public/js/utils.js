const API_BASE = '';

function obtenerParametros() {
  return new URLSearchParams(window.location.search);
}

function escaparHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function dinero(value) {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function guardarReserva(draft) {
  localStorage.setItem('cinepalace_booking', JSON.stringify(draft));
}

function cargarReserva() {
  try {
    return JSON.parse(localStorage.getItem('cinepalace_booking')) || null;
  } catch {
    return null;
  }
}

function guardarEntradaActual(entrada) {
  localStorage.setItem('cinepalace_ticket', JSON.stringify(entrada));
}

function cargarEntradaActual() {
  try {
    return JSON.parse(localStorage.getItem('cinepalace_ticket')) || null;
  } catch {
    return null;
  }
}

function cargarHistorialEntradas() {
  try {
    return JSON.parse(localStorage.getItem('cinepalace_ticket_history')) || [];
  } catch {
    return [];
  }
}

function guardarHistorialEntrada(entrada) {
  const history = cargarHistorialEntradas();
  const codigoEntrada = entrada?.ticketCode || entrada?.id;
  const exists = history.some((item) => (item?.ticketCode || item?.id) === codigoEntrada);
  if (!exists) {
    history.unshift(entrada);
    localStorage.setItem('cinepalace_ticket_history', JSON.stringify(history.slice(0, 20)));
  }
}

function obtenerEntradasPerfil() {
  const entradas = [];

  for (const entrada of cargarHistorialEntradas()) {
    if (entrada) entradas.push(entrada);
  }

  const entradaActual = cargarEntradaActual();
  if (entradaActual) entradas.unshift(entradaActual);

  const draft = cargarReserva();
  if (draft?.ticketCode) entradas.unshift(draft);

  const seen = new Set();
  return entradas.filter((entrada) => {
    const key = entrada?.ticketCode || entrada?.id || JSON.stringify(entrada);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function obtenerApi(path) {
  const response = await fetch(`${API_BASE}${path}`);
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.message || 'Error al obtener datos');
  }
  return data;
}

async function enviarApi(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    const error = new Error(data.message || 'Error al enviar datos');
    error.details = data.errors || [];
    throw error;
  }
  return data;
}

function pintarNavegacionInferior(active) {
  const nav = document.querySelector('[data-navegacion-inferior]');
  if (!nav) return;
  nav.querySelectorAll('a').forEach((link) => {
    link.classList.toggle('activo', link.dataset.pagina === active);
  });
}

function tarjetaPelicula(movie, href, extraBadge = '') {
  const badge = extraBadge || `⭐ ${movie.rating || ''}`;
  const subtitle = movie.showtimes
    ? `${movie.genre} · ${movie.duration}`
    : `${movie.genre} · ${movie.duration || movie.year || ''}`;

  return `
    <a class="pelicula" href="${href}">
      <div class="pelicula__afiche">
        <img src="${movie.poster}" alt="${escaparHTML(movie.title)}">
        <span class="pelicula__etiqueta">${badge}</span>
      </div>
      <div class="pelicula__info">
        <h3 class="pelicula__titulo">${escaparHTML(movie.title)}</h3>
        <p class="pelicula__datos">${escaparHTML(subtitle)}</p>
      </div>
    </a>
  `;
}

function tarjetaProximoEstreno(movie) {
  return `
    <article class="estreno">
      <div class="estreno__afiche">
        <img src="${movie.poster}" alt="${escaparHTML(movie.title)}">
        <span class="estreno__etiqueta">${escaparHTML(movie.tag || 'PRÓX')}</span>
      </div>
      <div class="estreno__info">
        <h3>${escaparHTML(movie.title)}</h3>
        <p>${escaparHTML(movie.genre)} · ${escaparHTML(movie.year || '')}</p>
      </div>
    </article>
  `;
}

function formatearFecha(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = String(isoDate).split('-');
  return `${d}/${m}/${y}`;
}

function entradaPequena(entrada) {
  const tituloPelicula = entrada.movieTitle || entrada.tituloPelicula || 'Película';
  const when = entrada.showtime?.date
    ? `${formatearFecha(entrada.showtime.date)} · ${entrada.showtime.time || ''}`
    : entrada.showTime || '';
  const asientos = Array.isArray(entrada.seats) ? entrada.seats.join(', ') : (entrada.asientos || []).join(', ');
  const total = dinero(entrada.total || 0);
  return `
    <article class="entrada-pequena">
      <div class="entrada-pequena__arriba">
        <strong>${escaparHTML(tituloPelicula)}</strong>
        <span>${escaparHTML(entrada.ticketCode || entrada.id || '')}</span>
      </div>
      <p>${escaparHTML(when)}</p>
      <p>${escaparHTML(asientos)}</p>
      <div class="entrada-pequena__abajo">
        <span>${escaparHTML(entrada.customer?.name || 'Usuario 1')}</span>
        <strong>${total}</strong>
      </div>
    </article>
  `;
}
