export interface TeamMember {
  slug: string;
  name: string;
  role: string;
  bio: string;
  image: string;
  experience: string;
  specialties: string[];
}

export const team: TeamMember[] = [
  {
    slug: "snezhana-sableva",
    name: "Снежана Саблева",
    role: "Основател · Главен стилист",
    bio:
      "Започва кариерата си през 2000 г. — над две десетилетия зад стола са моят учител. През 2023 г. създавам Euphoria като място, в което всеки човек получава прическа, направена за неговия живот, а не за каталог. Работя с Goldwell Kerasilk, Montibello и Nashi Argan, защото искам резултатът да издържи дълго, не само до първото миене.",
    image: "/images/services/hair.jpg",
    experience: "25+ години",
    specialties: [
      "Балаяж и омбре",
      "Кератинови терапии",
      "Официални прически",
      "Корекция на цвят",
      "Грижа за увредена коса",
    ],
  },
];
