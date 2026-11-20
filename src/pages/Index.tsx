import { ArrowDownRight, ArrowRight, BadgeCheck, BarChart3, Box, CircleCheck, Leaf, MapPin, ScanLine, ShieldCheck, Sprout, Store, Truck, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import farmHero from "@/assets/farm-hero.jpg";
import { useAuth } from "@/contexts/AuthContext";

const steps = [
  { number: "01", title: "Grown with care", detail: "Every lot begins with a farmer, a field, and a harvest record.", icon: Sprout },
  { number: "02", title: "Handled with trust", detail: "Each handoff is recorded as produce moves through the supply chain.", icon: Truck },
  { number: "03", title: "Known at a glance", detail: "Scan the pack to see where it came from and how it travelled.", icon: ScanLine },
];

const partners = [
  { title: "Farmers", detail: "Create a clear origin record for each harvest lot.", icon: Sprout, mark: "GROW" },
  { title: "Distributors", detail: "Keep every custody handoff connected and visible.", icon: Truck, mark: "MOVE" },
  { title: "Retailers", detail: "Give shoppers a direct path to product provenance.", icon: Store, mark: "SHARE" },
  { title: "Consumers", detail: "Scan a product and explore the story behind it.", icon: UserRound, mark: "KNOW" },
];

export default function Index() {
  const { user } = useAuth();
  return (
    <main className="hl-home">
      <header className="hl-header">
        <Link to="/" className="hl-brand"><span className="hl-brand-mark"><Leaf size={19} /></span><span>harvest<span>link</span></span></Link>
        <nav aria-label="Main navigation" className="hl-nav"><a href="#journey">How it works</a><a href="#provenance">Provenance</a><a href="#network">Our network</a><a href="#questions">Questions</a></nav>
        <div className="hl-header-actions"><Link className="hl-signin" to={user ? "/dashboard" : "/login"}>{user ? "Workspace" : "Sign in"}</Link><Link className="hl-join" to="/signup">Join Harvestlink <ArrowRight size={15} /></Link></div>
      </header>

      <section className="hl-hero">
        <div className="hl-hero-copy">
          <span className="hl-eyebrow"><span className="hl-live-dot" /> GOOD FOOD, FULLY ACCOUNTED FOR</span>
          <h1>A better story<br />behind <em>every bite.</em></h1>
          <p>Harvestlink brings farmers, food distributors, and families closer together with a clear record of every harvest.</p>
          <div className="hl-hero-actions"><Link to="/signup" className="hl-join hl-join-large">Start your journey <ArrowRight size={17} /></Link><a href="#journey" className="hl-text-link">See how it works <ArrowDownRight size={17} /></a></div>
          <div className="hl-proof"><div className="hl-proof-icons"><span>F</span><span>D</span><span>R</span><span>Y</span></div><p><strong>One connected journey</strong><br />from the people who grow it to the people who enjoy it.</p></div>
        </div>
        <div className="hl-hero-visual">
          <img src={farmHero} alt="Rows of fresh crops growing on a farm" />
          <div className="hl-image-wash" />
          <div className="hl-photo-caption"><span>FIELD NOTE · 038</span><strong>Good things grow<br />with good people.</strong><span>Traceable from the very beginning.</span></div>
          <div className="hl-orbit-card"><span className="hl-orbit-icon"><BadgeCheck size={18} /></span><span><strong>Origin verified</strong><small>Farm record confirmed</small></span><CircleCheck size={17} /></div>
          <div className="hl-hero-index">01 <span>/</span> 03</div>
        </div>
        <a href="#journey" className="hl-scroll-cue"><span /> SCROLL TO EXPLORE</a>
      </section>

      <section className="hl-ribbon" aria-label="Harvestlink benefits"><span><ShieldCheck size={16} /> Honest origin records</span><i /><span><Box size={16} /> Clear handoffs</span><i /><span><MapPin size={16} /> Local roots, wider reach</span><i /><span><BarChart3 size={16} /> Fairer visibility</span></section>

      <section className="hl-journey" id="journey">
        <div className="hl-section-intro"><span className="hl-eyebrow">FROM FIELD TO FRONT DOOR</span><h2>One harvest.<br /><em>Every step remembered.</em></h2><p>Food travels through many hands before it reaches your kitchen. Harvestlink makes those steps easier to see and easier to trust.</p></div>
        <div className="hl-step-list">{steps.map(({ number, title, detail, icon: Icon }) => <article className="hl-step" key={number}><span className="hl-step-number">{number}</span><span className="hl-step-icon"><Icon size={22} /></span><div><h3>{title}</h3><p>{detail}</p></div><ArrowDownRight className="hl-step-arrow" size={19} /></article>)}</div>
      </section>

      <section className="hl-origin" id="provenance">
        <div className="hl-origin-image"><img src={farmHero} alt="A farmer tending green crops" /><div className="hl-origin-stamp"><Leaf size={19} /><span>ROOTED IN<br />REAL PLACES</span></div></div>
        <div className="hl-origin-copy"><span className="hl-eyebrow">THE HARVESTLINK PROMISE</span><h2>Trust should have<br />a <em>starting point.</em></h2><p>Every product has a beginning. We help make that beginning visible with accountable records that follow produce through its journey.</p><ul><li><CircleCheck size={17} /> Know where it was grown</li><li><CircleCheck size={17} /> Follow each supply handoff</li><li><CircleCheck size={17} /> Give every partner a clearer view</li></ul><Link to="/signup" className="hl-text-link">Be part of the network <ArrowRight size={16} /></Link></div>
      </section>

      <section className="hl-trace" id="trace">
        <div className="hl-trace-heading"><span className="hl-eyebrow">A CLOSER LOOK</span><h2>See the journey,<br /><em>not just the label.</em></h2><p>A product record brings its growing details and supply handoffs together in one place. Scan a batch QR to see the information available for that lot.</p><Link to="/signup" className="hl-text-link">Start with your harvest <ArrowRight size={16} /></Link></div>
        <div className="hl-trace-card">
          <div className="hl-trace-card-top"><span><ScanLine size={15} /> SAMPLE PRODUCT JOURNEY</span><span className="hl-trace-badge"><BadgeCheck size={13} /> RECORD VIEW</span></div>
          <div className="hl-trace-product"><div className="hl-produce-art"><img src={farmHero} alt="Example crop growing in a field" /></div><div><span className="hl-eyebrow">ILLUSTRATIVE EXAMPLE</span><h3>Harvest lot</h3><p>Origin and movement details, together.</p></div></div>
          <div className="hl-trace-timeline"><div className="hl-timeline-row is-current"><span className="hl-timeline-dot"><Sprout size={13} /></span><div><strong>Harvest recorded</strong><small>Farm origin · crop details</small></div><span className="hl-timeline-tag">ORIGIN</span></div><div className="hl-timeline-row"><span className="hl-timeline-dot"><Box size={13} /></span><div><strong>Lot prepared</strong><small>Batch created · QR connected</small></div><span className="hl-timeline-tag">LOT</span></div><div className="hl-timeline-row"><span className="hl-timeline-dot"><Truck size={13} /></span><div><strong>Custody updated</strong><small>Transfer details · event record</small></div><span className="hl-timeline-tag">HANDOFF</span></div></div>
          <div className="hl-trace-foot"><ShieldCheck size={15} /><span>Each entry stays connected to its lot record.</span><ArrowDownRight size={15} /></div>
        </div>
      </section>

      <section className="hl-roles" id="network">
        <div className="hl-roles-heading"><span className="hl-eyebrow">A SHARED FOOD JOURNEY</span><h2>Every partner has<br /><em>a part to play.</em></h2><p>One connected record helps each person stay close to the details that matter at their step.</p></div>
        <div className="hl-role-grid">{partners.map(({ title, detail, icon: Icon, mark }, index) => <article className="hl-role-card" key={title}><div className="hl-role-card-top"><span>{mark} · 0{index + 1}</span><Icon size={19} /></div><h3>{title}</h3><p>{detail}</p><Link to="/signup" aria-label={`Join Harvestlink as a ${title.toLowerCase()}`}><ArrowRight size={16} /></Link></article>)}</div>
      </section>

      <section className="hl-faq" id="questions">
        <div className="hl-faq-heading"><span className="hl-eyebrow">GOOD TO KNOW</span><h2>Clear answers,<br /><em>before you begin.</em></h2><p>Harvestlink records help make supply-chain details easier to follow. Here’s what to expect.</p></div>
        <div className="hl-faq-list">
          <details><summary>What can I see when I scan a product QR code?<span>+</span></summary><p>The public record can show the product or batch details and the journey information attached to that QR code, including available origin and custody updates.</p></details>
          <details><summary>Does a recorded journey guarantee product quality?<span>+</span></summary><p>A record helps show which details were entered and which events were recorded. Quality still depends on accurate reporting and appropriate checks at each step.</p></details>
          <details><summary>Who can create and update a harvest record?<span>+</span></summary><p>Registered supply-chain participants can use role-specific tools. Some actions also require the participant’s connected, authorized wallet.</p></details>
        </div>
      </section>

      <section className="hl-join-band"><div><span className="hl-eyebrow">GROWING TOGETHER</span><h2>Good food connects us.</h2><p>Build a more transparent journey for the food you grow, move, sell, or bring home.</p></div><Link to="/signup" className="hl-join hl-join-light">Find your place <ArrowRight size={16} /></Link><div className="hl-band-orbit" /></section>

      <footer className="hl-footer"><Link to="/" className="hl-brand"><span className="hl-brand-mark"><Leaf size={19} /></span><span>harvest<span>link</span></span></Link><p>A clearer connection between the field and your table.</p><span>© {new Date().getFullYear()} Harvestlink</span></footer>
    </main>
  );
}
