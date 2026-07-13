document.addEventListener('DOMContentLoaded', async () => {
  pintarNavegacionInferior('cartelera');
  const view = document.getElementById('vistaAsientos');
  const draft = cargarReserva();
  const query = obtenerParametros();
  const movieId = query.get('movie') || draft?.movieId;
  const showId = query.get('show') || draft?.showId;

  if (!movieId || !showId) {
    view.innerHTML = '<div class="aviso">No hay una función seleccionada. Vuelve a la cartelera y elige una película.</div>';
    return;
  }

  try {
    const seating = await obtenerApi(`/api/asientos/${encodeURIComponent(showId)}`);
    const volverAPelicula = document.getElementById('volverAPelicula');
    if (volverAPelicula) volverAPelicula.href = `/pelicula.html?id=${encodeURIComponent(movieId)}`;

    const seatRows = seating.seatRows;
    const seatCols = seating.seatCols;
    const occupied = new Set(seating.showtime.occupiedSeats || []);
    const selected = new Set(draft?.seats || draft?.asientos || []);
    const price = Number(seating.showtime.price || 0);

    const asientoTotal = () => selected.size * price;

    const updateSummary = () => {
      document.getElementById('textoAsientos').textContent = selected.size ? [...selected].join(', ') : 'Ninguno';
      document.getElementById('textoTotal').textContent = dinero(asientoTotal());
      document.getElementById('botonContinuar').disabled = selected.size === 0;
    };

    const renderGrid = () => {
      const grid = document.getElementById('mapaAsientos');
      const labels = document.getElementById('columnasAsientos');

      labels.innerHTML = seatCols.map((col) => `<div class="columna-asiento">${col}</div>`).join('');
      grid.innerHTML = seatRows.flatMap((row) => seatCols.map((col) => {
        const asiento = `${row}${col}`;
        const classes = ['asiento'];
        let disabled = '';

        if (occupied.has(asiento)) {
          classes.push('ocupado');
          disabled = 'disabled';
        } else if (selected.has(asiento)) {
          classes.push('seleccionado');
        }

        return `<button type="button" class="${classes.join(' ')}" data-asiento="${asiento}" ${disabled}>${asiento}</button>`;
      })).join('');

      grid.querySelectorAll('[data-asiento]').forEach((button) => {
        button.addEventListener('click', () => {
          const asiento = button.dataset.asiento;
          if (occupied.has(asiento)) return;

          if (selected.has(asiento)) {
            selected.delete(asiento);
          } else {
            selected.add(asiento);
          }

          guardarReserva({
            ...draft,
            movieId,
            showId,
            seats: [...selected],
            price,
            total: asientoTotal(),
          });

          renderGrid();
          updateSummary();
        });
      });
    };

    view.innerHTML = `
      <section class="tarjeta">
        <div class="detalle-pelicula__cabecera detalle-pelicula__cabecera--asientos">
          <div class="afiche afiche--pequeno">
            <img src="${seating.movie.poster}" alt="${escaparHTML(seating.movie.title)}">
          </div>
          <div class="detalle-pelicula__texto">
            <div class="etiqueta">${escaparHTML(seating.movie.genre)}</div>
            <h1>${escaparHTML(seating.movie.title)}</h1>
            <div class="detalle-pelicula__datos">
              <span class="dato">${escaparHTML(seating.showtime.time)}</span>
              <span class="dato">${escaparHTML(seating.showtime.format)}</span>
              <span class="dato">${escaparHTML(seating.showtime.room)}</span>
            </div>
          </div>
        </div>

        <div class="pantalla">PANTALLA</div>

        <div class="sala">
          <div class="columnas-asientos" id="columnasAsientos"></div>
          <div class="mapa-asientos" id="mapaAsientos" aria-label="Plano de asientos"></div>

          <div class="leyenda">
            <div class="leyenda__opcion"><span class="leyenda__color"></span>Libre</div>
            <div class="leyenda__opcion"><span class="leyenda__color seleccionado"></span>Seleccionado</div>
            <div class="leyenda__opcion"><span class="leyenda__color ocupado"></span>Ocupado</div>
          </div>
        </div>
      </section>

      <section class="tarjeta resumen">
        <div class="resumen__bloque">
          <div class="resumen__fila">
            <div>
              <strong>Asientos</strong>
              <small>Selecciona uno o varios</small>
            </div>
          </div>
          <div id="textoAsientos" class="resumen__texto">Ninguno</div>
        </div>

        <div class="resumen__bloque">
          <div class="resumen__fila"><strong>Total a pagar</strong></div>
          <div id="textoTotal" class="resumen__total">${dinero(0)}</div>
        </div>

        <div class="acciones">
          <a class="boton boton--simple" href="/pelicula.html?id=${encodeURIComponent(movieId)}">Volver</a>
          <button id="botonContinuar" class="boton boton--principal" type="button" disabled>Continuar</button>
        </div>
      </section>
    `;

    document.getElementById('botonContinuar').addEventListener('click', () => {
      const currentDraft = cargarReserva() || {};
      guardarReserva({
        ...currentDraft,
        movieId,
        showId,
        seats: [...selected],
        total: asientoTotal(),
      });
      window.location.href = '/compra.html';
    });

    renderGrid();
    updateSummary();
  } catch (error) {
    view.innerHTML = `<div class="aviso">${escaparHTML(error.message)}</div>`;
  }
});
