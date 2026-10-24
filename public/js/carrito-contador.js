(function () {
    /* ---------- Contador del carrito ---------- */
    function actualizar() {
        var items = [];
        try { items = JSON.parse(localStorage.getItem('carrito') || '[]'); } catch (e) {}
        var n = items.reduce(function (s, p) { return s + (p.cantidad || 1); }, 0);
        document.querySelectorAll('.btn-carrito').forEach(function (btn) {
            var badge = btn.querySelector('.carrito-badge');
            if (n === 0) { if (badge) badge.remove(); return; }
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'carrito-badge';
                btn.appendChild(badge);
            }
            badge.textContent = n > 99 ? '99+' : n;
        });
    }
    document.addEventListener('DOMContentLoaded', actualizar);
    window.addEventListener('storage', actualizar);
    window.actualizarContadorCarrito = actualizar;

    /* ---------- Avisos con diseño (reemplazan a alert) ---------- */
    function aviso(mensaje) {
        var texto = String(mensaje);
        var esError = /error|no se pudo|insuficiente|debes|inválid|ya fue/i.test(texto);
        var esCarrito = /carrito/i.test(texto) && !esError;

        var caja = document.getElementById('avisos');
        if (!caja) {
            caja = document.createElement('div');
            caja.id = 'avisos';
            document.body.appendChild(caja);
        }
        var el = document.createElement('div');
        el.className = 'aviso ' + (esError ? 'aviso-error' : 'aviso-ok2');

        var icono = document.createElement('span');
        icono.className = 'aviso-icono';
        icono.textContent = esError ? '!' : '✔';

        var msg = document.createElement('span');
        msg.className = 'aviso-texto';
        msg.textContent = texto;

        el.appendChild(icono);
        el.appendChild(msg);

        if (esCarrito) {
            var ver = document.createElement('a');
            ver.href = '/carrito';
            ver.className = 'aviso-link';
            ver.textContent = 'VER CARRITO';
            el.appendChild(ver);
        }
        var cerrar = document.createElement('button');
        cerrar.className = 'aviso-cerrar';
        cerrar.textContent = '×';
        cerrar.onclick = function () { el.remove(); };
        el.appendChild(cerrar);

        caja.appendChild(el);
        setTimeout(function () { el.classList.add('aviso-sale'); setTimeout(function () { el.remove(); }, 300); }, 4000);
    }
    window.alert = aviso;
    window.mostrarAviso = aviso;
})();