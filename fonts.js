// fonts.js - Parseador de formato de texto dinámico y utilidades numéricas/fechas para Stevscon

function formatearTexto(texto) {
    if (!texto) return '';

    let html = texto;

    // 1. Código inline: `texto`
    html = html.replace(/`([^`]+)`/g, '<code class="md-code">$1</code>');

    // 2. Negrita: **texto**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // 3. Subrayado: __texto__
    html = html.replace(/__([^_]+)__/g, '<u>$1</u>');

    // 4. Cursiva: *texto*
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // 5. Cita / Blockquote: > texto
    html = html.replace(/^>\s*(.*)$/gm, '<blockquote class="md-quote">$1</blockquote>');

    // 6. Viñeta / Lista: - texto
    html = html.replace(/^-\s*(.*)$/gm, '<div class="md-bullet"><span class="bullet-dot">•</span> $1</div>');

    // 7. Título / Header grande: # texto
    html = html.replace(/^#\s*(.*)$/gm, '<h1 class="md-h1">$1</h1>');

    return html;
}

// Sistema numérico de contador (K, M, B, T)
function formatearContador(num) {
    const n = Number(num);
    if (isNaN(n) || n === 0) return '0';

    const abs = Math.abs(n);
    const signo = n < 0 ? '-' : '';

    if (abs >= 1e12) {
        return signo + (abs / 1e12).toFixed(1).replace(/\.0$/, '') + 'T';
    }
    if (abs >= 1e9) {
        return signo + (abs / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    }
    if (abs >= 1e6) {
        return signo + (abs / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (abs >= 1e3) {
        return signo + (abs / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return signo + abs.toString();
}

// Sistema de formato de fecha estilo Discord
function formatearFechaPublicacion(fechaInput) {
    if (!fechaInput) return 'Publicado apenas';

    let dateObj;
    if (typeof fechaInput === 'number') {
        dateObj = new Date(fechaInput);
    } else if (typeof fechaInput === 'string' && !isNaN(Number(fechaInput))) {
        dateObj = new Date(Number(fechaInput));
    } else if (fechaInput instanceof Date) {
        dateObj = fechaInput;
    } else {
        return fechaInput;
    }

    if (isNaN(dateObj.getTime())) return String(fechaInput);

    const ahora = new Date();
    const diffMs = ahora.getTime() - dateObj.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffAnos = Math.floor(diffDias / 365);

    const pad = (n) => String(n).padStart(2, '0');
    const horas = pad(dateObj.getHours());
    const minutos = pad(dateObj.getMinutes());
    const horaTexto = `${horas}:${minutos}`;

    const dia = pad(dateObj.getDate());
    const mes = pad(dateObj.getMonth() + 1);
    const ano = String(dateObj.getFullYear()).slice(-2);
    const fechaTexto = `${dia}-${mes}-${ano}`;

    if (diffAnos >= 1) {
        return `Hace ${diffAnos} ${diffAnos === 1 ? 'año' : 'años'}`;
    }

    if (diffMin < 2) {
        return `${horaTexto} | Publicado apenas`;
    }

    return `${horaTexto} | ${fechaTexto}`;
}