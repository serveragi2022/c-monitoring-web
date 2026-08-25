import { notFound } from "next/navigation";
import { getCollectionTypeByRoute } from "@/lib/collection-config";
import CollectionForm from "@/components/CollectionForm";

export default async function CollectionTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const config = getCollectionTypeByRoute(type);

  if (!config) {
    notFound();
  }

  return <CollectionForm typeRoute={type} />;
}
