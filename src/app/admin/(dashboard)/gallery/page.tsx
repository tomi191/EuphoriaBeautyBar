import Image from "next/image";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GalleryResourceTag } from "@/components/admin/gallery-resource-tag";

export default async function AdminGalleryPage() {
  const [images, resources] = await Promise.all([
    db.query.galleryImages.findMany({ orderBy: (g, { asc }) => [asc(g.sortOrder)] }),
    db.query.resources.findMany({
      where: (r, { eq }) => eq(r.active, true),
      orderBy: (r, { asc }) => [asc(r.sortOrder)],
    }),
  ]);

  const resOpts = resources.map((r) => ({ id: r.id, name: r.name }));

  return (
    <>
      <PageHeader title="Галерия" subtitle={`${images.length} изображения, организирани по категории.`} />

      <Alert className="mb-6">
        <AlertTitle>Качване на нови</AlertTitle>
        <AlertDescription className="text-sm">
          Качи .webp/.jpg файловете в <code>/public/images/gallery/</code> на сървъра, след което добави запис чрез CLI или DB studio.
          Pluggable image upload (Vercel Blob / UploadThing) ще бъде добавен във втора фаза. Падащото меню под всяка снимка я закача към
          портфолиото на даден изпълнител — клиентите го виждат при записване на час.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        {images.map((img) => (
          <div key={img.id} className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-secondary">
            <Image
              src={img.src}
              alt={img.alt}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 16vw"
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 space-y-1.5 bg-gradient-to-t from-foreground/85 to-transparent p-2 pt-6">
              <p className="text-[10px] uppercase tracking-wider text-background">{img.category}</p>
              <GalleryResourceTag imageId={img.id} resourceId={img.resourceId} resources={resOpts} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
