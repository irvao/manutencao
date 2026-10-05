/**
 * Manutenção das Lojas · Óticas Diniz
 * "Depósito" do site: recebe os pedidos das lojas, grava na planilha
 * e guarda as fotos numa pasta do Google Drive.
 *
 * Este código fica DENTRO da planilha Google (Extensões > Apps Script).
 * A senha do painel NÃO fica aqui no GitHub: ela é gravada nas
 * "Propriedades do script" quando a função configurar() é executada.
 */

// Troque pela senha do painel ANTES de rodar configurar() lá no Apps Script.
// (No GitHub esta linha fica com o texto de exemplo, nunca com a senha real.)
const SENHA_PAINEL = 'TROCAR_AQUI';

const ABA = 'Pedidos';
const NOME_PASTA_FOTOS = 'Manutenção Lojas - Fotos';
const COLUNAS = [
  'ID', 'Envio', 'Data', 'Loja', 'Nome da loja', 'Responsável',
  'Categoria', 'Local', 'Urgência', 'Descrição', 'Fotos',
  'Status', 'Observação', 'Atualizado em'
];
const MAX_FOTOS = 6;
const MAX_BYTES_FOTO = 4 * 1024 * 1024; // 4 MB por foto (o site já comprime antes)

/* ------------------------------------------------------------------ */
/* Configuração (rodar uma vez pelo editor)                            */
/* ------------------------------------------------------------------ */
function configurar() {
  const ss = SpreadsheetApp.getActive();
  let aba = ss.getSheetByName(ABA);
  if (!aba) aba = ss.insertSheet(ABA, 0);
  if (aba.getLastRow() === 0) {
    aba.appendRow(COLUNAS);
    aba.setFrozenRows(1);
    aba.getRange(1, 1, 1, COLUNAS.length).setFontWeight('bold').setBackground('#FBE8E8');
    aba.setColumnWidth(10, 420);
  }
  // apaga a aba vazia padrão, se existir
  ['Página1', 'Sheet1', 'Planilha1'].forEach(function (n) {
    const a = ss.getSheetByName(n);
    if (a && a.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(a);
  });
  pastaFotos_();
  if (SENHA_PAINEL && SENHA_PAINEL !== 'TROCAR_AQUI') {
    PropertiesService.getScriptProperties().setProperty('SENHA', SENHA_PAINEL);
  }
  return 'Configurado. Pasta de fotos: ' + urlPasta_(pastaFotos_());
}

/* ------------------------------------------------------------------ */
/* Entrada do site                                                     */
/* ------------------------------------------------------------------ */
function doGet() {
  return json_({ ok: true, app: 'manutencao-lojas' });
}

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    let res;
    switch (req.acao) {
      case 'enviar':    res = enviar_(req); break;
      case 'login':     checaSenha_(req); res = {}; break;
      case 'listar':    checaSenha_(req); res = listar_(); break;
      case 'atualizar': checaSenha_(req); res = atualizar_(req); break;
      default: throw new Error('Ação desconhecida.');
    }
    res.ok = true;
    return json_(res);
  } catch (err) {
    return json_({ ok: false, erro: String((err && err.message) || err) });
  }
}

/* ------------------------------------------------------------------ */
/* Ações                                                               */
/* ------------------------------------------------------------------ */
function enviar_(req) {
  const it = req.item || {};
  const loja = limpa_(it.loja, 10);
  if (!loja) throw new Error('Loja não informada.');
  const descricao = limpa_(it.descricao, 4000);
  const categoria = limpa_(it.categoria, 60) || 'Outros';
  if (!descricao && categoria !== 'Sem problemas') throw new Error('Descrição vazia.');

  // fotos
  const fotos = Array.isArray(it.fotos) ? it.fotos.slice(0, MAX_FOTOS) : [];
  const ids = [];
  if (fotos.length) {
    const pasta = pastaLoja_(loja, limpa_(it.lojaNome, 60));
    const carimbo = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd_HHmm');
    fotos.forEach(function (f, i) {
      const tipo = String(f.tipo || 'image/jpeg');
      if (tipo.indexOf('image/') !== 0) return;
      const bytes = Utilities.base64Decode(String(f.dados || ''));
      if (!bytes.length || bytes.length > MAX_BYTES_FOTO) return;
      const nome = 'Loja' + loja + '_' + carimbo + '_' + slug_(categoria) + '_' + (i + 1) + '.jpg';
      const arq = Drive.Files.create({ name: nome, parents: [pasta], mimeType: tipo }, Utilities.newBlob(bytes, tipo, nome));
      Drive.Permissions.create({ role: 'reader', type: 'anyone' }, arq.id);
      ids.push(arq.id);
    });
  }

  const id = 'M' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase();
  const linha = [
    id,
    limpa_(req.envio, 40),
    new Date(),
    loja,
    limpa_(it.lojaNome, 60),
    limpa_(it.responsavel, 80),
    categoria,
    limpa_(it.local, 120),
    limpa_(it.urgencia, 30) || 'Logo',
    descricao,
    ids.join(','),
    categoria === 'Sem problemas' ? 'Resolvido' : 'Aberto',
    '',
    new Date()
  ].map(protege_);

  const trava = LockService.getScriptLock();
  trava.waitLock(20000);
  try {
    aba_().appendRow(linha);
  } finally {
    trava.releaseLock();
  }
  return { id: id, fotos: ids.length };
}

