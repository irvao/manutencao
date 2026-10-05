/* Funções usadas pelo formulário e pelo painel */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

// cria um elemento: el('div', {class:'x', text:'oi', onclick:fn}, filho1, filho2)
function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
}

// tira acento e deixa minúsculo
function normaliza(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// "guarda" no navegador, sem quebrar se o navegador bloquear
const guarda = {
  get(k, padrao) { try { const v = localStorage.getItem(k); return v == null ? padrao : JSON.parse(v); } catch (e) { return padrao; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};

// conversa com o "depósito" (Google Apps Script)
async function api(acao, dados) {
  if (!window.SCRIPT_URL) throw new Error('O site ainda não está ligado à planilha (falta o SCRIPT_URL em js/dados.js).');
  let r;
  try {
    r = await fetch(window.SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ acao }, dados || {})),
      redirect: 'follow'
    });
  } catch (e) {
    throw new Error('Sem conexão com a internet ou o servidor não respondeu. Tente de novo.');
  }
  let j;
  try { j = await r.json(); } catch (e) { throw new Error('Resposta inesperada do servidor (' + r.status + ').'); }
  if (!j.ok) throw new Error(j.erro || 'Erro no servidor.');
  return j;
}

// categoria pelo nome (aceita variações de acento/maiúscula)
function achaCategoria(nome) {
  const n = normaliza(nome);
  return window.CATEGORIAS.find(c => normaliza(c.nome) === n) || { nome: nome || 'Outros', icone: '📋', palavras: [] };
}

// sugere a categoria a partir do texto digitado
function sugereCategoria(texto) {
  const t = ' ' + normaliza(texto).replace(/[^a-z0-9 ']/g, ' ') + ' ';
  let melhor = null, pontos = 0;
  for (const c of window.CATEGORIAS) {
    let p = 0;
    for (const w of c.palavras) {
      const re = new RegExp('[^a-z]' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      if (re.test(t)) p += w.trim().length;
    }
    if (p > pontos) { pontos = p; melhor = c; }
  }
  return melhor;
}

function lojaPorNum(num) {
  return window.LOJAS.find(l => String(l.num) === String(num));
}
function rotuloLoja(num, nome) {
  const l = lojaPorNum(num);
  return 'Loja ' + num + ' · ' + ((l && l.nome) || nome || '');
}

function dataBR(iso, comHora) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  const op = { day: '2-digit', month: '2-digit', year: '2-digit' };
  if (comHora) Object.assign(op, { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleString('pt-BR', op);
}

let _toastT;
function toast(msg, erro) {
  let t = $('#toast');
  if (!t) { t = el('div', { id: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.append(t); }
  t.textContent = msg;
  t.className = 'on' + (erro ? ' erro' : '');
  clearTimeout(_toastT);
  _toastT = setTimeout(() => (t.className = ''), erro ? 5000 : 2600);
}

const LOGO_SVG = '<svg class="logo" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6" fill="#fff"/><g fill="none" stroke="#C2151C" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 6.2a3.6 3.6 0 0 0-4.6 4.6L5 15.7a1.6 1.6 0 0 0 2.3 2.3l4.9-4.9a3.6 3.6 0 0 0 4.6-4.6l-2.2 2.2-2-.3-.3-2z"/></g></svg>';
