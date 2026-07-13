document.addEventListener('DOMContentLoaded', () => {
  pintarNavegacionInferior('cartelera');
  const view = document.getElementById('vistaEntrada');
  const entrada = cargarEntradaActual();
  const draft = cargarReserva();

  if (!entrada && !draft) {
    view.innerHTML = '<div class="aviso">No hay una compra registrada todavía. Finaliza una reserva para ver tu entrada.</div>';
    return;
  }

  const source = entrada || draft;
  const asientos = Array.isArray(source.seats) ? source.seats : (source.asientos || []);
  const total = Number(source.total || 0);
  const customerName = source.customer?.name || 'Usuario 1';

  view.innerHTML = `
    <section class="tarjeta entrada">
      <div class="entrada__cabecera">
        <div class="entrada__codigo">${escaparHTML(source.ticketCode || 'ENTRADA-CP')}</div>
        <h1>¡Gracias por tu compra, ${escaparHTML(customerName)}!</h1>
        <p class="texto-apoyo">Tu entrada ya está lista. Guarda esta entrada virtual para revisar tu reserva.</p>
      </div>

      <div class="entrada__datos">
        <div class="entrada__dato">
          <div class="etiqueta">Película</div>
          <h2>${escaparHTML(source.movieTitle || source.movieId || '')}</h2>
          <p class="texto-apoyo">${escaparHTML(source.showtime?.date ? `${source.showtime.date} · ${source.showtime.time || ''}` : `${source.showTime || ''}`)}</p>
        </div>

        <div class="entrada__dato">
          <div class="etiqueta">Función</div>
          <h2>${escaparHTML(source.showtime?.room || source.showRoom || '')}</h2>
          <p class="texto-apoyo">${escaparHTML(source.showtime?.format || source.showFormat || '')}</p>
        </div>

        <div class="entrada__dato">
          <div class="etiqueta">Asientos</div>
          <h2>${escaparHTML(asientos.join(', ') || 'Ninguno')}</h2>
          <p class="texto-apoyo">Cantidad: ${asientos.length}</p>
        </div>

        <div class="entrada__dato">
          <div class="etiqueta">Total</div>
          <h2>${dinero(total)}</h2>
          <p class="texto-apoyo">Listo para tu visita al cine.</p>
        </div>
      </div>

      <div class="acciones">
        <a class="boton boton--principal boton--bloque" href="/index.html">Volver a cartelera</a>
        <a class="boton boton--simple boton--bloque" href="/perfil.html">Ir a perfil</a>
      </div>
    </section>
  `;
});
