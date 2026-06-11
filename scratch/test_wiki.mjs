const randomTerm = "Software engineering";
const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(randomTerm)}&format=json`;

async function test() {
  try {
    const res = await fetch(searchUrl);
    const data = await res.json();
    const hits = data?.query?.search || [];
    console.log("Found Wikipedia hits:", hits.length);
    if (hits.length > 0) {
      const title = hits[0].title;
      console.log("Chosen Title:", title);
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
      const res2 = await fetch(summaryUrl);
      const data2 = await res2.json();
      console.log("Title of summary:", data2.title);
      console.log("Extract of summary:", data2.extract ? data2.extract.substring(0, 150) + "..." : "No extract");
    }
  } catch (err) {
    console.error("Test failed:", err);
  }
}
test();
