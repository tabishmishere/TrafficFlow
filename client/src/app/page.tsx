import Link from "next/link";
import { ArrowRight, Check, Gauge, KeyRound, Route } from "lucide-react";
import { PublicHeader } from "@/components/ui";

export default function Home() {
  return (
    <main className="public-page">
      <PublicHeader />
      <section className="hero">
        <div>
          <span className="eyebrow"><span className="eyebrow-dot" /> API GATEWAY &amp; OBSERVABILITY</span>
          <h1>Your APIs.<br />One clear view.</h1>
          <p className="hero-copy">
            Route API traffic through a single gateway, monitor performance, manage access,
            and understand what&apos;s happening across your backend services.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/register">Get started <ArrowRight size={15} /></Link>
            <Link className="button button-secondary" href="/login">Log in</Link>
          </div>
          <p className="hero-note">A clearer way to work with every API you own.</p>
        </div>
        <div className="preview-window" aria-label="Illustrative TrafficFlow dashboard preview">
          <div className="preview-topbar">
            <div className="window-dots"><span /><span /><span /></div>
            <span className="preview-label">TRAFFICFLOW / OVERVIEW</span>
            <span className="live-pill"><span /> SAMPLE</span>
          </div>
          <div className="preview-body">
            <div className="preview-heading"><strong>API overview</strong><span className="preview-label">Last 24 hours</span></div>
            <div className="preview-stats">
              <div className="preview-stat"><span>Requests</span><strong>267.8K</strong><small>+12.8%</small></div>
              <div className="preview-stat"><span>Success rate</span><strong>99.82%</strong><small>+0.12%</small></div>
              <div className="preview-stat"><span>Avg. latency</span><strong>108 ms</strong><small>−8 ms</small></div>
            </div>
            <div className="preview-requests">
              <div className="tiny-heading">RECENT REQUESTS</div>
              <div className="tiny-request"><b>POST</b><span>/v1/charges</span><small>201 · 86 ms</small></div>
              <div className="tiny-request"><b>GET</b><span>/v2/products</span><small>200 · 71 ms</small></div>
              <div className="tiny-request"><b>PATCH</b><span>/v1/users/:id</span><small>200 · 214 ms</small></div>
            </div>
          </div>
        </div>
      </section>
      <div className="feature-strip" aria-label="Platform capabilities">
        <span><Route size={13} /> One gateway for your APIs</span>
        <span><Gauge size={13} /> Understand performance</span>
        <span><KeyRound size={13} /> Keep access in view</span>
        <span><Check size={13} /> Built for developers</span>
      </div>
    </main>
  );
}
