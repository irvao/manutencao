/* Painel da diretoria (painel.html) */

$('#logo').outerHTML = LOGO_SVG;

const SEM = 'Sem problemas';
const PESO_URG = { 'Urgente': 3, 'Logo': 2, 'Pode esperar': 1 };
const st = {
  senha: '',
  itens: [],
  aba: 'cat',
  selCat: '__todas',
  selLoja: '',
  carregado: false
};

const sessao = {
  get() { try { return sessionStorage.getItem('mnt_senha') || ''; } catch (e) { return ''; } },
  set(v) { try { v ? sessionStorage.setItem('mnt_senha', v) : sessionStorage.removeItem('mnt_senha'); } catch (e) {} }
};

window.URGENCIAS.forEach(u => $('#fUrg').append(el('option', { value: u.nome, text: u.nome })));

/* ---------------- login ---------------- */
$('#fLogin').addEventListener('submit', async e => {
  e.preventDefault();
  const bt = $('#btEntrar');
  bt.disabled = true; bt.textContent = 'Entrando…';
  try {
    st.senha = $('#senha').value;
    await carrega();
    sessao.set(st.senha);
    const t = $('#toast'); if (t) t.className = '';
    mostraPainel();
  } catch (err) {
    toast(err.message, true);
  } finally {
    bt.disabled = false; bt.textContent = 'Entrar';
  }
});

$('#btSair').addEventListener('click', () => {
  sessao.set(''); st.senha = ''; st.itens = [];
  $('#telaPainel').hidden = true; $('#acoesTopo').hidden = true; $('#telaLogin').hidden = false;
  $('#senha').value = '';
});

$('#btAtualizar').addEventListener('click', async () => {
  const bt = $('#btAtualizar'); bt.disabled = true; bt.textContent = 'Atualizando…';
  try { await carrega(); desenha(); toast('Atualizado.'); }
  catch (e) { toast(e.message, true); }
  finally { bt.disabled = false; bt.textContent = 'Atualizar'; }
});

async function carrega() {
  const r = await api('listar', { senha: st.senha });
  st.itens = r.itens || [];
  if (r.links) {
    if (r.links.planilha) { $('#lnPlanilha').href = r.links.planilha; $('#lnPlanilha').hidden = false; }
    if (r.links.pasta) { $('#lnPasta').href = r.links.pasta; $('#lnPasta').hidden = false; }
  }
  st.carregado = true;
}

function mostraPainel() {
  $('#telaLogin').hidden = true;
  $('#telaPainel').hidden = false;
  $('#acoesTopo').hidden = false;
  desenha();
}

/* ---------------- filtros e abas ---------------- */
['fStatus', 'fUrg'].forEach(id => $('#' + id).addEventListener('change', desenha));
let _busca;
$('#fBusca').addEventListener('input', () => { clearTimeout(_busca); _busca = setTimeout(desenha, 200); });

$$('.aba').forEach(b => b.addEventListener('click', () => {
  st.aba = b.dataset.aba;
  $$('.aba').forEach(x => x.setAttribute('aria-selected', x === b ? 'true' : 'false'));
  desenha();
}));

$('#btLinkForm').addEventListener('click', async () => {
  const link = location.href.replace(/painel\.html.*$/, '');
  try { await navigator.clipboard.writeText(link); toast('Link copiado: ' + link); }
  catch (e) { prompt('Copie o link do formulário:', link); }
});

function filtrados() {
  const s = $('#fStatus').value, u = $('#fUrg').value, q = normaliza($('#fBusca').value.trim());
  return st.itens.filter(it => {
    if (it.categoria === SEM) return false;
    if (s === 'pendentes' && it.status === 'Resolvido') return false;
    if (s && s !== 'pendentes' && it.status !== s) return false;
    if (u && it.urgencia !== u) return false;
    if (q && !normaliza([it.descricao, it.local, it.responsavel, it.lojaNome, it.observacao, it.id].join(' ')).includes(q)) return false;
    return true;
  });
}

