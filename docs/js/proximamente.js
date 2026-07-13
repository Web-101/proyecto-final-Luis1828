document.addEventListener('DOMContentLoaded', async () => {
  pintarNavegacionInferior('cartelera');
  const view = document.getElementById('vistaProximamente');

  try {
    const { upcoming = [] } = await obtenerApi('/api/proximamente');

    if (!upcoming.length) {
      view.innerHTML = '<div class="aviso">No hay estrenos próximos registrados.</div>';
      return;
    }

    view.innerHTML = `
      <section class="lista-peliculas">
        ${upcoming.map((movie) => `
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
        `).join('')}
      </section>
    `;
  } catch (error) {
    view.innerHTML = `<div class="aviso">${escaparHTML(error.message)}</div>`;
  }
});
