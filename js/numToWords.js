/* numToWords.js — Convierte números enteros a letras en español (para "VALOR EN LETRAS") */

const NumToWords = (() => {
  const UNIDADES = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const DECENAS = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const DECENAS2 = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  function _tresDigitos(n) {
    n = Math.floor(n);
    if (n === 0) return '';
    if (n === 100) return 'CIEN';
    let out = '';
    const c = Math.floor(n / 100);
    const resto = n % 100;
    if (c > 0) out += CENTENAS[c] + ' ';
    if (resto > 0) {
      if (resto < 10) {
        out += UNIDADES[resto];
      } else if (resto < 20) {
        out += DECENAS[resto - 10];
      } else {
        const d = Math.floor(resto / 10);
        const u = resto % 10;
        out += DECENAS2[d];
        if (u > 0) out += ' Y ' + UNIDADES[u];
      }
    }
    return out.trim();
  }

  function _grupo(n, singular, plural) {
    if (n === 0) return '';
    if (n === 1) return singular;
    return _tresDigitos(n) + ' ' + plural;
  }

  function enteroALetras(numero) {
    numero = Math.round(Math.abs(numero));
    if (numero === 0) return 'CERO';

    const millones = Math.floor(numero / 1000000);
    const miles = Math.floor((numero % 1000000) / 1000);
    const cientos = numero % 1000;

    let partes = [];
    if (millones > 0) {
      partes.push(millones === 1 ? 'UN MILLÓN' : _tresDigitos(millones) + ' MILLONES');
    }
    if (miles > 0) {
      partes.push(miles === 1 ? 'MIL' : _tresDigitos(miles) + ' MIL');
    }
    if (cientos > 0) {
      partes.push(_tresDigitos(cientos));
    }
    return partes.join(' ').replace(/\s+/g, ' ').trim();
  }

  function valorEnLetras(numero) {
    const entero = Math.round(Math.abs(numero));
    const letras = enteroALetras(entero);
    return `${letras} PESOS M/CTE. (${formatoMoneda(entero)})`;
  }

  function formatoMoneda(numero) {
    const n = Math.round(Number(numero) || 0);
    return '$ ' + n.toLocaleString('es-CO');
  }

  return { enteroALetras, valorEnLetras, formatoMoneda };
})();