function ordena(lista) {
  return lista.slice().sort((a, b) =>
    (PESO_URG[b.urgencia] || 0) - (PESO_URG[a.urgencia] || 0) || String(a.data).localeCompare(String(b.data)));
}
function ordenaLoja(a, b) { return Number(a) - Number(b) || String(a).localeCompare(String(b)); }

// categorias na ordem do dados.js + qualquer outra que exista na planilha
function todasCategorias() {
  const nomes = window.CATEGORIAS.map(c => c.nome);
  st.itens.forEach(it => {
    if (it.categoria !== SEM && !nomes.some(n => normaliza(n) === normaliza(it.categoria))) nomes.push(it.categoria);
  });
  return nomes.map(achaCategoria);
}
function mesmaCat(a, b) { return normaliza(a) === normaliza(b); }

// lojas do dados.js + qualquer outra que exista na planilha
function todasLojas() {
  const lista = window.LOJAS.map(l => ({ num: String(l.num), nome: l.nome }));
  st.itens.forEach(it => { if (!lista.some(l => l.num === String(it.loja))) lista.push({ num: String(it.loja), nome: it.lojaNome }); });
  return lista.sort((a, b) => ordenaLoja(a.num, b.num));
}

const DIAS_RESPOSTA = 30;
function lojasQueResponderam() {
  const corte = Date.now() - DIAS_RESPOSTA * 864e5;
  const set = new Set();
  st.itens.forEach(it => { if (new Date(it.data).getTime() >= corte) set.add(String(it.loja)); });
  return set;
}

/* ---------------- desenho ---------------- */
function desenha() {
  if (!st.carregado) return;
  desenhaKpis();
  if (st.aba === 'cat') desenhaCategorias(); else desenhaLojas();
}

function desenhaKpis() {
  const reais = st.itens.filter(it => it.categoria !== SEM);
  const abertos = reais.filter(it => it.status === 'Aberto').length;
  const urg = reais.filter(it => it.urgencia === 'Urgente' && it.status !== 'Resolvido').length;
  const env = reais.filter(it => it.status === 'Enviado').length;
  const res = reais.filter(it => it.status === 'Resolvido').length;
  const resp = lojasQueResponderam();
  const ativas = window.LOJAS.filter(l => resp.has(String(l.num))).length;
  const k = (rot, v, nota, alerta) => el('div', { class: 'kpi' + (alerta ? ' alerta' : '') },
    el('div', { class: 'k', text: rot }), el('div', { class: 'v', text: v }), el('div', { class: 'n', text: nota }));
  $('#kpis').replaceChildren(
    k('Abertos', abertos, 'ainda não encaminhados'),
    k('Urgentes', urg, 'não resolvidos', urg > 0),
    k('Enviados', env, 'com o profissional'),
    k('Resolvidos', res, 'no total'),
    k('Lojas responderam', ativas + '/' + window.LOJAS.length, 'nos últimos ' + DIAS_RESPOSTA + ' dias')
  );
}

function botaoLado(sel, conteudo, qtd, temUrg, onclick, extraClasse) {
  return el('button', { type: 'button', class: 'lado-bt' + (extraClasse ? ' ' + extraClasse : ''), 'aria-selected': sel ? 'true' : 'false', onclick },
    ...conteudo, el('span', { class: 'q' + (temUrg ? ' urg' : ''), text: qtd, title: temUrg ? 'tem item urgente' : null }));
}

