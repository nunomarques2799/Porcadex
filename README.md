# Porcadex

Uma **Pokédex para as pessoas da tua vida**. Adiciona as pessoas com quem tens
uma relação, atribui-lhes um "tipo" (Amigo, Família, Namorado…), avalia-as com
estrelas e estatísticas, guarda fotos e regista os momentos que partilham.

App _mobile-first_ (feita para o telemóvel), funciona offline e pode ser
instalada no ecrã inicial como uma app.

## Funcionalidades

- 📇 **Coleção** — grelha de cartões coloridos por tipo de relação, com número
  estilo Pokédex, pesquisa e filtros.
- 👤 **Ficha da pessoa** — cabeçalho colorido com foto, e separadores:
  - **Sobre** — alcunha, como se conheceram, aniversário, localização,
    características e notas.
  - **Stats** — 6 estatísticas (Humor, Simpatia, Lealdade, Inteligência,
    Carisma, Confiança) em barras coloridas + avaliação geral.
  - **Momentos** — linha do tempo das memórias que partilham.
  - **Fotos** — galeria; define qual é a foto principal.
- ⭐ **Avaliações** em estrelas (com meias estrelas) e sliders para as stats.
- 💾 **Tudo guardado no dispositivo** — os dados ficam em `localStorage` e as
  fotos em `IndexedDB`. Nada sai do telemóvel; não há servidor.

## Como correr

```bash
npm install
npm run dev
```

Abre o endereço indicado (por omissão `http://localhost:5173`). Para veres no
telemóvel na mesma rede, corre `npm run dev -- --host` e abre o endereço de rede.

### Instalar no telemóvel

Abre o site no browser do telemóvel e usa **"Adicionar ao ecrã inicial"**.
Fica com ícone e abre em ecrã inteiro como uma app.

## Build para produção

```bash
npm run build      # gera a pasta dist/
npm run preview    # pré-visualiza o build
```

O `dist/` é estático e pode ir para qualquer alojamento (GitHub Pages, Netlify,
Vercel…). O `base` está definido como relativo, por isso funciona também em
subpastas (ex.: `utilizador.github.io/Porcadex/`). O routing usa `HashRouter`
para não precisar de configuração de servidor.

## Stack

- **React + TypeScript** com **Vite**
- **react-router-dom** (HashRouter)
- **lucide-react** para ícones
- Sem backend — persistência local (localStorage + IndexedDB)

## Estrutura

```
src/
├─ components/     # Avatar, PersonCard, StatBar, RatingStars, TypeBadge
├─ data/           # tipos de relação (cores) e dados de exemplo
├─ lib/            # utilitários, armazenamento de fotos (IndexedDB), hooks
├─ screens/        # Lista, Detalhe, Editar/Adicionar
│  └─ detail/      # separadores Sobre / Momentos / Fotos
├─ store/          # estado das pessoas (contexto + persistência)
├─ types.ts        # modelo de dados
└─ index.css       # design system e estilos
```

## Personalizar

- **Tipos de relação e cores**: `src/data/relationships.ts`
- **Estatísticas**: `src/types.ts` (`STAT_META`)
- **Dados de exemplo** (mostrados na 1ª utilização): `src/data/seed.ts`

---

Feito com carinho 💚 — a tua coleção de pessoas favoritas.
