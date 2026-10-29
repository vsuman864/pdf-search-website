
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./App.css";

function App() {
  const [search, setSearch] = useState("");
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

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
        !file.name.toLowerCase().endsWith(".pdf") ||
        file.size > 10 * 1024 * 1024
    );

    if (invalid) {
      setMessage("Sirf PDF files, maximum 10 MB per file.");
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

    setMessage("PDF upload ho gayi!");
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
    link.click();
    URL.revokeObjectURL(url);
  }

  const results = pdfs.filter((pdf) =>
    pdf.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app">
      <header>
        <h2>PDF Finder</h2>
        <p>Search. Find. Download.</p>
      </header>

      <main>
        <h1>Find Your PDF</h1>
        <p>PDF upload karo aur baad mein search karke download karo.</p>

        <label htmlFor="pdf-upload">Import PDF files</label>
        <input
          id="pdf-upload"
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={handleUpload}
          disabled={uploading}
        />

        {uploading && <p>PDF upload ho rahi hai...</p>}
        {message && <p role="status">{message}</p>}

        <input
          type="search"
          placeholder="PDF ka naam search karo..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {loading ? (
          <p>PDFs load ho rahi hain...</p>
        ) : (
          <>
            <p>{results.length} results found</p>

            {results.map((pdf) => (
              <div className="pdf-card" key={pdf.id}>
                <span>📄</span>
                <strong>{pdf.name}</strong>
                <button onClick={() => downloadPdf(pdf.file)}>
                  Download
                </button>
              </div>
            ))}

            {results.length === 0 && <p>Koi PDF nahi mili.</p>}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