/* ----- Por categoria ----- */
function desenhaCategorias() {
  const lista = filtrados();
  const cats = todasCategorias();
  const lado = $('#lado'); lado.innerHTML = '';
  const temUrg = arr => arr.some(it => it.urgencia === 'Urgente');

  lado.append(botaoLado(st.selCat === '__todas', [el('span', { class: 'ic', text: '🗂️' }), el('span', { text: 'Todas' })],
    lista.length, temUrg(lista), () => { st.selCat = '__todas'; desenha(); }));
  cats.forEach(c => {
    const doCat = lista.filter(it => mesmaCat(it.categoria, c.nome));
    lado.append(botaoLado(st.selCat === c.nome, [el('span', { class: 'ic', text: c.icone }), el('span', { text: c.nome })],
      doCat.length, temUrg(doCat), () => { st.selCat = c.nome; desenha(); }, doCat.length ? '' : 'sem'));
  });

  const todas = st.selCat === '__todas';
  const cat = todas ? null : achaCategoria(st.selCat);
  const itensCat = ordena(todas ? lista : lista.filter(it => mesmaCat(it.categoria, st.selCat)));
  const titulo = todas ? 'Todas as categorias' : cat.nome;

  const box = $('#conteudo'); box.innerHTML = '';
  box.append(cabecalho(todas ? '🗂️' : cat.icone, titulo, itensCat, todas ? 'categoria' : 'loja', 'Manutenção · ' + titulo));
  if (!itensCat.length) { box.append(el('div', { class: 'vazio', text: 'Nenhum pedido com esses filtros.' })); return; }

  if (todas) {
    cats.forEach(c => {
      const g = itensCat.filter(it => mesmaCat(it.categoria, c.nome));
      if (!g.length) return;
      box.append(el('div', { class: 'sub', text: c.icone + ' ' + c.nome + ' · ' + g.length }));
      g.forEach(it => box.append(cardPedido(it, { mostraCat: false })));
    });
  } else {
    const lojas = [...new Set(itensCat.map(it => String(it.loja)))].sort(ordenaLoja);
    lojas.forEach(n => {
      const g = itensCat.filter(it => String(it.loja) === n);
      box.append(el('div', { class: 'sub', text: rotuloLoja(n, g[0].lojaNome) + ' · ' + g.length }));
      g.forEach(it => box.append(cardPedido(it, { mostraLoja: false })));
    });
  }
}

/* ----- Por loja ----- */
function desenhaLojas() {
  const lista = filtrados();
  const lojas = todasLojas();
  const resp = lojasQueResponderam();
  if (!st.selLoja) st.selLoja = lojas[0] && lojas[0].num;
  const lado = $('#lado'); lado.innerHTML = '';

  lojas.forEach(l => {
    const daLoja = lista.filter(it => String(it.loja) === l.num);
    const semResp = !resp.has(l.num);
    lado.append(botaoLado(st.selLoja === l.num, [
      el('span', { text: l.num + ' · ' + l.nome }),
      semResp ? el('span', { class: 'tag', text: 'sem resposta' }) : null
    ], daLoja.length, daLoja.some(it => it.urgencia === 'Urgente'), () => { st.selLoja = l.num; desenha(); }, daLoja.length ? '' : 'sem'));
  });

  const loja = lojas.find(l => l.num === st.selLoja) || lojas[0];
  const box = $('#conteudo'); box.innerHTML = '';
  if (!loja) return;
  const itensLoja = ordena(lista.filter(it => String(it.loja) === loja.num));
  const titulo = 'Loja ' + loja.num + ' · ' + loja.nome;
  box.append(cabecalho('🏬', titulo, itensLoja, 'categoria', 'Manutenção · ' + titulo));

  // último retorno da loja
  const daLojaTodos = st.itens.filter(it => String(it.loja) === loja.num).sort((a, b) => String(b.data).localeCompare(String(a.data)));
  const ult = daLojaTodos[0];
  if (!ult) box.append(el('div', { class: 'vazio', style: 'margin-bottom:10px', text: 'Esta loja ainda não respondeu o formulário.' }));
  else if (ult.categoria === SEM) box.append(el('div', { class: 'ok-loja', text: '✓ Última resposta (' + dataBR(ult.data, true) + ', ' + ult.responsavel + '): está tudo certo na loja.' }));
  else box.append(el('p', { class: 'small muted', style: 'margin:0 0 6px', text: 'Última resposta: ' + dataBR(ult.data, true) + ' por ' + ult.responsavel + '.' }));

  if (!itensLoja.length) { if (ult) box.append(el('div', { class: 'vazio', text: 'Nenhum pedido com esses filtros.' })); return; }
  todasCategorias().forEach(c => {
    const g = itensLoja.filter(it => mesmaCat(it.categoria, c.nome));
    if (!g.length) return;
    box.append(el('div', { class: 'sub', text: c.icone + ' ' + c.nome + ' · ' + g.length }));
    g.forEach(it => box.append(cardPedido(it, { mostraLoja: false, mostraCat: false })));
  });
}

