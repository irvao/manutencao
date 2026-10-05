/* Formulário das lojas (index.html) */

$('#logo').outerHTML = LOGO_SVG;

const MAX_FOTOS = 6;
let itens = [];      // problemas na tela
let seq = 0;
let enviando = false;
let enviadosSessao = []; // problemas já gravados nesta rodada

/* ---------- loja e nome (lembrados no celular) ---------- */
const selLoja = $('#loja');
window.LOJAS.forEach(l => selLoja.append(el('option', { value: l.num, text: 'Loja ' + l.num + ' · ' + l.nome })));
selLoja.value = guarda.get('mnt_loja', '');
$('#nome').value = guarda.get('mnt_nome', '');
selLoja.addEventListener('change', () => { guarda.set('mnt_loja', selLoja.value); selLoja.classList.remove('erro-campo'); });
$('#nome').addEventListener('input', e => { guarda.set('mnt_nome', e.target.value); e.target.classList.remove('erro-campo'); });

/* ---------- tudo certo ---------- */
$('#tudoOk').addEventListener('change', e => {
  const on = e.target.checked;
  $('#tudoOkBox').classList.toggle('on', on);
  $('#blocoItens').hidden = on;
  $('#enviar').textContent = on ? 'Enviar: está tudo certo' : 'Enviar';
});

/* ---------- problemas ---------- */
function novoItem() {
  const it = { uid: ++seq, descricao: '', categoria: '', catManual: false, local: '', urgencia: '', fotos: [], enviadoId: null };
  itens.push(it);
  desenhaItens();
  return it;
}

function desenhaItens() {
  const box = $('#itens');
  box.innerHTML = '';
  itens.forEach((it, i) => box.append(cardItem(it, i)));
}

