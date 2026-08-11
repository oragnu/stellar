import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { SelfHostSection } from "@/components/landing/SelfHostSection";
import { Footer } from "@/components/landing/Footer";

export function Landing() {
  const handleSignIn = () => {
    window.location.href = "/api/v1/auth/github/login";
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)]">
      <Nav onSignIn={handleSignIn} />
      <Hero onSignIn={handleSignIn} />
      <FeatureGrid />
      <SelfHostSection />
      <Footer />
    </div>
  );
}
