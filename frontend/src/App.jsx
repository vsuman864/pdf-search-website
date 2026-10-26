import { useState } from "react";
import "./App.css";

function App() {
  const [search, setSearch] = useState("");

  const pdfs = [
    { id: 1, name: "SSC CGL 2026", file: "ssc-cgl.pdf" },
    { id: 2, name: "Rajasthan Computer Instructor", file: "computer-instructor.pdf" },
    { id: 3, name: "Java Programming Notes", file: "java-notes.pdf" },
  ];

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
        <p>Apni PDF ka naam search karo.</p>

        <input
          type="search"
          placeholder="PDF ka naam likho..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <p>{results.length} results found</p>

        {results.map((pdf) => (
          <div className="pdf-card" key={pdf.id}>
            <span>📄</span>
            <strong>{pdf.name}</strong>
            <a href={`/pdfs/${pdf.file}`} download>
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