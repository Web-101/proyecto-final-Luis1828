document.addEventListener('DOMContentLoaded', async () => {
  pintarNavegacionInferior('cartelera');
  const view = document.getElementById('vistaPelicula');
  const query = obtenerParametros();
  const movieId = query.get('id');

  if (!movieId) {
    view.innerHTML = '<div class="aviso">No se encontró una película seleccionada. Vuelve a la cartelera.</div>';
    return;
  }

  try {
    const { movie } = await obtenerApi(`/api/cartelera/${encodeURIComponent(movieId)}`);
    const functions = await obtenerApi(`/api/funciones/${encodeURIComponent(movieId)}`);
    const todayFunctions = functions.showtimes || [];

    if (!todayFunctions.length) {
      view.innerHTML = '<div class="aviso">No hay funciones disponibles para hoy.</div>';
      return;
    }

    view.innerHTML = `
      <section class="tarjeta detalle-pelicula">
        <div class="detalle-pelicula__cabecera">
          <div class="afiche">
            <img src="${movie.poster}" alt="${escaparHTML(movie.title)}">
          </div>
          <div class="detalle-pelicula__texto">
            <div class="etiqueta">${escaparHTML(movie.genre)}</div>
            <h1>${escaparHTML(movie.title)}</h1>
            <p class="texto-apoyo">${escaparHTML(movie.synopsis)}</p>
            <div class="detalle-pelicula__datos">
              <span class="dato">⭐ ${escaparHTML(movie.rating)}</span>
              <span class="dato">${escaparHTML(movie.duration)}</span>
              <span class="dato">Hoy</span>
            </div>
          </div>
        </div>

        <div class="titulo-seccion titulo-seccion--interior">
          <h2>Funciones del día</h2>
          <span>Selecciona una hora</span>
        </div>

        <div class="horarios" id="listaHorarios"></div>
      </section>
    `;

    const listaHorarios = document.getElementById('listaHorarios');
    listaHorarios.innerHTML = todayFunctions.map((showtime) => `
      <button class="boton-horario" type="button" data-funcion-id="${showtime.id}">
        <strong>${escaparHTML(showtime.time)}</strong>
        <span>${escaparHTML(showtime.format)} · ${escaparHTML(showtime.room)} · ${dinero(showtime.price)}</span>
      </button>
    `).join('');

    listaHorarios.querySelectorAll('[data-funcion-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const selected = todayFunctions.find((item) => item.id === button.dataset.funcionId);
        if (!selected) return;

        guardarReserva({
          movieId: movie.id,
          movieTitle: movie.title,
          poster: movie.poster,
          rating: movie.rating,
          duration: movie.duration,
          genre: movie.genre,
          synopsis: movie.synopsis,
          showId: selected.id,
          showTime: selected.time,
          showFormat: selected.format,
          showRoom: selected.room,
          price: selected.price,
          seats: [],
          total: 0,
        });

        window.location.href = `asientos.html?movie=${encodeURIComponent(movie.id)}&show=${encodeURIComponent(selected.id)}`;
      });
    });
  } catch (error) {
    view.innerHTML = `<div class="aviso">${escaparHTML(error.message)}</div>`;
  }
});
