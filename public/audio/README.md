# Sons do combate

Larga aqui os teus ficheiros com **exatamente estes nomes**. Todos são
opcionais — o que faltar fica simplesmente em silêncio, sem partir nada.

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

As faixas de fundo devem ficar abaixo de ~2 MB (são descarregadas à entrada do
combate) e os efeitos abaixo de ~50 KB. Corta a música para um loop de 30–60 s
em vez de meter a faixa inteira.