function cardItem(it, i) {
  const card = el('div', { class: 'card item', id: 'item' + it.uid });

  // cabeçalho
  card.append(el('div', { class: 'item-head' },
    el('h2', { text: 'Problema ' + (i + 1) }),
    itens.length > 1 ? el('button', { class: 'rem', type: 'button', text: 'Remover', onclick: () => {
      if ((it.descricao || it.fotos.length) && !confirm('Remover o problema ' + (i + 1) + '?')) return;
      itens = itens.filter(x => x !== it); desenhaItens();
    } }) : null
  ));

  // descrição
  const idDesc = 'd' + it.uid;
  const ta = el('textarea', { id: idDesc, maxlength: '4000',
    placeholder: 'Ex.: A torneira do banheiro está vazando desde segunda e molhando o chão.' });
  ta.value = it.descricao;
  card.append(
    el('label', { class: 'rot', for: idDesc }, 'O que está acontecendo? ', el('span', { class: 'req', text: '*' })),
    ta,
    el('p', { class: 'dica', text: '🎤 Prefere falar? Toque no microfone do teclado do celular e conte com suas palavras.' })
  );

  // categoria
  const sugTag = el('span', { class: 'sug', text: 'sugerida pelo texto', hidden: true });
  const cats = el('div', { class: 'cats', role: 'group', 'aria-label': 'Categoria' });
  const marcaCat = () => {
    $$('.cat', cats).forEach(b => b.setAttribute('aria-pressed', b.dataset.c === it.categoria ? 'true' : 'false'));
    sugTag.hidden = !(it.categoria && !it.catManual);
  };
  window.CATEGORIAS.forEach(c => cats.append(el('button', {
    type: 'button', class: 'cat', 'data-c': c.nome, title: c.exemplos,
    onclick: () => { it.categoria = c.nome; it.catManual = true; marcaCat(); cats.classList.remove('erro-campo'); }
  }, el('span', { class: 'ic', text: c.icone }), el('span', { text: c.nome }))));
  card.append(el('div', { class: 'rot' }, 'Tipo de problema ', el('span', { class: 'req', text: '*' }), sugTag), cats);

  ta.addEventListener('input', () => {
    it.descricao = ta.value;
    ta.classList.remove('erro-campo');
    if (!it.catManual) {
      const s = sugereCategoria(ta.value);
      it.categoria = s ? s.nome : '';
      marcaCat();
    }
  });
  marcaCat();

  // local
  const idLocal = 'l' + it.uid;
  const inLocal = el('input', { type: 'text', id: idLocal, maxlength: '120', placeholder: 'Ex.: banheiro, vitrine, sala de exame, fachada' });
  inLocal.value = it.local;
  inLocal.addEventListener('input', () => (it.local = inLocal.value));
  card.append(el('label', { class: 'rot', for: idLocal }, 'Onde fica na loja?'), inLocal);

  // urgência
  const urg = el('div', { class: 'urg', role: 'group', 'aria-label': 'Urgência' });
  window.URGENCIAS.forEach(u => urg.append(el('button', {
    type: 'button', 'data-u': u.nome, 'aria-pressed': it.urgencia === u.nome ? 'true' : 'false',
    onclick: () => {
      it.urgencia = u.nome; urg.classList.remove('erro-campo');
      $$('button', urg).forEach(b => b.setAttribute('aria-pressed', b.dataset.u === u.nome ? 'true' : 'false'));
    }
  }, u.nome, el('small', { text: u.dica }))));
  card.append(el('div', { class: 'rot' }, 'Urgência ', el('span', { class: 'req', text: '*' })), urg);

  // fotos
  const fotos = el('div', { class: 'fotos' });
  const desenhaFotos = () => {
    fotos.innerHTML = '';
    it.fotos.forEach((f, fi) => fotos.append(el('div', { class: 'foto' },
      el('img', { src: f.preview, alt: 'Foto ' + (fi + 1) }),
      el('button', { type: 'button', 'aria-label': 'Tirar foto ' + (fi + 1), text: '×', onclick: () => { it.fotos.splice(fi, 1); desenhaFotos(); } })
    )));
    if (it.fotos.length < MAX_FOTOS) {
      const inp = el('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true });
      const lab = el('label', { class: 'add-foto' }, el('span', { class: 'ic', text: '📷' }), el('span', { text: 'Adicionar foto' }), inp);
      inp.addEventListener('change', async () => {
        const arqs = Array.from(inp.files || []).slice(0, MAX_FOTOS - it.fotos.length);
        if (!arqs.length) return;
        lab.classList.add('carregando');
        lab.lastElementChild.previousElementSibling.textContent = 'Preparando…';
        for (const a of arqs) {
          try { it.fotos.push(await comprimeFoto(a)); }
          catch (e) { toast('Não consegui abrir uma das fotos. Tente outra.', true); }
        }
        desenhaFotos();
      });
      fotos.append(lab);
    }
  };
  desenhaFotos();
  card.append(el('div', { class: 'rot' }, 'Fotos ', el('span', { class: 'muted small', text: '(opcional, até ' + MAX_FOTOS + ')' })), fotos);

  return card;
}

// reduz a foto para ficar leve (máx. 1600 px, JPEG)
function comprimeFoto(arquivo) {
  return new Promise((ok, falha) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      const max = 1600;
      const esc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * esc), h = Math.round(img.naturalHeight * esc);
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = cv.toDataURL('image/jpeg', 0.72);
      URL.revokeObjectURL(url);
      ok({ tipo: 'image/jpeg', dados: dataUrl.split(',')[1], preview: dataUrl });
    };
    img.onerror = () => { URL.revokeObjectURL(url); falha(new Error('imagem inválida')); };
    img.src = url;
  });
}

$('#addItem').addEventListener('click', () => {
  const it = novoItem();
  setTimeout(() => { const c = $('#item' + it.uid); c.scrollIntoView({ behavior: 'smooth', block: 'start' }); $('textarea', c).focus({ preventScroll: true }); }, 50);
});

/* ---------- validar e enviar ---------- */
function marcaErro(elem, msg) {
  elem.classList.add('erro-campo');
  elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
  toast(msg, true);
  return false;
}

function valida() {
  if (!selLoja.value) return marcaErro(selLoja, 'Escolha a sua loja.');
  const nome = $('#nome');
  if (!nome.value.trim()) return marcaErro(nome, 'Escreva o seu nome.');
  if ($('#tudoOk').checked) return true;
  const validos = itens.filter(it => it.descricao.trim() || it.fotos.length);
  if (!validos.length) return marcaErro($('textarea', $('#itens')), 'Conte pelo menos um problema (ou marque "Está tudo certo").');
  for (const it of validos) {
    const c = $('#item' + it.uid);
    const n = itens.indexOf(it) + 1;
    if (!it.descricao.trim()) return marcaErro($('textarea', c), 'Problema ' + n + ': conte o que está acontecendo.');
    if (!it.categoria) return marcaErro($('.cats', c), 'Problema ' + n + ': escolha o tipo de problema.');
    if (!it.urgencia) return marcaErro($('.urg', c), 'Problema ' + n + ': escolha a urgência.');
  }
  return true;
}

