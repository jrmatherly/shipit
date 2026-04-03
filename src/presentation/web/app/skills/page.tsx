import { notFound } from 'next/navigation';
import { getSkills } from '@/lib/skills';
import { SkillsPageClient } from '@/components/features/skills';
import { getFeatureFlags } from '@/lib/feature-flags';

export default async function SkillsPage() {
  const flags = await getFeatureFlags();
  if (!flags.skills) notFound();

  const skills = await getSkills();

  return <SkillsPageClient skills={skills} />;
}
