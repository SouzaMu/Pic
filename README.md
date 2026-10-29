# Portfólio de Murillo Souza

O portfólio fica em `public/`. O projeto Régua & Machado pode ser acessado pelo cartão de projetos ou diretamente em `/barbearia/`.

## Demonstração da barbearia

A versão web foi adaptada do projeto acadêmico PHP/MySQL enviado, cujo código original está em https://github.com/SouzaMu/Pic. Preserva os seis serviços, preços, durações e profissionais do catálogo limpo, sem importar clientes, movimentações, credenciais ou dados pessoais do arquivo enviado.

A demonstração permite cadastrar nomes fictícios, agendar múltiplos serviços, filtrar a agenda por data e profissional, atualizar status, receber o valor integral de um atendimento e registrar entradas e saídas no caixa. Valores são armazenados em centavos, e o servidor determina preços e duração. As transações serializam alterações da mesma demonstração para evitar conflitos de horário e recebimentos duplicados.

Cada navegador recebe um identificador de demonstração em cookie HttpOnly com validade de 30 dias. Os dados de teste ficam no Netlify Database e são separados por demonstração. O cookie não representa uma conta de usuário; esta versão não deve ser usada como sistema de produção para uma barbearia real. Não há reservas nem cobranças reais. Não informe dados pessoais. Limpar os cookies encerra o acesso àquela demonstração; os registros não são excluídos automaticamente. Pagamento parcial, estorno e gerenciamento do catálogo não fazem parte desta versão.

## Desenvolvimento

Instale as dependências com `npm ci`. Inicie a emulação com `netlify dev --port 8889`.

As tabelas são definidas em `db/schema.ts`; o cliente usa `@netlify/database` e Drizzle ORM. As migrações em `netlify/database/migrations/` são aplicadas pela Netlify durante a publicação. Para alterações futuras no esquema, gere uma nova migração com `npx drizzle-kit generate --name descricao_da_mudanca`.

Execute `npm test` para validar as regras de agendamento e caixa, e `npm run typecheck` para verificar os tipos do servidor.

## Publicação e código original

`netlify.toml` publica apenas `public/`, mantendo código do servidor, anexos e arquivos de banco fora da pasta pública. A função atende em `/api/barbearia`.

Esta adaptação está no repositório conectado ao portfólio. O link de `SouzaMu/Pic` aponta para o projeto original; ele não é sincronizado automaticamente com este repositório.
