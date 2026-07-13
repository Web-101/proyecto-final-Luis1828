document.addEventListener('DOMContentLoaded', () => {
  pintarNavegacionInferior('perfil');

  const view = document.getElementById('vistaPerfil');
  const botonAvisos = document.getElementById('botonAvisos');
  const contadorAvisos = document.getElementById('contadorAvisos');
  const ventana = document.getElementById('ventanaEntradas');
  const listaEntradas = document.getElementById('listaEntradas');

  const obtenerEntradas = () => obtenerEntradasPerfil();

  const mostrarEntradas = () => {
    const entradas = obtenerEntradas();
    contadorAvisos.textContent = String(entradas.length);

    if (!entradas.length) {
      listaEntradas.innerHTML = '<div class="vacio">Aún no hay entradas registradas.</div>';
      return;
    }

    listaEntradas.innerHTML = entradas.map((entrada) => entradaPequena(entrada)).join('');
  };

  const openModal = () => {
    mostrarEntradas();
    ventana.classList.add('abierta');
    ventana.setAttribute('aria-hidden', 'false');
  };

  const closeModal = () => {
    ventana.classList.remove('abierta');
    ventana.setAttribute('aria-hidden', 'true');
  };

  botonAvisos.addEventListener('click', openModal);
  ventana.querySelectorAll('[data-cerrar-ventana]').forEach((element) => element.addEventListener('click', closeModal));
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });

  const entradas = obtenerEntradas();
  const ultimaEntrada = entradas[0] || null;
  const cantidadEntradas = entradas.length;
  const asientosCount = entradas.reduce((sum, entrada) => {
    const asientos = Array.isArray(entrada.seats) ? entrada.seats : (entrada.asientos || []);
    return sum + asientos.length;
  }, 0);

  view.innerHTML = `
    <section class="perfil">
      <div class="perfil__foto">
        <img src="assets/usuario.jpg" alt="Avatar de Usuario 1">
        <button class="boton-foto" type="button" aria-label="Editar perfil">✎</button>
      </div>
      <h1>Usuario 1</h1>
      <p class="texto-apoyo">usuario1@cinepalace.com</p>

      <div class="estadisticas">
        <div class="estadistica">
          <strong>${cantidadEntradas}</strong>
          <span>Entradas</span>
        </div>
        <div class="estadistica">
          <strong>${asientosCount}</strong>
          <span>Asientos</span>
        </div>
        <div class="estadistica">
          <strong>VIP</strong>
          <span>Nivel</span>
        </div>
      </div>

      <div class="acciones-perfil">
        <button class="boton boton--principal boton--bloque" type="button" id="botonAbrirEntradas">Mis reservas</button>
        <button class="boton boton--secundario boton--bloque" type="button">Configuración</button>
        <button class="boton boton--simple boton--bloque" type="button">Cerrar sesión</button>
      </div>
    </section>

    <section class="tarjeta entrada entrada--perfil">
      <div class="entrada__cabecera">
        <div class="etiqueta">Última compra</div>
        <h2>${escaparHTML((ultimaEntrada && (ultimaEntrada.movieTitle || ultimaEntrada.movieId)) || 'Ninguna todavía')}</h2>
        <p class="texto-apoyo">${escaparHTML((ultimaEntrada && (ultimaEntrada.ticketCode || ultimaEntrada.id)) || 'Tus entradas aparecerán aquí.')}</p>
      </div>

      <div class="entrada__datos entrada__datos--perfil">
        <div class="entrada__dato">
          <div class="etiqueta">Función</div>
          <h2>${escaparHTML(ultimaEntrada?.showtime?.time || ultimaEntrada?.showTime || '—')}</h2>
          <p class="texto-apoyo">${escaparHTML(ultimaEntrada?.showtime?.room || ultimaEntrada?.showRoom || '—')}</p>
        </div>
        <div class="entrada__dato">
          <div class="etiqueta">Asientos</div>
          <h2>${escaparHTML(Array.isArray(ultimaEntrada?.seats) ? ultimaEntrada.seats.join(', ') : (ultimaEntrada?.asientos || []).join(', ') || '—')}</h2>
          <p class="texto-apoyo">${dinero(ultimaEntrada?.total || 0)}</p>
        </div>
      </div>
    </section>
  `;

  document.getElementById('botonAbrirEntradas').addEventListener('click', openModal);
  mostrarEntradas();
});
