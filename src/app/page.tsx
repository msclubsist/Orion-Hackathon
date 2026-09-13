import { PublicHome } from '@/components/home/PublicHome';
import { HomeJsonLd } from '@/components/seo/JsonLd';
import { features } from '@/lib/features';

export default function Home() {
  return (
    <>
      <HomeJsonLd />
      <PublicHome registrationEnabled={features.registration} />
    </>
  );
}
