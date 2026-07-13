document.addEventListener('DOMContentLoaded', async () => {
  pintarNavegacionInferior('cartelera');

  const grid = document.getElementById('listaCartelera');
  const fechaHoy = document.getElementById('fechaHoy');

  try {
    const data = await obtenerApi('/api/cartelera');
    const movies = data.movies || [];
    if (fechaHoy) fechaHoy.textContent = `Hoy · ${data.today}`;

    if (!movies.length) {
      grid.innerHTML = '<div class="vacio">No hay películas disponibles.</div>';
      return;
    }

    grid.innerHTML = movies.map((movie) => {
      return tarjetaPelicula(movie, `pelicula.html?id=${encodeURIComponent(movie.id)}`);
    }).join('');
  } catch (error) {
    grid.innerHTML = `<div class="aviso">${escaparHTML(error.message)}</div>`;
  }
});
