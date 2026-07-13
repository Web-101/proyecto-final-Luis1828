const API_BASE = '';
const RUTA_DATOS_ESTATICOS = 'data/cartelera.json';

let datosEstaticosPromesa = null;

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

function fechaActualIso() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function rutaArchivo(path) {
  if (!path) return '';
  if (path.startsWith('/assets/')) return path.slice(1);
  return path;
}

function normalizarDatosEstaticos(data) {
  const copia = JSON.parse(JSON.stringify(data || {}));
  for (const movie of copia.movies || []) {
    movie.poster = rutaArchivo(movie.poster);
  }
  for (const movie of copia.upcoming || []) {
    movie.poster = rutaArchivo(movie.poster);
  }
  return copia;
}

async function cargarDatosEstaticos() {
  if (!datosEstaticosPromesa) {
    datosEstaticosPromesa = fetch(RUTA_DATOS_ESTATICOS)
      .then((response) => {
        if (!response.ok) throw new Error('No se pudo cargar la cartelera');
        return response.json();
      })
      .then(normalizarDatosEstaticos);
  }
  return datosEstaticosPromesa;
}

function buscarPelicula(data, movieId) {
  return (data.movies || []).find((movie) => movie.id === movieId);
}

function buscarFuncion(data, showId) {
  for (const movie of data.movies || []) {
    const showtime = (movie.showtimes || []).find((show) => show.id === showId);
    if (showtime) return { movie, showtime };
  }
  return null;
}

function usarDatosEstaticos() {
  return window.location.hostname.endsWith('github.io') || window.location.protocol === 'file:';
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
  if (usarDatosEstaticos()) return obtenerApiEstatica(path);

  try {
    const response = await fetch(`${API_BASE}${path}`);
    const contentType = response.headers.get('Content-Type') || '';
    if (!contentType.includes('application/json')) {
      return obtenerApiEstatica(path);
    }

    const data = await response.json();
    if (!response.ok || data.ok === false) {
      throw new Error(data.message || 'Error al obtener datos');
    }
    return data;
  } catch (error) {
    if (error.name === 'SyntaxError' || error instanceof TypeError) {
      return obtenerApiEstatica(path);
    }
    throw error;
  }
}

async function enviarApi(path, body) {
  if (usarDatosEstaticos()) return enviarApiEstatica(path, body);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const contentType = response.headers.get('Content-Type') || '';
    if (!contentType.includes('application/json')) {
      return enviarApiEstatica(path, body);
    }

    const data = await response.json();
    if (!response.ok || data.ok === false) {
      const error = new Error(data.message || 'Error al enviar datos');
      error.details = data.errors || [];
      throw error;
    }
    return data;
  } catch (error) {
    if (error.name === 'SyntaxError' || error instanceof TypeError) {
      return enviarApiEstatica(path, body);
    }
    throw error;
  }
}

async function obtenerApiEstatica(path) {
  const data = await cargarDatosEstaticos();

  if (path === '/api/cartelera') {
    return {
      ok: true,
      today: fechaActualIso(),
      movies: data.movies || [],
      upcoming: data.upcoming || [],
    };
  }

  if (path === '/api/proximamente') {
    return {
      ok: true,
      upcoming: data.upcoming || [],
    };
  }

  const movieMatch = path.match(/^\/api\/cartelera\/([^/]+)$/);
  if (movieMatch) {
    const movie = buscarPelicula(data, decodeURIComponent(movieMatch[1]));
    if (!movie) throw new Error('Película no encontrada');
    return { ok: true, movie };
  }

  const funcionesMatch = path.match(/^\/api\/funciones\/([^/]+)$/);
  if (funcionesMatch) {
    const movie = buscarPelicula(data, decodeURIComponent(funcionesMatch[1]));
    if (!movie) throw new Error('Película no encontrada');

    const today = fechaActualIso();
    const showtimes = (movie.showtimes || []).filter((showtime) => showtime.date === today);
    return {
      ok: true,
      movieId: movie.id,
      title: movie.title,
      showtimes: showtimes.length ? showtimes : (movie.showtimes || []),
    };
  }

  const asientosMatch = path.match(/^\/api\/asientos\/([^/]+)$/);
  if (asientosMatch) {
    const found = buscarFuncion(data, decodeURIComponent(asientosMatch[1]));
    if (!found) throw new Error('Función no encontrada');

    const { movie, showtime } = found;
    return {
      ok: true,
      movie: {
        id: movie.id,
        title: movie.title,
        poster: movie.poster,
        duration: movie.duration,
        rating: movie.rating,
        genre: movie.genre,
      },
      showtime,
      seatRows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
      seatCols: [1, 2, 3, 4, 5, 6, 7, 8],
    };
  }

  throw new Error('Recurso no encontrado');
}

async function enviarApiEstatica(path, payload) {
  if (path !== '/api/checkout') throw new Error('Recurso no encontrado');

  const errors = [];
  if (!payload.name || !payload.name.trim()) errors.push('El nombre es obligatorio');
  if (!payload.email || !payload.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    errors.push('El correo electrónico es inválido');
  }
  if (!payload.movieId || !payload.showId) errors.push('Falta película o función');
  if (!Array.isArray(payload.seats) || payload.seats.length === 0) {
    errors.push('Debes seleccionar al menos un asiento');
  }

  const data = await cargarDatosEstaticos();
  const found = payload.showId ? buscarFuncion(data, payload.showId) : null;
  if (!found) errors.push('La función seleccionada no existe');

  if (errors.length) {
    const error = new Error('No se pudo completar la compra');
    error.details = errors;
    throw error;
  }

  const ticketCode = `CP-${Date.now().toString(36).toUpperCase()}`;
  const { movie, showtime } = found;
  const purchase = {
    id: ticketCode,
    createdAt: new Date().toISOString(),
    movieId: payload.movieId,
    showId: payload.showId,
    seats: payload.seats,
    customer: {
      name: payload.name.trim(),
      email: payload.email.trim(),
      phone: (payload.phone || '').trim(),
    },
    total: Number(payload.total || 0),
    movieTitle: movie.title,
    poster: movie.poster,
    showtime,
  };

  return {
    ok: true,
    ticketCode,
    purchase,
  };
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