/* ----- cabeçalho com exportações ----- */
function cabecalho(icone, titulo, lista, agrupaPor, tituloDoc) {
  const abertos = lista.filter(it => it.status === 'Aberto');
  return el('div', { class: 'cab-grupo' },
    el('div', null,
      el('h2', null, el('span', { text: icone }), el('span', { text: titulo })),
      el('div', { class: 'small muted', text: lista.length + (lista.length === 1 ? ' pedido' : ' pedidos') + ' nos filtros atuais' })
    ),
    el('div', { class: 'exp' },
      el('button', { class: 'btn sm', type: 'button', disabled: !lista.length, onclick: () => exportaPDF(tituloDoc, lista, agrupaPor) }, 'PDF'),
      el('button', { class: 'btn sm', type: 'button', disabled: !lista.length, onclick: () => exportaCSV(tituloDoc, lista) }, 'Excel'),
      el('button', { class: 'btn sm', type: 'button', disabled: !lista.length, onclick: () => exportaWhats(tituloDoc, lista, agrupaPor) }, 'WhatsApp'),
      el('button', { class: 'btn sm', type: 'button', disabled: !abertos.length, title: 'Muda todos os abertos desta lista para "Enviado"',
        onclick: () => marcaEnviados(abertos) }, 'Marcar ' + abertos.length + ' como enviados')
    )
  );
}

/* ----- cartão de cada pedido ----- */
const urlThumb = (id, w) => 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w' + (w || 400);
const urlFoto = id => 'https://drive.google.com/file/d/' + encodeURIComponent(id) + '/view';

function cardPedido(it, op) {
  op = Object.assign({ mostraLoja: true, mostraCat: true }, op);
  const c = achaCategoria(it.categoria);
  const card = el('article', { class: 'pedido u-' + (it.urgencia || '').replace(/\s/g, '') + ' st-' + it.status });

  card.append(el('div', { class: 'meta' },
    el('span', { class: 'chip ' + (it.urgencia || '').replace(/\s/g, ''), text: it.urgencia || 'sem urgência' }),
    op.mostraCat ? el('span', { class: 'chip', text: c.icone + ' ' + it.categoria }) : null,
    op.mostraLoja ? el('b', { text: rotuloLoja(it.loja, it.lojaNome) }) : null,
    it.local ? el('span', { text: '📍 ' + it.local }) : null,
    el('span', { text: dataBR(it.data, true) + ' · ' + it.responsavel }),
    el('span', { class: 'chip st-' + it.status, text: it.status })
  ));
  card.append(el('div', { class: 'desc', text: it.descricao }));

  if (it.fotos && it.fotos.length) {
    card.append(el('div', { class: 'thumbs' }, it.fotos.map((id, i) =>
      el('a', { href: urlFoto(id), target: '_blank', rel: 'noopener', title: 'Abrir foto ' + (i + 1) },
        el('img', { src: urlThumb(id), alt: 'Foto ' + (i + 1), loading: 'lazy', referrerpolicy: 'no-referrer' })))));
  }

  // controles
  const sStatus = el('select', { 'aria-label': 'Status' }, window.STATUS.map(s => el('option', { value: s, text: s, selected: s === it.status })));
  sStatus.addEventListener('change', () => salva(it, { status: sStatus.value }));

  const sCat = el('select', { 'aria-label': 'Mover para categoria' }, todasCategorias().map(cc =>
    el('option', { value: cc.nome, text: cc.icone + ' ' + cc.nome, selected: mesmaCat(cc.nome, it.categoria) })));
  sCat.addEventListener('change', () => salva(it, { categoria: sCat.value }));

  const obs = el('input', { type: 'text', class: 'obs', placeholder: 'Observação interna (ex.: Murilo vai na quinta)', maxlength: '500' });
  obs.value = it.observacao || '';
  obs.addEventListener('change', () => salva(it, { observacao: obs.value.trim() }, true));

  card.append(el('div', { class: 'controles' }, sStatus, sCat, obs));
  card.append(el('div', { class: 'small muted', style: 'margin-top:6px;font-family:var(--mono);font-size:11px', text: it.id }));
  return card;
}

