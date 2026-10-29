
import { useState } from "react";
import "./App.css";

function App() {
  const [search, setSearch] = useState("");
  const [pdfs, setPdfs] = useState([
    { id: 1, name: "SSC CGL 2026", file: "ssc-cgl.pdf", url: "/pdfs/ssc-cgl.pdf" },
    { id: 2, name: "Rajasthan Computer Instructor", file: "computer-instructor.pdf", url: "/pdfs/computer-instructor.pdf" },
    { id: 3, name: "Java Programming Notes", file: "java-notes.pdf", url: "/pdfs/java-notes.pdf" },
  ]);

  function handleUpload(event) {
    const files = Array.from(event.target.files || []);
    const newPdfs = files
      .filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))
      .map((file) => ({
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        name: file.name.replace(/\.pdf$/i, ""),
        file: file.name,
        url: URL.createObjectURL(file),
      }));

    setPdfs((previous) => [...previous, ...newPdfs]);
    event.target.value = "";
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
        <p>Apni PDF upload karo aur phir search karke download karo.</p>

        <label htmlFor="pdf-upload">📤 Import PDF files</label>
        <input
          id="pdf-upload"
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={handleUpload}
        />

        <input
          type="search"
          placeholder="PDF ka naam likho..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <p>{results.length} results found</p>

        {results.map((pdf) => (
          <div className="pdf-card" key={pdf.id}>
            <span>📄</span>
            <strong>{pdf.name}</strong>
            <a href={pdf.url} download={pdf.file}>
              Download
            </a>
          </div>
        ))}

        {results.length === 0 && <p>Koi PDF nahi mili.</p>}
      </main>
    </div>
  );
}

export default App;
