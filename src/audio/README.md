# Sons do combate

Larga aqui os teus ficheiros com **exatamente estes nomes**. Todos são
opcionais — o que faltar fica simplesmente em silêncio, sem partir nada.

> A lista de ficheiros é lida em build-time (glob do Vite em `lib/audio.ts`),
> não à procura pela rede. Por isso é que os nomes têm de bater certo — um
> ficheiro com nome não reconhecido nunca toca — e é preciso reiniciar o
> `npm run dev` depois de acrescentar sons novos.

## Música de fundo (toca em loop)

| Ficheiro    | Quando toca                       |
| ----------- | --------------------------------- |
| `battle`    | Durante o combate                 |
| `victory`   | Quando ganhas                     |
| `defeat`    | Quando perdes                     |

## Efeitos

| Ficheiro   | Quando toca                          |
| ---------- | ------------------------------------ |
| `hit`      | Golpe normal a acertar               |
| `super`    | Golpe super eficaz                   |
| `weak`     | Golpe pouco eficaz                   |
| `faint`    | Alguém vai ao tapete                 |
| `select`   | Escolher um ataque                   |
| `swap`     | Trocar de lutador                    |
| `levelup`  | Subir de nível no fim do combate     |

## Variantes (para não ser sempre o mesmo som)

Podes ter várias versões de qualquer som, numerando-as. A app **alterna** entre
elas por ordem, para nunca sair a mesma duas vezes seguidas:

```
victory.mp3  victory2.mp3         → victory, victory2, victory, …
victory1.mp3 victory2.mp3         → 1, 2, 1, 2, …
hit1.mp3 hit2.mp3 hit5.mp3        → 1, 2, 5, 1, 2, 5, …
```

**A numeração é livre**: pode começar em 0, 1 ou 2, ter buracos, e o nome sem
número conta como variante. Tocam por ordem crescente. Funciona para qualquer
som da lista acima, não só o `victory`.

## Formato

Usa **`.mp3`** — é o mais seguro e toca em todos os browsers. Também aceita
`.m4a`, `.ogg` e `.wav`; a app tenta por essa ordem, por isso basta pôr uma
versão de cada som.

**Sobre o `.mp4`:** um `.mp4` só com áudio até toca no Chrome, Edge e Safari,
mas não no Firefox, e é um contentor de vídeo — traz metadados a mais e
arranca mais devagar. Converte antes de meter aqui:

```sh
ffmpeg -i battle.mp4 -vn -b:a 192k battle.mp3
```

(`-vn` deita fora a pista de vídeo.) Se preferires não instalar nada, qualquer
conversor online de mp4→mp3 serve.

## Tamanhos

Tudo isto é descarregado para o telemóvel, muitas vezes com dados móveis, por
isso convém não exagerar:

| Tipo             | Alvo      | Porquê                              |
| ---------------- | --------- | ----------------------------------- |
| `battle`         | < 500 KB  | Carrega ao entrar no combate        |
| `victory`/`defeat` | < 350 KB | Só se ouvem os primeiros segundos   |
| Efeitos          | < 130 KB  | São de 1–5 s                        |

**Nunca uses `.wav`.** É áudio sem compressão — 24 s de WAV são 4,2 MB, contra
390 KB do mesmo em mp3 a 128k:

```sh
ffmpeg -i battle.wav -b:a 128k battle.mp3 && rm battle.wav
```

**Não uses faixas inteiras para o `victory`/`defeat`.** Só tocam enquanto vês
o ecrã de fim de combate — uma música de 4 minutos gasta 4 MB para ouvires
15 segundos. Corta com fade-out:

```sh
# primeiros 20s, a desvanecer a partir dos 18s
ffmpeg -i musica.mp3 -t 20 -af "afade=t=out:st=18:d=2" -b:a 128k victory.mp3

# para começar noutro sítio (ex.: aos 1:05), acrescenta -ss
ffmpeg -i musica.mp3 -ss 65 -t 20 -af "afade=t=out:st=18:d=2" -b:a 128k victory.mp3
```

> **Encolhe ANTES de fazer commit.** Estes ficheiros ficam no histórico do git
> para sempre — um mp3 de 4 MB commitado hoje continua a pesar em cada
> `git clone` mesmo depois de o apagares.
