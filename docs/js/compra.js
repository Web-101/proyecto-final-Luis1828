document.addEventListener('DOMContentLoaded', async () => {
  pintarNavegacionInferior('cartelera');
  const view = document.getElementById('vistaCompra');
  const draft = cargarReserva();

  const asientosReserva = Array.isArray(draft?.seats) ? draft.seats : (draft?.asientos || []);

  if (!draft || !draft.movieId || !draft.showId || asientosReserva.length === 0) {
    view.innerHTML = '<div class="aviso">No hay una reserva en progreso. Primero selecciona película, función y asientos.</div>';
    return;
  }

  const volverAAsientos = document.getElementById('volverAAsientos');
  if (volverAAsientos) {
    volverAAsientos.href = `asientos.html?movie=${encodeURIComponent(draft.movieId)}&show=${encodeURIComponent(draft.showId)}`;
  }

  const total = Number(draft.total || (asientosReserva.length * (draft.price || 0)));

  view.innerHTML = `
    <section class="tarjeta resumen resumen--compra">
      <div class="resumen__bloque">
        <div class="resumen__fila">
          <div>
            <strong>Resumen del pedido</strong>
            <small>Completa tus datos para finalizar</small>
          </div>
          <span class="dato">${dinero(draft.price || 0)} c/u</span>
        </div>

        <div class="resumen__fila"><span>Película</span><strong id="tituloPelicula"></strong></div>
        <div class="resumen__fila"><span>Función</span><strong id="datosFuncion"></strong></div>
        <div class="resumen__fila"><span>Asientos</span><strong id="datosAsientos"></strong></div>
        <div class="resumen__fila"><span>Total</span><strong id="datosTotal"></strong></div>
      </div>

      <form class="formulario" id="formularioCompra">
        <div class="campo">
          <label for="nombre">Nombre completo</label>
          <input id="nombre" name="nombre" type="text" required placeholder="Ingresa tu nombre">
        </div>
        <div class="campo">
          <label for="correo">Correo electrónico</label>
          <input id="correo" name="correo" type="email" required placeholder="correo@ejemplo.com">
        </div>
        <div class="campo">
          <label for="telefono">Teléfono (opcional)</label>
          <input id="telefono" name="telefono" type="tel" placeholder="70000000">
        </div>

        <div id="cajaError" class="aviso" style="display:none"></div>

        <div class="acciones">
          <a class="boton boton--simple" href="asientos.html?movie=${encodeURIComponent(draft.movieId)}&show=${encodeURIComponent(draft.showId)}">Volver</a>
          <button class="boton boton--principal" type="submit">Comprar</button>
        </div>
      </form>
    </section>
  `;

  document.getElementById('tituloPelicula').textContent = draft.movieTitle || draft.tituloPelicula || '';
  document.getElementById('datosFuncion').textContent = `${draft.showTime || ''} · ${draft.showFormat || ''} · ${draft.showRoom || ''}`;
  document.getElementById('datosAsientos').textContent = asientosReserva.join(', ');
  document.getElementById('datosTotal').textContent = dinero(total);

  const form = document.getElementById('formularioCompra');
  const cajaError = document.getElementById('cajaError');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    cajaError.style.display = 'none';
    cajaError.textContent = '';

    const formData = new FormData(form);
    const payload = {
      movieId: draft.movieId,
      showId: draft.showId,
      seats: asientosReserva,
      total,
      name: String(formData.get('nombre') || '').trim(),
      email: String(formData.get('correo') || '').trim(),
      phone: String(formData.get('telefono') || '').trim(),
    };

    try {
      const result = await enviarApi('/api/checkout', payload);

      const entrada = {
        ...result.purchase,
        ticketCode: result.ticketCode,
      };

      guardarEntradaActual(entrada);
      guardarHistorialEntrada(entrada);
      guardarReserva({
        ...draft,
        customer: { name: payload.name, email: payload.email, phone: payload.phone },
        ticketCode: result.ticketCode,
      });

      window.location.href = 'confirmacion.html';
    } catch (error) {
      cajaError.style.display = 'block';
      cajaError.innerHTML = error.details?.length
        ? `${escaparHTML(error.message)}<br>${error.details.map((item) => `• ${escaparHTML(item)}`).join('<br>')}`
        : escaparHTML(error.message);
    }
  });
});
