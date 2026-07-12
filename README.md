# Porcadex

Uma **Pokédex para as pessoas com quem já curtiste**. Adiciona cada pessoa,
marca se foi **Beijo** ou **Sexo**, dá-lhe **tipos** ao estilo Pokémon
(Water, Fire, Dragon…), escolhe a **pokébola**, o **país** e avalia-a com
estrelas e estatísticas.

App _mobile-first_ (feita para o telemóvel), funciona offline e pode ser
instalada no ecrã inicial como uma app.

## Funcionalidades

- 📇 **Coleção** — cartões coloridos pelo **tipo Pokémon** da pessoa, com número
  estilo Pokédex, pesquisa e filtros (Beijo, Sexo, Favoritos, Lendárias).
- 💋 **Relação** — cada pessoa é **Beijo** ou **Sexo**.
- 🔥 **Tipos** — 1 ou 2 tipos ao estilo Pokémon (18 tipos com cores canónicas).
- 🌍 **Dex Nacional / Internacional** — escolhe o país de cada pessoa; a lista
  separa quem é do teu país de quem é de fora.
- ⚪ **Pokébola** — escolhe a bola de cada pessoa (Poké, Great, Ultra, Master,
  Love…).
- 👑 **Lendárias** — marca pessoas como lendárias, com categorias.
- 📊 **Estatísticas** — ecrã próprio com totais, médias e um **mapa-múndi** que
  ilumina os países da tua coleção.
- 👤 **Ficha da pessoa** — cabeçalho colorido com foto e separadores:
  - **Sobre** — país, contactos (telemóvel, Instagram), como se conheceram…
  - **Stats** — 6 estatísticas em barras + avaliação geral.
  - **Momentos** — linha do tempo das memórias.
  - **Fotos** — galeria; define a foto principal.
- 🌙 **Tema claro/escuro** (segue o sistema, com botão para alternar).
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
- **d3-geo** + **topojson-client** + **world-atlas** para o mapa-múndi (offline)
- Sem backend — persistência local (localStorage + IndexedDB)

## Estrutura

```
src/
├─ components/     # Avatar, PersonCard, TypeBadge, RelBadge, Ball, WorldMap…
├─ data/           # tipos Pokémon, relações, pokébolas, lendárias, países
├─ lib/            # utilitários, fotos (IndexedDB), tema, definições
├─ screens/        # Lista, Detalhe, Editar/Adicionar, Estatísticas
│  └─ detail/      # separadores Sobre / Momentos / Fotos
├─ store/          # estado das pessoas (contexto + persistência + migração)
├─ types.ts        # modelo de dados
└─ index.css       # design system e estilos
```

## Personalizar

- **Tipos Pokémon e cores**: `src/data/pokeTypes.ts`
- **Relações (Beijo/Sexo)**: `src/data/relationships.ts`
- **Pokébolas**: `src/components/Ball.tsx`
- **Categorias de lendária**: `src/data/legendary.ts`
- **Estatísticas (stats)**: `src/types.ts` (`STAT_META`)
- **Dados de exemplo** (1ª utilização): `src/data/seed.ts`

---

Feito com carinho 💚