async function salva(it, campos, semRedesenho) {
  const antes = {};
  Object.keys(campos).forEach(k => { antes[k] = it[k]; it[k] = campos[k]; });
  if (!semRedesenho) desenha();
  try {
    await api('atualizar', { senha: st.senha, id: it.id, campos });
    toast('Salvo.');
  } catch (e) {
    Object.assign(it, antes); desenha();
    toast('Não salvou: ' + e.message, true);
  }
}

async function marcaEnviados(lista) {
  if (!lista.length) return;
  if (!confirm('Marcar ' + lista.length + ' pedido(s) como "Enviado ao profissional"?')) return;
  const ids = lista.map(it => it.id);
  lista.forEach(it => (it.status = 'Enviado'));
  desenha();
  try {
    await api('atualizar', { senha: st.senha, ids, campos: { status: 'Enviado' } });
    toast(ids.length + ' marcado(s) como enviados.');
  } catch (e) {
    lista.forEach(it => (it.status = 'Aberto')); desenha();
    toast('Não salvou: ' + e.message, true);
  }
}

/* ---------------- exportações ---------------- */
function agrupa(lista, por) {
  const grupos = [];
  if (por === 'loja') {
    [...new Set(lista.map(it => String(it.loja)))].sort(ordenaLoja).forEach(n => {
      const g = lista.filter(it => String(it.loja) === n);
      grupos.push({ titulo: rotuloLoja(n, g[0].lojaNome), itens: ordena(g) });
    });
  } else {
    todasCategorias().forEach(c => {
      const g = lista.filter(it => mesmaCat(it.categoria, c.nome));
      if (g.length) grupos.push({ titulo: c.icone + ' ' + c.nome, itens: ordena(g) });
    });
  }
  return grupos;
}

