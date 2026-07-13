document.addEventListener('DOMContentLoaded', async () => {
  pintarNavegacionInferior('buscar');
  const view = document.getElementById('vistaBuscar');

  try {
    const data = await obtenerApi('/api/cartelera');
    const allMovies = [...(data.movies || []), ...(data.upcoming || [])];

    view.innerHTML = `
      <section class="tarjeta tarjeta-busqueda">
        <div class="buscador buscador--ancho">
          <img src="/assets/search.svg" alt="" width="18" height="18">
          <input id="campoBusqueda" type="search" placeholder="Buscar película...">
        </div>

        <div class="filtros filtros--busqueda" aria-label="Búsquedas rápidas">
          <button class="filtro activo" type="button" data-filtro-busqueda="all">Todos</button>
          <button class="filtro" type="button" data-filtro-busqueda="accion">Acción</button>
          <button class="filtro" type="button" data-filtro-busqueda="drama">Drama</button>
          <button class="filtro" type="button" data-filtro-busqueda="ciencia">Ciencia ficción</button>
        </div>

        <div class="titulo-seccion">
          <h2>Resultados sugeridos</h2>
          <span>Ver todo</span>
        </div>

        <section id="resultadosBusqueda" class="lista-peliculas"></section>
      </section>
    `;

    const input = document.getElementById('campoBusqueda');
    const results = document.getElementById('resultadosBusqueda');
    const filters = [...document.querySelectorAll('[data-filtro-busqueda]')];
    let currentFilter = 'all';

    const normalizar = (texto) => String(texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    const render = () => {
      const q = normalizar(input.value);

      const items = allMovies.filter((movie) => {
        const haystack = normalizar(`${movie.title} ${movie.genre} ${movie.year || ''}`);
        const genero = normalizar(movie.genre);
        const matchesQuery = !q || haystack.includes(q);
        const matchesFilter = currentFilter === 'all' || genero.includes(currentFilter);
        return matchesQuery && matchesFilter;
      });

      if (!items.length) {
        results.innerHTML = '<div class="vacio">No hay resultados.</div>';
        return;
      }

      results.innerHTML = items.map((movie) => {
        const href = movie.showtimes ? `/pelicula.html?id=${encodeURIComponent(movie.id)}` : '/proximamente.html';
        const badge = movie.showtimes ? `⭐ ${movie.rating}` : (movie.tag || 'PRÓX');
        return tarjetaPelicula(movie, href, badge);
      }).join('');
    };

    input.addEventListener('input', render);

    filters.forEach((button) => {
      button.addEventListener('click', () => {
        currentFilter = button.dataset.filtroBusqueda;
        filters.forEach((item) => item.classList.toggle('activo', item === button));
        render();
      });
    });

    render();
  } catch (error) {
    view.innerHTML = `<div class="aviso">${escaparHTML(error.message)}</div>`;
  }
});
