import Image from 'next/image';

export default function NotFound() {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#020617] px-6 py-16 text-center">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_15%,rgba(0,188,242,0.16),transparent_38%),linear-gradient(180deg,#071426_0%,#020617_65%,#000_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-20 [background-image:linear-gradient(rgba(0,188,242,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(0,188,242,0.12)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
      />

      <section className="w-full max-w-3xl border border-cyan-300/20 bg-slate-950/65 px-6 py-12 shadow-[0_0_80px_rgba(0,188,242,0.12)] backdrop-blur-xl sm:px-12 sm:py-16">
        <Image
          src="/orion-logo-v1.webp"
          alt="ORION 1.0"
          width={180}
          height={180}
          priority
          className="mx-auto h-24 w-24 object-contain sm:h-28 sm:w-28"
        />

        <p className="mt-8 font-mono text-xs font-semibold uppercase tracking-[0.34em] text-cyan-300">
          System status
        </p>
        <h1 className="mt-3 font-display text-8xl font-bold tracking-[-0.08em] text-white sm:text-9xl">
          404
        </h1>
        <div className="mx-auto mt-5 h-px w-24 bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
        <h2 className="mt-7 font-display text-2xl font-semibold text-slate-100 sm:text-3xl">
          Page not found
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-400 sm:text-base">
          Requested page is unavailable.
        </p>
      </section>
    </main>
  );
}