$('#enviar').addEventListener('click', async () => {
  if (enviando || !valida()) return;
  enviando = true;
  const bt = $('#enviar'), prog = $('#prog');
  bt.disabled = true;
  const envio = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const loja = lojaPorNum(selLoja.value);
  const base = { loja: loja.num, lojaNome: loja.nome, responsavel: $('#nome').value.trim() };

  let fila;
  if ($('#tudoOk').checked) {
    fila = [{ uid: 0, categoria: 'Sem problemas', descricao: 'Loja informou que está tudo certo.', urgencia: 'Pode esperar', local: '', fotos: [] }];
  } else {
    fila = itens.filter(it => (it.descricao.trim() || it.fotos.length) && !it.enviadoId);
  }

  const feitos = enviadosSessao;
  try {
    for (let i = 0; i < fila.length; i++) {
      const it = fila[i];
      prog.textContent = fila.length > 1 ? 'Enviando problema ' + (i + 1) + ' de ' + fila.length + '…' : 'Enviando…';
      if (it.fotos.length) prog.textContent += ' (com fotos, pode levar alguns segundos)';
      const corpo = { envio, item: Object.assign({}, base, {
        categoria: it.categoria, descricao: it.descricao.trim(), local: (it.local || '').trim(),
        urgencia: it.urgencia, fotos: it.fotos.map(f => ({ tipo: f.tipo, dados: f.dados }))
      }) };
      let r;
      try { r = await api('enviar', corpo); }
      catch (e) { r = await api('enviar', corpo); } // tenta uma segunda vez
      it.enviadoId = r.id;
      feitos.push(it);
    }
    mostraOk(feitos, loja);
  } catch (e) {
    prog.textContent = '';
    toast(e.message + (feitos.length ? ' Os que já foram enviados não serão repetidos.' : ''), true);
    itens = itens.filter(x => !x.enviadoId);
    if (!itens.length) novoItem(); else desenhaItens();
  } finally {
    enviando = false;
    bt.disabled = false;
  }
});

function mostraOk(feitos, loja) {
  const tudoOk = $('#tudoOk').checked;
  $('#telaForm').hidden = true;
  $('#barra').hidden = true;
  $('#telaOk').hidden = false;
  $('#okTexto').textContent = tudoOk
    ? 'Registramos que a Loja ' + loja.num + ' · ' + loja.nome + ' está sem problemas no momento.'
    : 'A Loja ' + loja.num + ' · ' + loja.nome + ' enviou ' + feitos.length + (feitos.length > 1 ? ' problemas' : ' problema') + '. A diretoria vai encaminhar para o profissional certo.';
  const ul = $('#okLista'); ul.innerHTML = '';
  if (!tudoOk) feitos.forEach(it => ul.append(el('li', null,
    el('code', { text: it.enviadoId }),
    achaCategoria(it.categoria).icone + ' ' + it.categoria,
    el('br'), el('span', { class: 'muted', text: it.descricao.slice(0, 90) + (it.descricao.length > 90 ? '…' : '') })
  )));
  window.scrollTo(0, 0);
}

$('#novo').addEventListener('click', () => {
  itens = []; enviadosSessao = []; novoItem();
  $('#tudoOk').checked = false; $('#tudoOk').dispatchEvent(new Event('change'));
  $('#telaOk').hidden = true; $('#telaForm').hidden = false; $('#barra').hidden = false;
  $('#prog').textContent = '';
  window.scrollTo(0, 0);
});

// avisa se a pessoa tentar sair com algo preenchido e não enviado
window.addEventListener('beforeunload', e => {
  if (!$('#telaForm').hidden && itens.some(it => !it.enviadoId && (it.descricao.trim() || it.fotos.length))) {
    e.preventDefault(); e.returnValue = '';
  }
});

novoItem();
