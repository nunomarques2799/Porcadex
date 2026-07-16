import type { Person } from '../types'
import { initialBattleData } from './battle'
import { uid } from '../lib/utils'

// A few example entries shown on first run so the app isn't empty. The user
// can delete them at any time; they're only inserted once.
export function seedPeople(): Person[] {
  const now = Date.now()
  const base: Omit<Person, 'battle'>[] = [
    {
      id: uid(),
      number: 1,
      name: 'Ana Silva',
      nickname: 'Aninhas',
      relationship: 'sexo',
      types: ['water'],
      country: '620', // Portugal
      ball: 'love',
      legendary: false,
      legendaryCats: [],
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
        howWeMet: 'Conhecemo-nos numa noite no Porto.',
        birthday: '1999-03-14',
        location: 'Porto',
        instagram: 'ana.silva',
        since: '2023-09-20',
      },
      traits: ['Olhar matador', 'Dança bem'],
      notes: 'Melhor da lista, sem dúvida.',
      moments: [{ id: uid(), title: 'Primeira noite', date: '2023-09-20' }],
      favorite: true,
      createdAt: now - 3000,
    },
    {
      id: uid(),
      number: 2,
      name: 'Lucía',
      relationship: 'beijo',
      types: ['fire'],
      country: '724', // Spain
      ball: 'poke',
      legendary: false,
      legendaryCats: [],
      photoIds: [],
      rating: 4,
      stats: {
        humor: 78,
        simpatia: 70,
        lealdade: 60,
        inteligencia: 88,
        carisma: 90,
        confianca: 55,
      },
      about: {
        howWeMet: 'Erasmus em Barcelona.',
        location: 'Barcelona',
        since: '2022-04-02',
      },
      traits: ['Sotaque irresistível'],
      moments: [],
      favorite: false,
      createdAt: now - 2000,
    },
    {
      id: uid(),
      number: 3,
      name: 'Cristina',
      relationship: 'sexo',
      types: ['dark'],
      country: '076', // Brazil
      ball: 'ultra',
      legendary: true,
      legendaryCats: ['milf'],
      photoIds: [],
      rating: 4.5,
      stats: {
        humor: 84,
        simpatia: 75,
        lealdade: 70,
        inteligencia: 86,
        carisma: 98,
        confianca: 65,
      },
      about: {
        howWeMet: 'Numa viagem ao Rio.',
        location: 'Rio de Janeiro',
        since: '2024-02-11',
      },
      traits: ['Experiente', 'Confiança total'],
      notes: 'Lendária. Nem sei como.',
      moments: [{ id: uid(), title: 'Carnaval', date: '2024-02-11' }],
      favorite: false,
      createdAt: now - 1000,
    },
  ]
  return base.map((p) => ({ ...p, battle: initialBattleData(p.stats, p.types) }))
}
