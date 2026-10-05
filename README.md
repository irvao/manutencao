# Manutenção das Lojas · Óticas Diniz

Formulário para as 24 lojas informarem o que precisa de manutenção (com fotos), e um painel da diretoria que separa tudo por categoria e por loja.

- **Formulário das lojas:** https://irvao.github.io/manutencao/
- **Painel da diretoria (com senha):** https://irvao.github.io/manutencao/painel.html

## Como funciona

1. O gerente abre o link no celular, escolhe a loja, escreve o nome e conta cada problema (pode usar o microfone do teclado). O site sugere a categoria pelo texto e aceita até 6 fotos por problema (as fotos são reduzidas antes de enviar).
2. Cada problema vira uma linha na planilha Google **"Manutenção das Lojas"**, e as fotos vão para a pasta **"Manutenção Lojas - Fotos"** no Google Drive, separadas por loja.
3. No painel, a diretoria vê os pedidos por categoria (Hidráulica, Elétrica, ...) ou por loja, muda o status (Aberto, Enviado, Resolvido), corrige a categoria e exporta em PDF, Excel ou texto para WhatsApp.

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | Formulário das lojas |
| `painel.html` | Painel da diretoria |
| `js/dados.js` | **Único arquivo para mexer no dia a dia**: lojas, categorias, palavras de sugestão e o endereço da planilha |
| `js/formulario.js`, `js/painel.js`, `js/comum.js` | Funcionamento das páginas |
| `css/estilo.css` | Visual |
| `apps-script/Codigo.gs` | Cópia do código que roda dentro da planilha Google (sem a senha) |

## Segurança

- A senha do painel fica guardada só dentro do Apps Script da planilha (Propriedades do script), nunca neste repositório.
- As fotos ficam no Drive com acesso "qualquer pessoa com o link pode ver", para aparecerem no painel e no PDF. O link de cada foto é longo e aleatório.
