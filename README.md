# Átrio Odonto

Sistema de gestão de consultas para consultórios odontológicos. A recepção pode organizar a agenda, cadastrar pacientes, dentistas e funcionários, manter o catálogo de procedimentos e acompanhar os atendimentos do dia.

[Acessar o Átrio Odonto](https://atrio-consultas.vercel.app/)

## Executar no computador

Instale o Node.js 24.x com npm. Na pasta que contém o arquivo `package.json`, execute os comandos abaixo.

```sh
npm ci
npm run dev
```

Abra [o sistema local](http://localhost:5173). Se a porta estiver ocupada, o Vite informa outro endereço no terminal. O primeiro cadastro cria o banco SQLite em `.data/atrio.sqlite`. Os dados continuam disponíveis após encerrar e reabrir o servidor. Guarde a pasta `.data` para conservar os cadastros locais.

A configuração padrão funciona sem credenciais. Para mudar o diretório do banco, copie `.env.example` para `.env.local`, defina `ATRIO_DATA_DIR` como um diretório privado fora de `public/` e reinicie o servidor.

## Primeiro agendamento

1. Abra **Criar conta**, informe nome, e-mail e senha de 10 a 128 caracteres. A conta abre um consultório privado. Em acessos seguintes, use **Entrar**.
2. No painel, use **Novo dentista** para informar nome, CRO com UF e especialidade. Em **Novo paciente**, informe nome e data de nascimento.
3. Clique em **Nova consulta**. Escolha o paciente, o dentista e o procedimento, informe a data e o horário e clique em **Salvar consulta**. O catálogo inicial inclui avaliação odontológica, profilaxia, restauração, manutenção ortodôntica e retorno.
4. Em **Consultas**, alterne entre **Lista** e **Calendário**. Use a busca e os filtros de dentista e status. Na lista, também é possível filtrar por data. No calendário, selecione um dia para ver seus atendimentos.
5. Use **Editar consulta** para remarcar ou alterar o status entre agendada, confirmada, concluída e cancelada. O painel apresenta os totais do dia, a distribuição por status e os próximos horários.

As áreas **Pacientes**, **Dentistas**, **Funcionários** e **Procedimentos** permitem criar, consultar, editar e excluir registros. O cadastro de funcionário registra os dados da equipe. Cada conta de acesso tem sua própria agenda e sua própria equipe cadastrada.

Para explorar o sistema com dados fictícios, no **Painel** clique em **Adicionar cadastros de exemplo** e confirme **Adicionar 120 cadastros**. Cada consultório pode importar o lote uma vez. Ele acrescenta 15 dentistas, 90 pacientes e 15 funcionários.

### Regras da agenda

- As datas e horas do consultório seguem o fuso de São Paulo.
- A duração do procedimento reserva todo o intervalo. O sistema impede sobreposição de consultas do mesmo dentista ou do mesmo paciente, inclusive quando duas sessões tentam reservar ao mesmo tempo. Uma consulta pode começar no horário em que outra termina.
- Cancelar a consulta mantém seu histórico e libera o horário. Alterar a duração de um procedimento no catálogo preserva o intervalo das consultas já marcadas.
- Enquanto um paciente, dentista ou procedimento estiver vinculado a uma consulta, sua exclusão fica bloqueada. Uma tentativa de salvar uma versão antiga de um registro avisa que houve alteração em outro acesso.

## Testes e versão de produção local

```sh
npm test
npm run build
npm run preview
```

Os testes usam uma API HTTP real e um SQLite temporário. Cobrem autenticação, isolamento entre contas, cadastros, edição concorrente, agendamento, cancelamento, exclusão e persistência após reiniciar o servidor. Um teste adicional simula o armazenamento privado da Vercel para verificar o identificador de versão usado nas gravações. O comando de pré-visualização serve o conteúdo de `dist/` e a API no [endereço local de produção](http://localhost:4173).

## Publicar na Vercel

1. Importe o repositório do GitHub na Vercel e use a raiz do repositório como diretório do projeto. Selecione **Vite** e **Node.js 24.x**. Use `npm ci` para instalar, `npm run build` para compilar e `dist` como saída.
2. Em **Storage**, conecte um **Vercel Blob privado** ao ambiente **Production**. Para usar branches de pré-visualização com dados próprios, conecte um segundo armazenamento privado ao ambiente **Preview**.
3. A integração disponibiliza a credencial de armazenamento no servidor. O SDK aceita `BLOB_READ_WRITE_TOKEN` ou o vínculo por `BLOB_STORE_ID` e OIDC da Vercel. Mantenha essas variáveis no ambiente do servidor e fora do Git.
4. Faça o deploy após conectar o armazenamento. O arquivo `vercel.json` define a compilação e a região de execução da API em São Paulo. Abra a URL de produção, crie uma conta e faça o primeiro agendamento.

### Armazenamento e acesso

O React acessa `/api/clinic` no mesmo domínio. O servidor verifica a senha com scrypt e salt individual. A sessão dura até sete dias e usa cookie HttpOnly, SameSite e, na Vercel, Secure. **Sair da conta** revoga a sessão no servidor.

Na Vercel, os dados persistem em um objeto privado por conta. Cada gravação usa controle de versão para preservar alterações simultâneas. O armazenamento sobrevive a novos deploys. Se o vínculo com o Blob estiver indisponível, a API informa uma falha de armazenamento. O banco SQLite local e o armazenamento de produção são independentes.
