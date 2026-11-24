import http from "node:http";
import type { AddressInfo } from "node:net";

/**
 * Подменено хранилище за тестовете (адресите на Supabase Storage, които ползва @supabase/supabase-js),
 * в паметта, само на 127.0.0.1. Пази правилата, които ни трябват: публичният адрес
 * /object/public/<bucket>/… отговаря само за публично хранилище; всичко друго иска ключа;
 * подписаният адрес иска знака от подписването.
 */
export type FakeStorage = {
  url: string;
  key: string;
  buckets: Map<string, { public: boolean; files: Map<string, { body: Buffer; type: string }> }>;
  close: () => Promise<void>;
};

export async function startFakeStorage(): Promise<FakeStorage> {
  const key = "fake-service-key";
  const buckets: FakeStorage["buckets"] = new Map();
  const tokens = new Map<string, string>(); // знак → "bucket/path"

  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      const u = new URL(req.url ?? "/", "http://x");
      const p = decodeURIComponent(u.pathname);
      const send = (code: number, data: unknown, type = "application/json") => {
        res.writeHead(code, { "content-type": type });
        res.end(Buffer.isBuffer(data) ? data : JSON.stringify(data));
      };
      const notFound = () => send(400, { statusCode: "404", error: "not_found", message: "Object not found" });
      const authed = req.headers.authorization === `Bearer ${key}`;
      const json = () => (body.length ? JSON.parse(body.toString("utf8")) : {});
      const split = (rest: string) => {
        const i = rest.indexOf("/");
        return [rest.slice(0, i), rest.slice(i + 1)] as const;
      };
      let m: RegExpMatchArray | null;

      if ((m = p.match(/^\/storage\/v1\/object\/public\/(.+)$/)) && req.method === "GET") {
        const [b, path] = split(m[1]);
        const bucket = buckets.get(b);
        if (!bucket?.public) return send(400, { statusCode: "404", error: "Bucket not found", message: "Bucket not found" });
        const f = bucket.files.get(path);
        return f ? send(200, f.body, f.type) : notFound();
      }
      if ((m = p.match(/^\/storage\/v1\/object\/sign\/(.+)$/)) && req.method === "GET") {
        const token = u.searchParams.get("token") ?? "";
        if (tokens.get(token) !== m[1]) return send(400, { statusCode: "403", error: "InvalidSignature" });
        const [b, path] = split(m[1]);
        const f = buckets.get(b)?.files.get(path);
        return f ? send(200, f.body, f.type) : notFound();
      }
      if (!authed) return send(400, { statusCode: "403", error: "Unauthorized", message: "invalid signature" });

      if (p === "/storage/v1/bucket" && req.method === "POST") {
        const d = json();
        const id = d.id ?? d.name;
        if (buckets.has(id)) return send(400, { statusCode: "409", error: "Duplicate", message: "The resource already exists" });
        buckets.set(id, { public: Boolean(d.public), files: new Map() });
        return send(200, { name: id });
      }
      if ((m = p.match(/^\/storage\/v1\/bucket\/([^/]+)$/))) {
        const bucket = buckets.get(m[1]);
        if (!bucket) return send(400, { statusCode: "404", error: "Bucket not found", message: "Bucket not found" });
        if (req.method === "GET") return send(200, { id: m[1], name: m[1], public: bucket.public });
        if (req.method === "PUT") {
          bucket.public = Boolean(json().public);
          return send(200, { message: "Successfully updated" });
        }
      }
      if ((m = p.match(/^\/storage\/v1\/object\/sign\/([^/]+)$/)) && req.method === "POST") {
        const d = json();
        return send(200, (d.paths as string[]).map((path) => {
          const token = Math.random().toString(36).slice(2);
          tokens.set(token, `${m![1]}/${path}`);
          return { path, signedURL: `/object/sign/${m![1]}/${path}?token=${token}`, error: null };
        }));
      }
      if ((m = p.match(/^\/storage\/v1\/object\/([^/]+)$/)) && req.method === "DELETE") {
        const bucket = buckets.get(m[1]);
        const removed = ((json().prefixes as string[]) ?? []).filter((path) => bucket?.files.delete(path));
        return send(200, removed.map((name) => ({ name })));
      }
      if ((m = p.match(/^\/storage\/v1\/object\/(.+)$/))) {
        const [b, path] = split(m[1]);
        const bucket = buckets.get(b);
        if (!bucket) return send(400, { statusCode: "404", error: "Bucket not found", message: "Bucket not found" });
        if (req.method === "GET") {
          const f = bucket.files.get(path);
          return f ? send(200, f.body, f.type) : notFound();
        }
        if (req.method === "POST" || req.method === "PUT") {
          if (bucket.files.has(path) && req.method === "POST" && req.headers["x-upsert"] !== "true") {
            return send(400, { statusCode: "409", error: "Duplicate", message: "The resource already exists" });
          }
          bucket.files.set(path, { body, type: String(req.headers["content-type"] ?? "application/octet-stream") });
          return send(200, { Id: path, Key: `${b}/${path}` });
        }
      }
      send(404, { error: "unknown route" });
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    key,
    buckets,
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}