function nomeArquivo(t) {
  return normaliza(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '_' + new Date().toISOString().slice(0, 10);
}

function exportaPDF(titulo, lista, por) {
  const box = $('#impressao');
  box.innerHTML = '';
  const grupos = agrupa(lista, por);
  const urg = lista.filter(it => it.urgencia === 'Urgente').length;
  box.append(el('div', { class: 'cab' },
    el('h1', { text: 'Óticas Diniz · ' + titulo }),
    el('p', { text: lista.length + ' pedido(s)' + (urg ? ', ' + urg + ' urgente(s)' : '') + ' · gerado em ' + dataBR(new Date().toISOString(), true) })
  ));
  grupos.forEach(g => {
    box.append(el('h2', { text: g.titulo + ' (' + g.itens.length + ')' }));
    g.itens.forEach(it => box.append(el('div', { class: 'p u-' + (it.urgencia || '').replace(/\s/g, '') },
      el('div', { class: 'm' },
        el('b', { text: (it.urgencia || '').toUpperCase() }), ' · ',
        por === 'loja' ? it.categoria : rotuloLoja(it.loja, it.lojaNome),
        it.local ? ' · Local: ' + it.local : '',
        ' · ' + dataBR(it.data) + ' · ' + it.responsavel + ' · ' + it.id),
      el('div', { class: 'd', text: it.descricao }),
      it.observacao ? el('div', { class: 'm', text: 'Obs.: ' + it.observacao }) : null,
      it.fotos && it.fotos.length ? el('div', { class: 'f' }, it.fotos.map(id => el('img', { src: urlThumb(id, 600), alt: '', referrerpolicy: 'no-referrer' }))) : null
    )));
  });
  box.append(el('div', { class: 'rod', text: 'Fotos em tamanho grande: abra o painel de manutenção ou peça o link.' }));

  toast('Preparando o PDF… na janela que abrir, escolha "Salvar como PDF".');
  const imgs = $$('img', box);
  const espera = imgs.map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; }));
  Promise.race([Promise.all(espera), new Promise(r => setTimeout(r, 8000))]).then(() => {
    const tituloOriginal = document.title;
    document.title = nomeArquivo(titulo);
    window.print();
    setTimeout(() => (document.title = tituloOriginal), 1000);
  });
}

function exportaCSV(titulo, lista) {
  const cab = ['ID', 'Loja', 'Nome da loja', 'Categoria', 'Urgência', 'Local', 'Descrição', 'Responsável', 'Data', 'Status', 'Observação', 'Fotos'];
  const linhas = ordena(lista).sort((a, b) => ordenaLoja(a.loja, b.loja)).map(it => [
    it.id, it.loja, it.lojaNome, it.categoria, it.urgencia, it.local, it.descricao, it.responsavel,
    dataBR(it.data, true), it.status, it.observacao, (it.fotos || []).map(urlFoto).join(' ')
  ]);
  const esc = v => {
    let s = String(v == null ? '' : v);
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const csv = '﻿' + [cab, ...linhas].map(l => l.map(esc).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = el('a', { href: URL.createObjectURL(blob), download: nomeArquivo(titulo) + '.csv' });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Planilha baixada (abre no Excel).');
}

async function exportaWhats(titulo, lista, por) {
  const grupos = agrupa(lista, por);
  let t = '*Óticas Diniz · ' + titulo + '*\n' + lista.length + ' pedido(s) · ' + dataBR(new Date().toISOString()) + '\n';
  grupos.forEach(g => {
    t += '\n*' + g.titulo + '*\n';
    g.itens.forEach((it, i) => {
      t += (i + 1) + '. ' + (it.urgencia === 'Urgente' ? '🔴 URGENTE · ' : it.urgencia === 'Logo' ? '🟠 ' : '⚪ ');
      t += (por === 'loja' ? it.categoria : rotuloLoja(it.loja, it.lojaNome));
      if (it.local) t += ' · ' + it.local;
      t += '\n' + it.descricao.trim() + '\n';
      if (it.fotos && it.fotos.length) t += 'Fotos: ' + it.fotos.map(urlFoto).join(' ') + '\n';
    });
  });
  t = t.trim();
  if (navigator.share && matchMedia('(pointer:coarse)').matches) {
    try { await navigator.share({ text: t }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(t); toast('Texto copiado. Cole na conversa do WhatsApp.'); }
  catch (e) { prompt('Copie o texto abaixo:', t); }
}

/* ---------------- início ---------------- */
(async function inicio() {
  const s = sessao.get();
  if (!s) return;
  st.senha = s;
  $('#telaLogin').hidden = true;
  $('#telaPainel').hidden = false;
  $('#conteudo').innerHTML = '<div class="carregando">Carregando pedidos…</div>';
  try { await carrega(); mostraPainel(); }
  catch (e) { sessao.set(''); $('#telaPainel').hidden = true; $('#telaLogin').hidden = false; toast(e.message, true); }
})();
