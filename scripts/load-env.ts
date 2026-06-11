// Зарежда env за standalone скриптове (tsx). Next.js чете .env.local сам, но
// голият dotenv/config зарежда САМО .env — а реалният Supabase DATABASE_URL
// живее в .env.local (.env още носи стария file:./local.db). Редът е важен:
// .env.local първи (dotenv не override-ва вече зададени променливи).
// Импортирай този модул ПРЕДИ "@/lib/db" — db чете process.env при import.
import { config } from "dotenv";

config({ path: ".env.local" });
config();
