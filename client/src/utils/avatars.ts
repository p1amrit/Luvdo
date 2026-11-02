export interface CoolAvatar {
  id: string;
  name: string;
  url: string;
  tag: string;
}

export const COOL_AVATARS: CoolAvatar[] = [
  {
    id: 'shadow-ninja',
    name: 'Shadow Ninja',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Shadow',
    tag: 'Stealth'
  },
  {
    id: 'blaze-titan',
    name: 'Blaze Titan',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Blaze',
    tag: 'Fire'
  },
  {
    id: 'luna-cosmic',
    name: 'Luna Cosmic',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna',
    tag: 'Mystic'
  },
  {
    id: 'viper-rogue',
    name: 'Cyber Rogue',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Viper',
    tag: 'Cyber'
  },
  {
    id: 'phoenix-valkyrie',
    name: 'Phoenix Hero',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Phoenix',
    tag: 'Hero'
  },
  {
    id: 'nexus-mecha',
    name: 'Nexus Mecha',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Nexus',
    tag: 'Robot'
  },
  {
    id: 'zane-shinobi',
    name: 'Zane Shinobi',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Zane',
    tag: 'Anime'
  },
  {
    id: 'frost-specter',
    name: 'Frost Specter',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Frost',
    tag: 'Ice'
  },
  {
    id: 'spark-electric',
    name: 'Spark Lightning',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Spark',
    tag: 'Thunder'
  },
  {
    id: 'optimus-droid',
    name: 'Optimus Droid',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Optimus',
    tag: 'Android'
  },
  {
    id: 'neon-aura',
    name: 'Neon Aura',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aura',
    tag: 'Neon'
  },
  {
    id: 'echo-pilot',
    name: 'Echo Pilot',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Echo',
    tag: 'Astro'
  },
  {
    id: 'crown-sovereign',
    name: 'Crown Sovereign',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=King',
    tag: 'Royal'
  },
  {
    id: 'urban-phantom',
    name: 'Urban Phantom',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Rogue',
    tag: 'Gamer'
  },
  {
    id: 'ghost-assassin',
    name: 'Ghost Specter',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Ghost',
    tag: 'Dark'
  },
  {
    id: 'cyber-ace',
    name: 'Cyber Ace',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Cyber',
    tag: 'Tech'
  }
];

export const DEFAULT_AVATAR = COOL_AVATARS[0].url;
