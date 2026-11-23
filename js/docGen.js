/* docGen.js — Genera la Cuenta de Cobro en formato RTF (abre directamente en
   Microsoft Word, sin necesidad de ninguna librería externa ni conexión a
   internet). Replica el formato de la plantilla de referencia del usuario. */

const DocGen = (() => {

  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  function _fechaLarga(fechaISO) {
    const d = new Date(fechaISO + 'T00:00:00');
    return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
  }

  function _rtfEscape(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/\\/g, '\\\\')
      .replace(/{/g, '\\{')
      .replace(/}/g, '\\}')
      .split('').map(ch => {
        const code = ch.codePointAt(0);
        if (code > 127) {
          return `\\u${code}?`;
        }
        return ch;
      }).join('');
  }

  // Construye una fila de tabla RTF de 4 columnas.
  function _row(cellsText, boldFlags, widths) {
    let out = `\\trowd\\trgaph80\\trleft-80`;
    let x = 0;
    widths.forEach(w => { x += w; out += `\\cellx${x}`; });
    cellsText.forEach((text, i) => {
      out += '\\pard\\intbl';
      out += i === 0 || i === 1 ? '\\ql' : '\\qr';
      if (boldFlags[i]) out += '\\b';
      out += ' ' + _rtfEscape(text);
      if (boldFlags[i]) out += '\\b0';
      out += '\\cell';
    });
    out += '\\row\n';
    return out;
  }

  function generarCuentaDeCobroRtf(record, company, settings) {
    const fechaLarga = _fechaLarga(record.fecha);
    const ciudad = settings.ciudad || '';
    const total = record.items.reduce((s, it) => s + (Number(it.costoTotal) || 0), 0);

    const widths = [1300, 5600, 1600, 1760]; // ancho acumulado por columna (twips aprox)

    let tabla = '';
    tabla += _row(['CANTIDAD', 'DESCRIPCIÓN', 'VALOR UNITARIO', 'VALOR TOTAL'], [true, true, true, true], widths);
    record.items.forEach(it => {
      tabla += _row(
        [String(it.cantidad), it.producto, NumToWords.formatoMoneda(it.costoUnitario), NumToWords.formatoMoneda(it.costoTotal)],
        [false, false, false, false],
        widths
      );
    });
    tabla += _row(['', '', 'TOTAL A PAGAR', NumToWords.formatoMoneda(total)], [false, false, true, true], widths);

    const valorLetras = NumToWords.valorEnLetras(total);

    const rtf = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang3082
{\\fonttbl{\\f0\\fswiss\\fcharset0 Calibri;}}
\\viewkind4\\uc1\\pard\\sa200\\sl276\\slmult1\\f0\\fs22
\\qr ${_rtfEscape(ciudad)}${ciudad ? ', ' : ''}${_rtfEscape(fechaLarga)}\\par
\\pard\\qc\\b\\fs28 CUENTA DE COBRO\\b0\\fs22\\par
\\par
\\pard\\ql\\b ${_rtfEscape('LA COMPAÑIA:')}\\b0\\par
\\b ${_rtfEscape((company && company.nombre) || '')}\\b0\\par
NIT ${_rtfEscape((company && company.nit) || '')}\\par
\\par
\\b DEBE A:\\b0  ${_rtfEscape(settings.debeA || '')}\\par
\\b C.C.\\b0  ${_rtfEscape(settings.debeACc || '')}\\par
\\par
\\b CONCEPTO:\\b0  ${_rtfEscape('Suministro de los siguientes artículos:')}\\par
\\par
\\trowd\\trgaph80\\trleft-80\\cellx${widths[0]}\\cellx${widths[0]+widths[1]}\\cellx${widths[0]+widths[1]+widths[2]}\\cellx${widths[0]+widths[1]+widths[2]+widths[3]}
${tabla}
\\pard\\par
\\b VALOR EN LETRAS:\\b0  ${_rtfEscape(valorLetras)}\\par
\\par
\\par
______________________________________\\par
\\b ${_rtfEscape((settings.debeA || '').toUpperCase())}\\b0\\par
C.C. ${_rtfEscape(settings.debeACc || '')}\\par
Cel. ${_rtfEscape(settings.debeATel || '')}\\par
${_rtfEscape('Dirección:')} ${_rtfEscape(settings.debeADireccion || '')}\\par
}`;

    return rtf;
  }

  function descargarCuentaDeCobro(record, company, settings) {
    const rtf = generarCuentaDeCobroRtf(record, company, settings);
    const blob = new Blob([rtf], { type: 'application/rtf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${record.id}.rtf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  return { generarCuentaDeCobroRtf, descargarCuentaDeCobro };
})();
