// windowFor е чиста функция (без БД). Но модулът parallel.ts top-level импортва
// "@/lib/db", който чете process.env при зареждане — затова env-ът трябва пръв.
import "./load-env";
import { windowFor } from "../src/lib/booking/parallel";

const t = Date.UTC(2026, 5, 12, 7, 0, 0);
let failures = 0;

function check(label: string, ok: boolean) {
  console.log(`${ok ? "PASS" : "FAIL"} — ${label}`);
  if (!ok) failures++;
}

// Case 1: windowFor(t, 15, 30) → 20 min window starting at t+20min.
const w1 = windowFor(t, 15, 30);
check(
  "windowFor(t, 15, 30) → start=t+20min, end=t+40min (length 20min)",
  w1 !== null && w1.start === t + 20 * 60000 && w1.end === t + 40 * 60000,
);

// Case 2: windowFor(t, 0, 8) → null (8 ≤ 2*5).
const w2 = windowFor(t, 0, 8);
check("windowFor(t, 0, 8) → null", w2 === null);

// Case 3: windowFor(t, 0, 0) → null.
const w3 = windowFor(t, 0, 0);
check("windowFor(t, 0, 0) → null", w3 === null);

if (failures === 0) {
  console.log("\nAll cases PASS.");
  process.exit(0);
} else {
  console.log(`\n${failures} case(s) FAILED.`);
  process.exit(1);
}
