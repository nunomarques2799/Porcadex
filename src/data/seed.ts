import type { Person } from '../types'
import { uid } from '../lib/utils'

// A few example entries shown on first run so the app isn't empty. The user
// can delete them at any time; they're only inserted once.
export function seedPeople(): Person[] {
  const now = Date.now()
  return [
    {
      id: uid(),
      number: 1,
      name: 'Ana Silva',
      nickname: 'Aninhas',
      relationship: 'melhor_amigo',
      photoIds: [],
      rating: 5,
      stats: {
        humor: 92,
        simpatia: 88,
        lealdade: 96,
        inteligencia: 80,
        carisma: 85,
        confianca: 94,
      },
      about: {
        howWeMet: 'Conhecemo-nos na faculdade, na fila do bar.',
        birthday: '1999-03-14',
        location: 'Porto',
        phone: '+351 912 345 678',
        instagram: 'ana.silva',
        since: '2018-09-20',
      },
      traits: ['Boa ouvinte', 'Sempre presente', 'Café addict'],
      notes: 'A pessoa que ligo primeiro para tudo.',
      moments: [
        { id: uid(), title: 'Viagem a Interrail', date: '2022-07-01' },
        { id: uid(), title: 'Concerto inesquecível', date: '2023-06-10' },
      ],
      favorite: true,
      createdAt: now - 3000,
    },
    {
      id: uid(),
      number: 2,
      name: 'João Costa',
      relationship: 'amigo',
      photoIds: [],
      rating: 4,
      stats: {
        humor: 78,
        simpatia: 70,
        lealdade: 82,
        inteligencia: 88,
        carisma: 66,
        confianca: 80,
      },
      about: {
        howWeMet: 'Colegas de equipa no futsal.',
        location: 'Lisboa',
        since: '2020-01-15',
      },
      traits: ['Competitivo', 'Piadas secas'],
      moments: [{ id: uid(), title: 'Final do torneio', date: '2021-05-22' }],
      favorite: false,
      createdAt: now - 2000,
    },
    {
      id: uid(),
      number: 3,
      name: 'Mariana',
      relationship: 'paixao',
      photoIds: [],
      rating: 4.5,
      stats: {
        humor: 84,
        simpatia: 90,
        lealdade: 72,
        inteligencia: 86,
        carisma: 95,
        confianca: 70,
      },
      about: {
        howWeMet: 'Numa exposição de arte.',
        location: 'Coimbra',
        instagram: '@mariana.art',
        since: '2024-02-11',
      },
      traits: ['Sorriso contagiante', 'Adora viajar'],
      notes: 'A ver no que dá 👀',
      moments: [],
      favorite: false,
      createdAt: now - 1000,
    },
  ]
}