function listar_() {
  const aba = aba_();
  const links = { planilha: SpreadsheetApp.getActive().getUrl(), pasta: urlPasta_(pastaFotos_()) };
  const n = aba.getLastRow();
  if (n < 2) return { itens: [], links: links };
  const vals = aba.getRange(2, 1, n - 1, COLUNAS.length).getValues();
  const itens = vals.filter(function (r) { return r[0]; }).map(function (r) {
    return {
      id: String(r[0]),
      envio: String(r[1]),
      data: r[2] instanceof Date ? r[2].toISOString() : String(r[2]),
      loja: String(r[3]),
      lojaNome: String(r[4]),
      responsavel: String(r[5]),
      categoria: String(r[6]),
      local: String(r[7]),
      urgencia: String(r[8]),
      descricao: String(r[9]),
      fotos: String(r[10] || '').split(',').filter(String),
      status: String(r[11] || 'Aberto'),
      observacao: String(r[12] || ''),
      atualizado: r[13] instanceof Date ? r[13].toISOString() : String(r[13] || '')
    };
  });
  return { itens: itens, links: links };
}

function atualizar_(req) {
  const ids = Array.isArray(req.ids) ? req.ids.map(String) : [String(req.id || '')];
  const campos = req.campos || {};
  const mapa = { status: 12, categoria: 7, observacao: 13, urgencia: 9 }; // número da coluna
  const trava = LockService.getScriptLock();
  trava.waitLock(20000);
  try {
    const aba = aba_();
    const n = aba.getLastRow();
    if (n < 2) return { atualizados: 0 };
    const col = aba.getRange(2, 1, n - 1, 1).getValues().map(function (r) { return String(r[0]); });
    let cont = 0;
    ids.forEach(function (id) {
      const idx = col.indexOf(id);
      if (idx < 0) return;
      const linha = idx + 2;
      Object.keys(mapa).forEach(function (k) {
        if (campos[k] !== undefined) aba.getRange(linha, mapa[k]).setValue(protege_(limpa_(campos[k], 2000)));
      });
      aba.getRange(linha, 14).setValue(new Date());
      cont++;
    });
    return { atualizados: cont };
  } finally {
    trava.releaseLock();
  }
}

/* ------------------------------------------------------------------ */
/* Ajudantes                                                           */
/* ------------------------------------------------------------------ */
function checaSenha_(req) {
  const certa = PropertiesService.getScriptProperties().getProperty('SENHA');
  if (!certa) throw new Error('Senha do painel ainda não configurada.');
  if (String(req.senha || '') !== certa) {
    Utilities.sleep(1200); // atrasa quem tenta adivinhar
    throw new Error('Senha incorreta.');
  }
}

function aba_() {
  const ss = SpreadsheetApp.getActive();
  let aba = ss.getSheetByName(ABA);
  if (!aba) { configurar(); aba = ss.getSheetByName(ABA); }
  return aba;
}

// As pastas são criadas pelo serviço avançado do Drive, que só enxerga
// os arquivos criados por este código (permissão restrita drive.file).
const TIPO_PASTA = 'application/vnd.google-apps.folder';

function pastaExiste_(id) {
  if (!id) return false;
  try { return !Drive.Files.get(id, { fields: 'id,trashed' }).trashed; } catch (e) { return false; }
}

function pastaFotos_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('PASTA_FOTOS');
  if (pastaExiste_(id)) return id;
  const f = Drive.Files.create({ name: NOME_PASTA_FOTOS, mimeType: TIPO_PASTA });
  props.setProperty('PASTA_FOTOS', f.id);
  return f.id;
}

function pastaLoja_(loja, nome) {
  const props = PropertiesService.getScriptProperties();
  const chave = 'PASTA_LOJA_' + loja;
  const id = props.getProperty(chave);
  if (pastaExiste_(id)) return id;
  const titulo = 'Loja ' + ('0' + loja).slice(-2) + (nome ? ' - ' + nome : '');
  const f = Drive.Files.create({ name: titulo, mimeType: TIPO_PASTA, parents: [pastaFotos_()] });
  props.setProperty(chave, f.id);
  return f.id;
}

function urlPasta_(id) {
  return 'https://drive.google.com/drive/folders/' + id;
}

function limpa_(v, max) {
  return String(v == null ? '' : v).trim().slice(0, max || 500);
}

// impede que um texto começando com "=" vire fórmula na planilha
function protege_(v) {
  if (typeof v === 'string' && /^[=+\-@]/.test(v)) return "'" + v;
  return v;
}

function slug_(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').slice(0, 30);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
