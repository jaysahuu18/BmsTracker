document.getElementById("runBtn").addEventListener("click", async () => {
  const output = document.getElementById("output");
  output.innerHTML = "⏳ Fetching...";

  try {
    const res = await fetch("http://localhost:5000/fetch-city/hyderabad");
    const data = await res.json();
    output.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
  } catch (err) {
    output.innerHTML = "❌ Error: " + err.message;
  }
});
