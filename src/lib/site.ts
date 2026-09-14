export const site = {
  title: '让我留在你身边',
  description: 'Ricardo 的旅行影像与沿途笔记。以照片记录城市、光线和抵达过的地方。',
  author: 'Ricardo',
  bio: '吾十有五，而志于学',
  email: 'ricardo.luo@icloud.com',
  url: 'https://ricardolsw.github.io',
  social: [
    { label: 'X / Twitter', href: 'https://twitter.com/LswRicardo' },
    { label: 'GitHub', href: 'https://github.com/RicardoLSW' },
    { label: 'Instagram', href: 'https://instagram.com/_ricardolsw' },
  ],
} as const;

export const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Shanghai',
  }).format(date);

export const toPathSegments = (path: string) =>
  path.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
