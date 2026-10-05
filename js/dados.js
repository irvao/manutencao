/* =====================================================================
   DADOS EDITÁVEIS · Manutenção das Lojas · Óticas Diniz
   Este é o único arquivo que você precisa mexer no dia a dia:
   - endereço do "depósito" (Apps Script)
   - lista de lojas
   - lista de categorias e as palavras que ajudam a sugerir cada uma
   ===================================================================== */

// Endereço do app da web do Google Apps Script (termina em /exec)
window.SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbws7FR2pzec4A9IaVdEIT7K2132UWhfBk54BoD3yr8ggniiHcA68urssO-gyNKSHD495A/exec';

// Lojas ativas. Para fechar uma loja, apague a linha. Para abrir, adicione.
window.LOJAS = [
  { num: '1',  nome: 'ARUJÁ PRÉDIO' },
  { num: '2',  nome: 'SUZANO SHOPPING' },
  { num: '3',  nome: 'VILA OLIVEIRA' },
  { num: '4',  nome: 'CALÇADÃO' },
  { num: '5',  nome: 'CAPITÃO' },
  { num: '6',  nome: 'SUZANO CENTRO' },
  { num: '7',  nome: 'MOGI PRIME' },
  { num: '8',  nome: 'CASARÃO' },
  { num: '9',  nome: 'NELSON' },
  { num: '10', nome: 'URUPEMA' },
  { num: '11', nome: 'ITAQUA CENTRO' },
  { num: '12', nome: 'ITAQUA SHOPPING' },
  { num: '13', nome: 'CAÇAPAVA CORONEL' },
  { num: '14', nome: 'ADHEMAR' },
  { num: '15', nome: 'ANDORINHA' },
  { num: '16', nome: 'PARADA' },
  { num: '17', nome: 'MEGA ITAQUA' },
  { num: '18', nome: 'CENTER VALE' },
  { num: '20', nome: 'BERTIOGA' },
  { num: '21', nome: 'MOGI CLASSICA' },
  { num: '22', nome: 'SANTA ISABEL' },
  { num: '23', nome: 'ANALIA FRANCO' },
  { num: '24', nome: 'ARUJÁ PRAÇA' },
  { num: '26', nome: 'VALE SUL' }
];

// Categorias. "palavras" = trechos que, se aparecerem na descrição,
// fazem o site sugerir aquela categoria (sem acento, minúsculo).
window.CATEGORIAS = [
  { nome: 'Hidráulica', icone: '🚰', exemplos: 'vazamento, torneira, descarga, entupimento',
    palavras: ['vaza', 'torneira', 'descarga', 'privada', 'vaso sanitario', 'pia', 'ralo', 'entup', 'cano', 'encanamento', 'registro', 'caixa d', 'agua', 'esgoto', 'sifao', 'chuveiro', 'boia', 'mictorio', 'bebedouro'] },
  { nome: 'Elétrica', icone: '💡', exemplos: 'lâmpada queimada, tomada, disjuntor, fiação',
    palavras: ['lampada', 'luz', 'queimad', 'tomada', 'disjuntor', 'fio ', 'fios', 'fiacao', 'energia', 'interruptor', 'curto', 'choque', 'spot', 'led', 'reator', 'luminaria', 'eletric', 'quadro de luz', 'piscando', 'apagad'] },
  { nome: 'Infiltração e umidade', icone: '🌧️', exemplos: 'goteira, mofo, mancha de umidade, telhado, calha',
    palavras: ['infiltr', 'goteira', 'mofo', 'umid', 'telhado', 'telha', 'calha', 'chuva', 'bolor', 'pingando do teto', 'gotejando', 'molhad'] },
  { nome: 'Ar-condicionado', icone: '❄️', exemplos: 'não gela, pingando, barulho, controle',
    palavras: ['ar condicionado', 'ar-condicionado', 'split', 'gela', 'climatiz', 'condensadora', 'evaporadora', 'ventilador'] },
  { nome: 'Móveis e marcenaria', icone: '🪑', exemplos: 'balcão, gaveta, expositor, prateleira, cadeira',
    palavras: ['movel', 'moveis', 'balcao', 'gaveta', 'expositor', 'prateleira', 'armario', 'cadeira', 'mesa', 'puxador', 'dobradica', 'marcenaria', 'mdf', 'display', 'bancada', 'estofad', 'sofa', 'banqueta', 'espelho'] },
  { nome: 'Portas, vidros e fechaduras', icone: '🚪', exemplos: 'porta de aço, vidro trincado, fechadura, vitrine',
    palavras: ['porta', 'vidro', 'fechadura', 'chave', 'trinco', 'trincad', 'blindex', 'mola', 'macaneta', 'cadeado', 'janela', 'vitrine', 'enrolar', 'trava'] },
  { nome: 'Paredes, piso e forro', icone: '🧱', exemplos: 'rachadura, pintura, piso solto, forro, gesso',
    palavras: ['parede', 'piso', 'pintura', 'pintar', 'tinta', 'rachad', 'rachadura', 'forro', 'gesso', 'azulejo', 'reboco', 'rodape', 'porcelanato', 'carpete', 'teto', 'descascand', 'buraco'] },
  { nome: 'Fachada e letreiro', icone: '🏪', exemplos: 'luminoso apagado, placa, toldo, adesivo',
    palavras: ['fachada', 'letreiro', 'luminoso', 'placa', 'toldo', 'adesivo', 'banner', 'logo', 'calcada'] },
  { nome: 'Equipamentos', icone: '🔧', exemplos: 'lensômetro, refrator, máquina de montagem, aquecedor',
    palavras: ['lensometro', 'refrator', 'autorrefrator', 'maquina', 'equipamento', 'aquecedor de armacao', 'ultrassom', 'lavadora', 'projetor', 'tabela'] },
  { nome: 'Outros', icone: '📋', exemplos: 'dedetização, limpeza pesada, qualquer outra coisa',
    palavras: ['dedetiz', 'barata', 'rato', 'cupim', 'pombo', 'inseto', 'praga'] }
];

window.URGENCIAS = [
  { nome: 'Pode esperar', dica: 'incomoda, mas dá para conviver' },
  { nome: 'Logo',         dica: 'atrapalha o dia a dia' },
  { nome: 'Urgente',      dica: 'risco para pessoas ou estoque, ou impede de vender' }
];

window.STATUS = ['Aberto', 'Enviado', 'Resolvido'];
