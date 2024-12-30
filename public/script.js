const backendUrl = "https://ai-digital-marketing-tool-80877ad1ff66.herokuapp.com"; // Backend URL

// 1. AI Content Generation
document.getElementById("generate-content").addEventListener("click", async () => {
    const prompt = document.getElementById("content-prompt").value;
    const output = document.getElementById("content-output");
    output.innerText = "Generating content...";
    try {
        const response = await fetch(`${backendUrl}/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt }),
        });
        const data = await response.json();
        output.innerText = data.content || "Error generating content.";
    } catch (error) {
        output.innerText = `Error: ${error.message}`;
    }
});

// 2. SEO Optimization
document.getElementById("analyze-seo").addEventListener("click", async () => {
    const url = document.getElementById("seo-url").value;
    const output = document.getElementById("seo-output");
    output.innerText = "Analyzing SEO...";
    try {
        const response = await fetch(`${backendUrl}/seo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
        });
        const data = await response.json();
        output.innerText = `Performance Score: ${data.performance_score}` || "Error analyzing SEO.";
    } catch (error) {
        output.innerText = `Error: ${error.message}`;
    }
});

// 3. Ad Campaign Generator
document.getElementById("generate-ad").addEventListener("click", async () => {
    const product = document.getElementById("product").value;
    const audience = document.getElementById("audience").value;
    const goal = document.getElementById("goal").value;
    const output = document.getElementById("ad-output");
    output.innerText = "Generating ad...";
    try {
        const response = await fetch(`${backendUrl}/ad-campaign`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ product, audience, goal }),
        });
        const data = await response.json();
        output.innerText = data.ad_copy || "Error generating ad.";
    } catch (error) {
        output.innerText = `Error: ${error.message}`;
    }
});

// 4. AI Chatbot
const chatbotToggle = document.querySelector(".chatbot-toggle");
const chatbot = document.querySelector(".chatbot");
const chatbotMessages = document.getElementById("chatbot-messages");
const chatbotInput = document.getElementById("chatbot-input");
const chatbotSend = document.getElementById("chatbot-send");

chatbotToggle.addEventListener("click", () => {
    chatbot.style.display = chatbot.style.display === "flex" ? "none" : "flex";
});

chatbotSend.addEventListener("click", async () => {
    const userMessage = chatbotInput.value;
    chatbotMessages.innerHTML += `<div><strong>You:</strong> ${userMessage}</div>`;
    chatbotInput.value = "";
    try {
        const response = await fetch(`${backendUrl}/chatbot`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userMessage }),
        });
        const data = await response.json();
        chatbotMessages.innerHTML += `<div><strong>Bot:</strong> ${data.reply}</div>`;
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    } catch (error) {
        chatbotMessages.innerHTML += `<div><strong>Bot:</strong> Error: ${error.message}</div>`;
    }
});

// 5. Customer Lifetime Value (CLV)
document.getElementById("predict-clv").addEventListener("click", async () => {
    const revenue = parseFloat(document.getElementById("revenue").value || 0);
    const frequency = parseFloat(document.getElementById("frequency").value || 0);
    const retentionRate = parseFloat(document.getElementById("retention-rate").value || 0);
    const output = document.getElementById("clv-output");
    output.innerText = "Calculating CLV...";
    try {
        const response = await fetch(`${backendUrl}/clv`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                customer: {
                    revenue,
                    frequency,
                    retention_rate: retentionRate
                }
            }),
        });
        const data = await response.json();
        output.innerText = `Predicted CLV: $${data.clv}` || "Error calculating CLV.";
    } catch (error) {
        output.innerText = `Error: ${error.message}`;
    }
});

// 6. Sentiment Analysis
document.getElementById("analyze-sentiment").addEventListener("click", async () => {
    const text = document.getElementById("sentiment-text").value;
    const output = document.getElementById("sentiment-output");
    output.innerText = "Analyzing sentiment...";
    try {
        const response = await fetch(`${backendUrl}/sentiment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
        });
        const data = await response.json();
        const sentiment = data.sentiment > 0 ? "Positive" : data.sentiment < 0 ? "Negative" : "Neutral";
        output.innerText = `Sentiment: ${sentiment} (Score: ${data.sentiment})`;
    } catch (error) {
        output.innerText = `Error: ${error.message}`;
    }
});
