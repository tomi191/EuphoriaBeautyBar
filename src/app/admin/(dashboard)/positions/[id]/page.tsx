import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingForm } from "@/components/admin/listing-form";
import {
  loadFormBenefits,
  loadFormCategories,
  loadFormListing,
} from "@/lib/admin/listing-form-data";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = { title: "Обява" };

/**
 * /admin/positions/new: нова обява; /admin/positions/<номер>: редакция или продължение на чернова.
 * Един адрес за двете: след първата стъпка формата сменя адреса на този на черновата, без да губи
 * попълненото (същата страница, друг номер).
 */
export default async function ListingFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { id } = await params;
  const step = Number((await searchParams).step);
  const listing = id === "new" ? null : await loadFormListing(id);
  if (id !== "new" && !listing) notFound();
  const [categories, benefits] = await Promise.all([
    loadFormCategories(listing?.categoryId),
    loadFormBenefits(),
  ]);
  return (
    <ListingForm
      listing={listing}
      initialStep={
        listing && Number.isInteger(step) && step >= 1 && step <= 6 ? step : 1
      }
      categories={categories}
      benefits={benefits}
      siteUrl={siteConfig.url}
    />
  );
}
