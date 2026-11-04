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

  function goTo(id) {
    setActive(id);
    setMenuOpen(false);
  }

  async function loadPdfs() {
    setLoading(true);

    const { data, error } = await supabase.storage
      .from("pdf-files")
      .list("", {
        limit: 100,
        sortBy: { column: "name", order: "asc" },
      });

    if (error) {
      setMessage("PDF load nahi hui: " + error.message);
      setPdfs([]);
    } else {
      setPdfs(
        (data || [])
          .filter((file) => file.name.toLowerCase().endsWith(".pdf"))
          .map((file) => ({
            id: file.id || file.name,
            name: file.name.replace(/\.pdf$/i, ""),
            file: file.name,
          }))
      );
      setMessage("");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadPdfs();
  }, []);

  async function handleUpload(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (!files.length) return;

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
    }

    setMessage("PDF successfully upload ho gayi!");
    await loadPdfs();
    setUploading(false);
  }

  async function downloadPdf(fileName) {
    const { data, error } = await supabase.storage
      .from("pdf-files")
      .download(fileName);

    if (error) {
      setMessage("Download error: " + error.message);
      return;
    }

    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName.split("/").pop();
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
                <small>Browsing and downloading is free. Uploading needs an account.</small>
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
              {results.map((pdf) => (
                <article className="pdf-card" key={pdf.id}>
                  <div className="card-top">
                    <div className="file-icon">PDF</div>
                    <span className="file-type">DOCUMENT</span>
                  </div>
                  <h3 title={pdf.name}>{pdf.name}</h3>
                  <p className="file-description">
                    PDF document · Ready to download
                  </p>
                  <div className="card-actions">
                    <button
                      className="download-button"
                      onClick={() => downloadPdf(pdf.file)}
                    >
                      <span aria-hidden="true">↓</span> Download PDF
                    </button>
                  </div>
                </article>
              ))}
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
