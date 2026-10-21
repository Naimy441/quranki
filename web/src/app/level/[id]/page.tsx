import { LevelDetailClient } from './level-client';

export default async function LevelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LevelDetailClient id={id} />;
}
