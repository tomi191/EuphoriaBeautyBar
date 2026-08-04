import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { GalleryUploadForm } from "@/components/admin/gallery-upload-form";
import { GalleryImageCard } from "@/components/admin/gallery-image-card";

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
      <PageHeader
        title="Галерия"
        subtitle={`${images.length} изображения. Качи нови, задай категория и описание — появяват се веднага на сайта. Падащото меню „портфолио" закача снимка към изпълнител при записване на час.`}
      />

      <GalleryUploadForm />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {images.map((img) => (
          <GalleryImageCard
            key={img.id}
            image={{
              id: img.id,
              src: img.src,
              alt: img.alt,
              category: img.category,
              description: img.description,
              resourceId: img.resourceId,
            }}
            resources={resOpts}
          />
        ))}
      </div>
    </>
  );
}
