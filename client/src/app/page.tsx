import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicHeader } from "@/components/ui";

export default function Home() {
  return (
    <main className="public-page">
      <PublicHeader />
      <section className="hero">
        <div>
          <span className="eyebrow"><span className="eyebrow-dot" /> API GATEWAY</span>
          <h1>Your APIs.<br />One clear view.</h1>
          <p className="hero-copy">
            Route requests through one gateway. Track traffic, health, and limits in one place.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/register">Get started <ArrowRight size={15} /></Link>
            <Link className="button button-secondary" href="/login">Log in</Link>
          </div>
        </div>
        <div className="preview-window" aria-label="How TrafficFlow routes requests">
          <div className="preview-topbar">
            <div className="window-dots"><span /><span /><span /></div>
            <span className="preview-label">REQUEST FLOW</span>
            <span className="live-pill"><span /> GATEWAY</span>
          </div>
          <div className="preview-body">
            <div className="flow-steps">
              <div className="flow-step"><span>1</span><strong>Your app</strong><small>Sends a request</small></div>
              <div className="flow-step"><span>2</span><strong>TrafficFlow</strong><small>Checks key and limit</small></div>
              <div className="flow-step"><span>3</span><strong>Your API</strong><small>Responds; traffic is logged</small></div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
