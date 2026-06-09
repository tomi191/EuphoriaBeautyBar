export interface MontibelloProduct {
  slug: string;
  name: string;
  line: string;
  shortDescription: string;
  description: string;
  benefits: string[];
  forHairType: string;
  color: string;
  productImage: string;
}

export const montibelloProducts: MontibelloProduct[] = [
  {
    slug: "hop-ultra-repair",
    name: "HOP Ultra Repair",
    line: "Hair Oil Plus",
    shortDescription: "Интензивно възстановяване за увредена коса",
    description:
      "Концентрирана терапия с растителни масла, която прониква дълбоко в косъма и възстановява структурата отвътре навън. Подходяща за химически третирана и силно увредена коса.",
    benefits: [
      "Възстановява увредени косъмчета",
      "Дълбоко подхранване с есенциални масла",
      "Намалява накъсаността и сплетеността",
      "Възвръща естествения блясък",
    ],
    forHairType: "Увредена, химически третирана",
    color: "oklch(0.32 0.18 295)",
    productImage: "/images/montibello/repair-shampoo.png",
  },
  {
    slug: "hop-ultra-volume",
    name: "HOP Ultra Volume",
    line: "Hair Oil Plus",
    shortDescription: "Лек обем без утежняване",
    description:
      "Леката формула с протеини изгражда обем от корена и придава пълнота, без да притежава косата. Идеална за тънка и склонна към омазняване коса.",
    benefits: [
      "Видим обем от първа употреба",
      "Без утежняване на корените",
      "Защита срещу омазняване",
      "Дълготрайно задържане на формата",
    ],
    forHairType: "Тънка, без обем",
    color: "oklch(0.83 0.08 168)",
    productImage: "/images/montibello/volume-shampoo.png",
  },
  {
    slug: "hop-ultra-silver",
    name: "HOP Ultra Silver",
    line: "Hair Oil Plus",
    shortDescription: "Неутрализира жълти оттенъци",
    description:
      "Виолетови пигменти, които неутрализират нежеланите топли оттенъци в руса, бяла или сребриста коса. Запазва студения, блестящ цвят.",
    benefits: [
      "Премахва жълти оттенъци",
      "Подсилва студения тон",
      "Подхранване с антиоксиданти",
      "Предпазва от UV избледняване",
    ],
    forHairType: "Руса, бяла, сребриста",
    color: "oklch(0.55 0.22 295)",
    productImage: "/images/montibello/silver-shampoo.png",
  },
  {
    slug: "hop-ultra-hydration",
    name: "HOP Ultra Hydration",
    line: "Hair Oil Plus",
    shortDescription: "Дълбока хидратация за суха коса",
    description:
      "Хиалуронова киселина и растителни екстракти, които възстановяват водния баланс на косата. Препоръчителна за суха, груба и обезводнена коса.",
    benefits: [
      "Възстановява воден баланс",
      "Мекота и копринен ефект",
      "Лесно разресване",
      "Защита от термично увреждане",
    ],
    forHairType: "Суха, груба, обезводнена",
    color: "oklch(0.65 0.10 200)",
    productImage: "/images/montibello/hydration-shampoo.png",
  },
  {
    slug: "hop-ultra-colour",
    name: "HOP Ultra Colour",
    line: "Hair Oil Plus",
    shortDescription: "Защита и блясък за боядисана коса",
    description:
      "Специализирана грижа за боядисана коса, която удължава трайността на цвета и защитава срещу избледняване. С UV филтри и антиоксиданти.",
    benefits: [
      "Удължава трайността на цвета",
      "UV защита",
      "Интензивен блясък",
      "Подхранване след боядисване",
    ],
    forHairType: "Боядисана, цветна",
    color: "oklch(0.45 0.22 295)",
    productImage: "/images/montibello/repair-rinse.png",
  },
  {
    slug: "hop-ultra-blonde",
    name: "HOP Ultra Blonde",
    line: "Hair Oil Plus",
    shortDescription: "Премиум грижа за руси нюанси",
    description:
      "Луксозна терапия за руса коса (естествена или изсветлена). Възстановява структурата след агресивно избелване и пази златистите оттенъци.",
    benefits: [
      "Възстановява след избелване",
      "Запазва златистите тонове",
      "Намалява чупливостта",
      "Здравословен блясък",
    ],
    forHairType: "Руса, изсветлена",
    color: "oklch(0.93 0.04 168)",
    productImage: "/images/montibello/blonde-shampoo.png",
  },
];

export function getMontibelloProduct(slug: string) {
  return montibelloProducts.find((p) => p.slug === slug);
}
