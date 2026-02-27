const API_KEY = "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";

async function testOpenRouter() {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      // optional but recommended by OpenRouter
      "HTTP-Referer": "http://localhost",
      "X-Title": "openrouter-test"
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "user", content: "Say hello in one word." }
      ]
    })
  });

  const data = await res.json();
  console.log(data);
}

testOpenRouter();