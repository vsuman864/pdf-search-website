import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./App.css";
import { useAuth } from "./AuthGate";

const NAV_ITEMS = [
  { id: "home", label: "Home" },
  { id: "library", label: "Browse PDFs" },
  { id: "upload", label: "Upload" },
  { id: "about", label: "About" },
];

function App() {
  const [search, setSearch] = useState("");
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState("home");
  const { session, openAuth, logout } = useAuth();
  const [purchased, setPurchased] = useState([]); // kharidi hui PDFs ki ids
  const [busyId, setBusyId] = useState(null);

  function goTo(id) {
    setActive(id);
    setMenuOpen(false);
  }

  async function loadPdfs() {
    setLoading(true);

    const { data, error } = await supabase
      .from("pdfs")
      .select("id, title, file_path, price_paise")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("PDF load nahi hui: " + error.message);
      setPdfs([]);
    } else {
      setPdfs(
        (data || []).map((row) => ({
          id: row.id,
          name: row.title,
          file: row.file_path,
          price: row.price_paise,
        }))
      );
      setMessage("");
    }

    setLoading(false);
  }

  async function loadPurchases() {
    if (!session) {
      setPurchased([]);
      return;
    }
    const { data } = await supabase
      .from("purchases")
      .select("pdf_id")
      .eq("status", "paid");
    setPurchased((data || []).map((row) => row.pdf_id));
  }

  useEffect(() => {
    loadPdfs();
  }, []);

  useEffect(() => {
    loadPurchases();
  }, [session?.user?.id]);

  async function handleUpload(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (!files.length || !session) return;

    const invalid = files.find(
      (file) =>
        file.type !== "application/pdf" ||
        file.size > 10 * 1024 * 1024
    );

    if (invalid) {
      setMessage("Sirf PDF files upload karo (maximum 10 MB per file).");
      return;
    }

    setUploading(true);
    setMessage("");

    for (const file of files) {
      const safeName = file.name
        .normalize("NFKD")
        .replace(/[^a-zA-Z0-9._-]/g, "_");

      const path = `${Date.now()}-${safeName}`;

      const { error } = await supabase.storage
        .from("pdf-files")
        .upload(path, file, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (error) {
        setMessage("Upload error: " + error.message);
        setUploading(false);
        return;
      }

      const { error: dbError } = await supabase.from("pdfs").insert({
        title: file.name.replace(/\.pdf$/i, "").replace(/_/g, " "),
        file_path: path,
        uploaded_by: session.user.id,
      });

      if (dbError) {
        setMessage("Upload error: " + dbError.message);
        setUploading(false);
        return;
      }
    }

    setMessage("PDF successfully upload ho gayi!");
    await loadPdfs();
    setUploading(false);
  }

  // Razorpay ka checkout script ek baar load karo
  function loadRazorpay() {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  // Paid PDF ka 60 second wala temporary link maango aur download karo
  async function startDownload(pdf) {
    const { data, error } = await supabase.functions.invoke("get-download-url", {
      body: { pdf_id: pdf.id },
    });

    if (error || !data?.url) {
      setMessage("Download error: link nahi ban paya. Thodi der baad try karo.");
      return;
    }

    const link = document.createElement("a");
    link.href = data.url;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  // Button dabane par: login -> payment -> download
  async function handlePdfAction(pdf) {
    if (!session) {
      openAuth("login");
      return;
    }

    setBusyId(pdf.id);
    setMessage("");

    try {
      if (purchased.includes(pdf.id)) {
        await startDownload(pdf);
        return;
      }

      const loaded = await loadRazorpay();
      if (!loaded) {
        setMessage("Payment window load nahi hui. Internet check karo.");
        return;
      }

      const { data: order, error } = await supabase.functions.invoke("swift-worker", {
        body: { pdf_id: pdf.id },
      });

      if (error || !order) {
        setMessage("Order nahi ban paya. Thodi der baad try karo.");
        return;
      }

      if (order.already_paid) {
        await loadPurchases();
        await startDownload(pdf);
        return;
      }

      await new Promise((resolve) => {
        const rzp = new window.Razorpay({
          key: order.key_id,
          amount: order.amount,
          currency: order.currency,
          order_id: order.order_id,
          name: "PDF Finder",
          description: order.title,
          prefill: { email: session.user.email },
          theme: { color: "#e9a23b" },
          handler: async (response) => {
            const { error: verifyError } = await supabase.functions.invoke(
              "verify-payment",
              { body: response }
            );

            if (verifyError) {
              setMessage(
                "Payment ho gaya par verify nahi hua. Page refresh karke dekho."
              );
            } else {
              await loadPurchases();
              setMessage("Payment successful! Download shuru ho raha hai.");
              await startDownload(pdf);
            }
            resolve();
          },
          modal: { ondismiss: () => resolve() },
        });

        rzp.on("payment.failed", () => {
          setMessage("Payment fail ho gaya. Dobara try karo.");
        });

        rzp.open();
      });
    } finally {
      setBusyId(null);
    }
  }

  const results = pdfs.filter((pdf) =>
    pdf.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`app ${darkMode ? "dark" : "light"}`}>
      <nav className="nav">
        <div className="nav-inner">
          <a className="nav-brand" href="#home" onClick={() => goTo("home")}>
            <span className="nav-logo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <span>PDF Finder</span>
          </a>

          <div className={`nav-links ${menuOpen ? "open" : ""}`}>
            {NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={active === item.id ? "active" : ""}
                onClick={() => goTo(item.id)}
              >
                {item.label}
              </a>
            ))}
            {!session && (
              <button
                className="nav-mobile-only"
                onClick={() => {
                  setMenuOpen(false);
                  openAuth("login");
                }}
              >
                Log in
              </button>
            )}
          </div>

          <div className="nav-right">
            <button
              className="nav-theme"
              onClick={() => setDarkMode((current) => !current)}
              aria-label="Toggle light and dark theme"
            >
              {darkMode ? "☀️ Light" : "🌙 Dark"}
            </button>
            {session ? (
              <button className="nav-logout" onClick={logout}>
                Log out
              </button>
            ) : (
              <>
                <button className="nav-login" onClick={() => openAuth("login")}>
                  Log in
                </button>
                <button className="nav-cta" onClick={() => openAuth("signup")}>
                  Sign up
                </button>
              </>
            )}
            <button
              className="nav-burger"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>
      </nav>

      <main className="main-content">
        <section className="hero" id="home">
          <div className="eyebrow">
            <span className="status-dot" />
            YOUR PERSONAL DOCUMENT LIBRARY
          </div>

          <h1>
            Find your next
            <br />
            <span>great resource.</span>
          </h1>

          <p className="hero-description">
            Upload, discover and download your study PDFs in one simple place.
          </p>

          <div className="search-box">
            <span className="search-icon" aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Search PDFs by name..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search PDFs"
            />
            {search && (
              <button
                className="clear-search"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </section>

        <section className="library-section" id="library">
          <div className="section-heading">
            <div>
              <h2>Your library</h2>
              <p>Browse your uploaded documents.</p>
            </div>
            <span className="result-count">
              {loading ? "Loading..." : `${results.length} PDFs`}
            </span>
          </div>

          {session ? (
          <label
            id="upload"
            className={`upload-panel ${uploading ? "uploading" : ""}`}
          >
            <span className="upload-icon">{uploading ? "⏳" : "＋"}</span>
            <span className="upload-copy">
              <strong>{uploading ? "Uploading PDFs..." : "Add PDF documents"}</strong>
              <small>Choose PDF files · Max 10 MB each</small>
            </span>
            <span className="upload-action">
              {uploading ? "Please wait" : "Browse files"}
            </span>
            <input
              type="file"
              accept=".pdf,application/pdf"
              multiple
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
          ) : (
            <div id="upload" className="upload-panel locked">
              <span className="upload-icon">🔒</span>
              <span className="upload-copy">
                <strong>Log in to upload PDFs</strong>
                <small>Browsing is free. Uploading needs an account.</small>
              </span>
              <button className="upload-action" onClick={() => openAuth("login")}>
                Log in
              </button>
            </div>
          )}

          {message && (
            <div className="notice" role="status">
              {message}
            </div>
          )}

          {loading ? (
            <div className="empty-state">
              <span className="empty-icon">◌</span>
              <h3>Loading your library</h3>
              <p>Fetching your PDFs from cloud storage...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="pdf-grid">
              {results.map((pdf) => {
                const bought = purchased.includes(pdf.id);
                const price = pdf.price / 100;
                return (
                  <article className="pdf-card" key={pdf.id}>
                    <div className="card-top">
                      <div className="file-icon">PDF</div>
                      <span className="file-type">
                        {bought ? "PURCHASED" : `₹${price}`}
                      </span>
                    </div>
                    <h3 title={pdf.name}>{pdf.name}</h3>
                    <p className="file-description">
                      {bought
                        ? "Purchased · Download anytime"
                        : `Pay ₹${price} once · Download instantly`}
                    </p>
                    <div className="card-actions">
                      <button
                        className="download-button"
                        disabled={busyId === pdf.id}
                        onClick={() => handlePdfAction(pdf)}
                      >
                        {busyId === pdf.id ? (
                          "Please wait..."
                        ) : bought ? (
                          <>
                            <span aria-hidden="true">↓</span> Download PDF
                          </>
                        ) : session ? (
                          <>Pay ₹{price} &amp; Download</>
                        ) : (
                          <>Log in to buy · ₹{price}</>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">▤</span>
              <h3>{search ? "No matching PDFs" : "Your library is empty"}</h3>
              <p>
                {search
                  ? "Try another name or clear your search."
                  : "Upload a PDF above and it will appear here."}
              </p>
              {search && (
                <button className="text-button" onClick={() => setSearch("")}>
                  Clear search
                </button>
              )}
            </div>
          )}
        </section>

        <section className="about-section" id="about">
          <h2>About PDF Finder</h2>
          <p>
            PDF Finder is a simple place to upload, search and download your study
            PDFs. Log in once and your library is ready on any device.
          </p>
        </section>

        <footer className="footer">
          <span>PDF Finder</span>
          <span>Made for learning.</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
