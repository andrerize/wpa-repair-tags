/* WPA Repair Tags: print-ready PDFs made on the device.
   iPhone/iPad can't print from home-screen apps or in-app browsers, so the app draws the
   tag (or the customer's stub) itself and hands the PDF to the share sheet, which has Print.
   Sizes match the paper tag: 3.5 x 7.75 in on a letter page. */
(function () {
  'use strict';
  var ORANGE = '#F68B3F', INK = '#1a242a', LABEL = '#2b3338', LINE = '#4c5459', PEN = '#1d3f8f';
  var SCALE = 4;              // canvas pixels per CSS px (384 dpi)
  var logoPromise = null;
  // This script sits next to the logo in assets/, so resolve the logo from the script's own address.
  var BASE = (document.currentScript && document.currentScript.src) || location.href;

  function loadLogo() {
    if (!logoPromise) {
      logoPromise = new Promise(function (resolve, reject) {
        var img = new Image();
        img.onload = function () { resolve(img); };
        img.onerror = function () { logoPromise = null; reject(new Error('Logo did not load.')); };
        img.src = new URL('wpa-logo-yellow.png', BASE).href;
      });
    }
    return logoPromise;
  }

  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var list = ['700 48px Oswald', '600 15px Oswald', '500 30px "IBM Plex Mono"', '600 12px "Open Sans"', '700 12px "Open Sans"'];
    return Promise.all(list.map(function (f) { return document.fonts.load(f).catch(function () {}); }));
  }

  var FAM = { oswald: 'Oswald, "Arial Narrow", Arial, sans-serif', sans: '"Open Sans", Arial, sans-serif', mono: '"IBM Plex Mono", "Courier New", monospace' };

  function setFont(ctx, o) {
    ctx.font = (o.weight || 400) + ' ' + o.size + 'px ' + FAM[o.family || 'sans'];
    if ('letterSpacing' in ctx) ctx.letterSpacing = (o.ls || 0) + 'px';
  }
  function fit(ctx, s, max) {
    s = String(s || '');
    if (!max || ctx.measureText(s).width <= max) return s;
    while (s.length && ctx.measureText(s + '…').width > max) s = s.slice(0, -1);
    return s + '…';
  }
  // Draw one line of text the way CSS places it inside a line box.
  function txt(ctx, s, o) {
    setFont(ctx, o);
    ctx.fillStyle = o.color || INK;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = 'alphabetic';
    var m = ctx.measureText('Hg');
    var asc = m.fontBoundingBoxAscent || o.size * 0.8, desc = m.fontBoundingBoxDescent || o.size * 0.2;
    var base = o.top + (o.lh - (asc + desc)) / 2 + asc;
    ctx.fillText(fit(ctx, o.upper ? String(s).toUpperCase() : s, o.max), o.x, base);
  }
  function wrap(ctx, s, o, maxW) {
    setFont(ctx, o);
    var out = [];
    String(s || '').split(/\r?\n/).forEach(function (para) {
      var words = para.split(/\s+/), line = '';
      if (!para.trim()) { out.push(''); return; }
      words.forEach(function (w) {
        var test = line ? line + ' ' + w : w;
        if (ctx.measureText(test).width <= maxW || !line) line = test;
        else { out.push(line); line = w; }
      });
      out.push(line);
    });
    return out;
  }
  function rect(ctx, x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }
  function roundRect(ctx, x, y, w, h, r, color) {
    ctx.fillStyle = color; ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); ctx.fill();
  }
  function tagShape(ctx, w, h) {
    ctx.beginPath();
    ctx.moveTo(42, 0); ctx.lineTo(w - 42, 0); ctx.lineTo(w, 42); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.lineTo(0, 42);
    ctx.closePath(); ctx.fillStyle = ORANGE; ctx.fill();
  }
  function grommet(ctx, cx, cy) {
    ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2); ctx.fillStyle = '#7d5a20'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.fillStyle = '#b88a3e'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 6.5, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = '#6b4d1c'; ctx.stroke();
  }
  function plate(ctx, logo, x, y, logoH, padX, padY, r) {
    var lw = logoH * logo.naturalWidth / logo.naturalHeight;
    roundRect(ctx, x, y, lw + padX * 2, logoH + padY * 2, r, INK);
    ctx.drawImage(logo, x + padX, y + padY, lw, logoH);
    return lw + padX * 2;
  }
  function scissors(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 24, s / 24);
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(6, 6, 3, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(6, 18, 3, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(20, 4); ctx.lineTo(8.12, 15.88); ctx.moveTo(14.47, 14.48); ctx.lineTo(20, 20); ctx.moveTo(8.12, 8.12); ctx.lineTo(12, 12); ctx.stroke();
    ctx.restore();
  }
  function newCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.round(w * SCALE); c.height = Math.round(h * SCALE);
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.scale(SCALE, SCALE);
    return { c: c, ctx: ctx };
  }

  var LBL = { size: 12, weight: 600, family: 'sans', color: LABEL, ls: 0.3, upper: true };
  function label(ctx, s, x, top, max) { txt(ctx, s, Object.assign({}, LBL, { x: x, top: top, lh: 14, max: max })); }
  function val(ctx, s, x, top, max, size) { txt(ctx, s, { size: size || 15, weight: 600, family: 'sans', color: PEN, x: x, top: top, lh: 18, max: max }); }

  /* The shop tag with its stub: 336 x 744 CSS px = 3.5 x 7.75 in. */
  function drawTag(t, logo) {
    var W = 336, H = 744, k = newCanvas(W, H), ctx = k.ctx;
    tagShape(ctx, W, H);
    grommet(ctx, 168, 31);
    plate(ctx, logo, 18, 54, 36, 10, 6, 4);
    txt(ctx, 'REPAIR', { x: 18, top: 112, lh: 44, size: 48, weight: 700, family: 'oswald', ls: 0.5 });
    txt(ctx, 'TAG', { x: 18, top: 156, lh: 44, size: 48, weight: 700, family: 'oswald', ls: 0.5 });
    txt(ctx, t.n, { x: 318, top: 166, lh: 34, size: 30, weight: 500, family: 'mono', align: 'right', ls: 1 });

    var px = 12, pw = 312, half = px + pw * 0.52, y0 = 210;
    rect(ctx, px, y0, pw, 330, '#ffffff');
    function hline(y, h) { rect(ctx, px, y, pw, h || 1.5, LINE); }
    // Row 1: Phone | Date Received
    rect(ctx, half - 1.5, y0, 1.5, 38, LINE); hline(y0 + 36.5);
    label(ctx, 'Phone', px + 7, y0 + 2); val(ctx, t.phone, px + 7, y0 + 16, half - px - 16);
    label(ctx, 'Date Received', half + 7, y0 + 2); val(ctx, t.dr, half + 7, y0 + 16, px + pw - half - 14);
    // Row 2: Customer's Name
    var y = y0 + 38; hline(y + 36.5);
    label(ctx, "Customer's Name", px + 7, y + 2); val(ctx, t.name, px + 7, y + 16, pw - 14);
    // Row 3: Address
    y += 38; hline(y + 36.5);
    label(ctx, 'Address', px + 7, y + 2); val(ctx, t.addr1, px + 7, y + 16, pw - 14);
    // Row 4: address line 2 | Date Promised
    y += 38; rect(ctx, half - 1.5, y, 1.5, 38, LINE);
    val(ctx, t.addr2, px + 7, y + 16, half - px - 16, 13);
    label(ctx, 'Date Promised', half + 7, y + 2); val(ctx, t.dp, half + 7, y + 16, px + pw - half - 14);
    // Heavy rule
    y += 38; rect(ctx, px, y, pw, 5, INK);
    // Work to be done: label line + 4 ruled lines
    y += 5; label(ctx, 'Work to Be Done', px + 7, y + 9); rect(ctx, px, y + 26, pw, 1, LINE);
    y += 27;
    var wl = wrap(ctx, t.work, { size: 15, weight: 600, family: 'sans' }, pw - 14);
    for (var i = 0; i < 4; i++) {
      rect(ctx, px, y + i * 27 + 26, pw, 1, LINE);
      if (wl[i]) txt(ctx, (i === 3 && wl.length > 4) ? wl[i] + ' …' : wl[i], { x: px + 7, top: y + i * 27, lh: 27, size: 15, weight: 600, family: 'sans', color: PEN, max: pw - 14 });
    }
    // Email
    y += 108; hline(y);
    label(ctx, 'Email', px + 7, y + 2); val(ctx, t.email, px + 7, y + 16, pw - 14);

    // Tear line
    scissors(ctx, 8, 552, 14);
    ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(28, 559); ctx.lineTo(328, 559); ctx.stroke(); ctx.restore();

    // Customer stub
    plate(ctx, logo, 12, 574, 20, 7, 4, 3);
    txt(ctx, 'CUSTOMER STUB', { x: 324, top: 579, lh: 18, size: 15, weight: 600, family: 'oswald', align: 'right', ls: 1.5 });
    var sh = 12 + 312 * 0.58;
    rect(ctx, 12, 609, 312, 40, '#ffffff'); rect(ctx, sh - 1.5, 609, 1.5, 40, LINE);
    label(ctx, 'Name', 19, 612); val(ctx, t.name, 19, 626, sh - 28);
    label(ctx, 'Date Received', sh + 7, 612); val(ctx, t.dr, sh + 7, 626, 324 - sh - 14);
    txt(ctx, 'Present this stub to', { x: 12, top: 677, lh: 16, size: 12, weight: 600, family: 'sans' });
    txt(ctx, 'pick up your gear.', { x: 12, top: 693, lh: 16, size: 12, weight: 600, family: 'sans' });
    txt(ctx, 'REPAIR TAG NO.', { x: 324, top: 657, lh: 18, size: 12, weight: 600, family: 'oswald', align: 'right', ls: 1 });
    txt(ctx, t.n, { x: 324, top: 675, lh: 34, size: 32, weight: 500, family: 'mono', align: 'right', ls: 1 });
    txt(ctx, '323 285-6000', { x: 12, top: 716, lh: 16, size: 12, weight: 700, family: 'sans' });
    txt(ctx, 'worldproaudio.com', { x: 324, top: 716, lh: 16, size: 12, weight: 700, family: 'sans', align: 'right' });
    return { canvas: k.c, w: W, h: H };
  }

  /* The customer's claim stub card: 4 in wide, height fits the work list. */
  function drawStub(d, logo) {
    var W = 384, pad = 16, inner = W - pad * 2;
    var probe = newCanvas(1, 1).ctx;
    var work = d.w ? wrap(probe, d.w, { size: 17, weight: 600, family: 'sans' }, inner - 20) : [];
    var note = wrap(probe, 'Show this stub, on your phone or printed, when you pick up your gear.', { size: 15, weight: 700, family: 'sans' }, inner);
    var rowA = 54, rowB = 54, rowC = work.length ? 30 + work.length * 24 : 0;
    var H = 194 + rowA + rowB + rowC + 12 + note.length * 20 + 12 + 20 + pad;
    var k = newCanvas(W, H), ctx = k.ctx;
    tagShape(ctx, W, H);
    grommet(ctx, 192, 29);
    plate(ctx, logo, pad, 56, 26, 9, 6, 4);
    txt(ctx, 'CUSTOMER', { x: W - pad, top: 56.3, lh: 18.7, size: 17, weight: 600, family: 'oswald', align: 'right', ls: 1.5 });
    txt(ctx, 'CLAIM STUB', { x: W - pad, top: 75, lh: 18.7, size: 17, weight: 600, family: 'oswald', align: 'right', ls: 1.5 });
    txt(ctx, 'REPAIR', { x: pad, top: 106, lh: 38, size: 40, weight: 700, family: 'oswald', ls: 0.5 });
    txt(ctx, 'TAG', { x: pad, top: 144, lh: 38, size: 40, weight: 700, family: 'oswald', ls: 0.5 });
    txt(ctx, 'TAG NO.', { x: W - pad, top: 123, lh: 19, size: 13, weight: 600, family: 'oswald', align: 'right', ls: 1 });
    txt(ctx, d.n, { x: W - pad, top: 142, lh: 40, size: 38, weight: 500, family: 'mono', align: 'right', ls: 1 });

    var y = 194, half = pad + inner / 2;
    rect(ctx, pad, y, inner, rowA + rowB + rowC, '#ffffff');
    function lbl(s, x, top) { txt(ctx, s, Object.assign({}, LBL, { x: x, top: top, lh: 16 })); }
    function v(s, x, top, max) { txt(ctx, s, { x: x, top: top, lh: 24, size: 17, weight: 600, family: 'sans', color: PEN, max: max }); }
    lbl('Name', pad + 10, y + 6); v(d.nm, pad + 10, y + 22, inner - 20);
    y += rowA; rect(ctx, pad, y - 1.5, inner, 1.5, LINE);
    rect(ctx, half - 1.5, y, 1.5, rowB, LINE);
    lbl('Date Received', pad + 10, y + 6); v(d.dr, pad + 10, y + 22, inner / 2 - 20);
    lbl('Date Promised', half + 10, y + 6); v(d.dp, half + 10, y + 22, inner / 2 - 20);
    y += rowB;
    if (rowC) {
      rect(ctx, pad, y - 1.5, inner, 1.5, LINE);
      lbl('Work to Be Done', pad + 10, y + 6);
      work.forEach(function (ln, i) { v(ln, pad + 10, y + 22 + i * 24, inner - 20); });
      y += rowC;
    }
    y += 12;
    note.forEach(function (ln, i) { txt(ctx, ln, { x: pad, top: y + i * 20, lh: 20, size: 15, weight: 700, family: 'sans' }); });
    y += note.length * 20 + 12;
    txt(ctx, '323 285-6000', { x: pad, top: y, lh: 20, size: 14, weight: 700, family: 'sans' });
    txt(ctx, 'worldproaudio.com', { x: W - pad, top: y, lh: 20, size: 14, weight: 700, family: 'sans', align: 'right' });
    return { canvas: k.c, w: W, h: H };
  }

  /* A one-page letter PDF with the drawing placed at true size, 0.5 in from the top, centered. */
  function toPdf(art) {
    return new Promise(function (resolve, reject) {
      art.canvas.toBlob(function (jpg) {
        if (!jpg) return reject(new Error('Could not draw the page.'));
        jpg.arrayBuffer().then(function (buf) {
          var img = new Uint8Array(buf);
          var pw = 612, ph = 792;
          var dw = art.w * 0.75, dh = art.h * 0.75;       // CSS px -> PDF points (96 -> 72 per inch)
          var x = (pw - dw) / 2, y = ph - 36 - dh;
          var enc = new TextEncoder(), parts = [], offsets = [], len = 0;
          function add(p) { var b = typeof p === 'string' ? enc.encode(p) : p; parts.push(b); len += b.length; }
          function obj(n, body) { offsets[n] = len; add(n + ' 0 obj\n' + body + '\nendobj\n'); }
          add('%PDF-1.4\n%âãÏÓ\n');
          obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
          obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
          obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pw + ' ' + ph + '] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
          offsets[4] = len;
          add('4 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + art.canvas.width + ' /Height ' + art.canvas.height +
            ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + img.length + ' >>\nstream\n');
          add(img); add('\nendstream\nendobj\n');
          var cs = 'q ' + dw.toFixed(2) + ' 0 0 ' + dh.toFixed(2) + ' ' + x.toFixed(2) + ' ' + y.toFixed(2) + ' cm /Im0 Do Q';
          obj(5, '<< /Length ' + cs.length + ' >>\nstream\n' + cs + '\nendstream');
          var xref = len, pad10 = function (n) { return ('0000000000' + n).slice(-10); };
          var xr = 'xref\n0 6\n0000000000 65535 f \n';
          for (var i = 1; i <= 5; i++) xr += pad10(offsets[i]) + ' 00000 n \n';
          add(xr + 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
          resolve(new Blob(parts, { type: 'application/pdf' }));
        }, reject);
      }, 'image/jpeg', 0.92);
    });
  }

  function build(drawFn, data) {
    return Promise.all([fontsReady(), loadLogo()]).then(function (r) { return toPdf(drawFn(data, r[1])); });
  }

  function download(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }

  /* Hand the PDF to the share sheet (has Print and Save to Files); fall back to a download. */
  function share(blob, filename, title) {
    var file = null;
    try { file = new File([blob], filename, { type: 'application/pdf' }); } catch (e) { file = null; }
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      return navigator.share({ files: [file], title: title }).then(function () { return 'shared'; }, function (e) {
        if (e && e.name === 'AbortError') return 'cancelled';
        download(blob, filename); return 'downloaded';
      });
    }
    download(blob, filename);
    return Promise.resolve('downloaded');
  }

  window.WPAPrint = {
    tagPdf: function (t) { return build(drawTag, t); },
    stubPdf: function (d) { return build(drawStub, d); },
    share: share,
    download: download
  };
})();
