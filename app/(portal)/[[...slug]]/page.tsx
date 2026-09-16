import { PortalRouter } from "@/src/app/portal-router";

export default async function PortalPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  return <PortalRouter slug={slug ?? []} />;
}
