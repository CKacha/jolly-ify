const CACHET_BASE = "https://cachet.dunkirk.sh";

const tabs = document.querySelectorAll(".tab");
const panels = {
    slack: document.getElementById("panel-slack"),
    upload: document.getElementById("panel-upload"),
};

const form = document.getElementById("lookupForm");
const userIdInput = document.getElementById("userId");
const lookupBtn = document.getElementById("lookupBtn");
const fileInput = document.getElementById("fileInput");
const statusEl = document.getElementById("status");

const editor = document.getElementById("editor");
const displayNameEl = document.getElementById("displayName");
const canvas = document.getElementById("pfpCanvas");
const ctx = canvas.getContext("2d");
const autoBtn = document.getElementById("autoBtn");
const downloadBtn = document.getElementById("downloadBtn");

const toggleHat = document.getElementById("toggleHat");
const hatX = document.getElementById("hatX");
const hatY = document.getElementById("hatY");
const hatSize = document.getElementById("hatSize");
const toggleSnow = document.getElementById("toggleSnow");
const snowAmount = document.getElementById("snowAmount");
const toggleLights = document.getElementById("toggleLights");
const toggleAntlers = document.getElementById("toggleAntlers");
const toggleScarf = document.getElementById("toggleScarf");
const toggleFrame = document.getElementById("toggleFrame");

let currentImage = null;
let currentName = "pfp";

function setStatus(message, isError = true) {
    statusEl.textContent = message;
    statusEl.style.color = isError ? "#c0392b" : "#27632f";
}

tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.toggle("active", t === tab));
        Object.entries(panels).forEach(([name, panel]) => {
            panel.classList.toggle("hidden", name !== tab.dataset.tab);
        });
        setStatus("");
    });
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = userIdInput.value.trim();
    if (!id) return;

    lookupBtn.disabled = true;
    setStatus("Fetching profile from Cachet...", false);

    try {
        const res = await fetch(`${CACHET_BASE}/users/${encodeURIComponent(id)}`);

        if (res.status === 202) {
            setStatus("User not cached yet. Cachet is fetching it, try again in a moment.");
            return;
        }
        if (!res.ok) {
            setStatus(`Could not fetch user (HTTP ${res.status}). Check the user ID.`);
            return;
        }

        const data = await res.json();
        if (!data.imageUrl) {
            setStatus("No profile image available for this user, are you sure they exist?");
            return;
        }

        currentName = data.displayName || id;
        await loadImageFromUrl(data.imageUrl);

        const label = data.displayName
            ? `${data.displayName}${data.pronouns ? ` (${data.pronouns})` : ""}`
            : id;
        openEditor(label);
    } catch (err) {
        setStatus(`Something went wrong: ${err.message}`);
    } finally {
        lookupBtn.disabled = false;
    }
});

fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        const img = new Image();
        img.onload = () => {
            currentImage = img;
            currentName = file.name.replace(/\.[^.]+$/, "") || "pfp";
            openEditor("");
        };
        img.onerror = () => setStatus("Could not read that image.");
        img.src = reader.result;
    };
    reader.onerror = () => setStatus("Could not read that file.");
    reader.readAsDataURL(file);
});

function loadImageFromUrl(url) {
    const proxied = `https://images.weserv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//, ""))}`;
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            currentImage = img;
            resolve();
        };
        img.onerror = () => reject(new Error("Failed to load profile image."));
        img.src = proxied;
    });
}

function openEditor(label) {
    displayNameEl.textContent = label;
    displayNameEl.classList.toggle("hidden", !label);
    editor.classList.remove("hidden");
    render();
    downloadBtn.disabled = false;
    setStatus("Loaded.", false);
}

function render() {
    if (!currentImage) return;
    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);

    const { width: iw, height: ih } = currentImage;
    const scale = Math.max(size / iw, size / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(currentImage, (size - dw) / 2, (size - dh) / 2, dw, dh);

    if (toggleFrame.checked) drawFrame(size);
    if (toggleSnow.checked) drawSnow(size, Number(snowAmount.value));
    if (toggleScarf.checked) drawScarf(size);
    if (toggleAntlers.checked) drawAntlers(size);
    if (toggleLights.checked) drawLights(size);
    if (toggleHat.checked) {
        drawSantaHat(size, Number(hatX.value), Number(hatY.value), Number(hatSize.value));
    }
}

function drawSantaHat(size, xPercent, yPercent, sizePercent) {
    const s = (size / 400) * (sizePercent / 100);
    const cx = (xPercent / 100) * size;
    const cy = (yPercent / 100) * size;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.fillStyle = "#c0392b";
    ctx.beginPath();
    ctx.moveTo(-110 * s, 70 * s);
    ctx.quadraticCurveTo(-90 * s, -30 * s, 30 * s, -20 * s);
    ctx.quadraticCurveTo(110 * s, -10 * s, 120 * s, 70 * s);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(0, 70 * s, 125 * s, 22 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(120 * s, 70 * s, 22 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawSnow(size, count) {
    if (count <= 0) return;
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    for (let i = 0; i < count; i++) {
        const x = pseudoRandom(i * 12.9898) * size;
        const y = pseudoRandom(i * 78.233) * size;
        const r = pseudoRandom(i * 3.17) * 2.5 + 0.8;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawScarf(size) {
    ctx.save();
    ctx.fillStyle = "#1f6f3d";
    ctx.beginPath();
    ctx.moveTo(0, size * 0.74);
    ctx.quadraticCurveTo(size * 0.5, size * 0.66, size, size * 0.74);
    ctx.lineTo(size, size * 0.9);
    ctx.quadraticCurveTo(size * 0.5, size * 0.82, 0, size * 0.9);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#196134";
    ctx.fillRect(size * 0.6, size * 0.8, size * 0.12, size * 0.18);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = size * 0.012;
    for (let x = 0; x < size; x += size * 0.06) {
        ctx.beginPath();
        ctx.moveTo(x, size * 0.72);
        ctx.lineTo(x + size * 0.02, size * 0.9);
        ctx.stroke();
    }
    ctx.restore();
}

function drawAntlers(size) {
    ctx.save();
    ctx.strokeStyle = "#6b4423";
    ctx.lineCap = "round";
    ctx.lineWidth = size * 0.03;
    const top = size * 0.16;

    for (const dir of [-1, 1]) {
        const baseX = size * 0.5 + dir * size * 0.18;
        ctx.beginPath();
        ctx.moveTo(baseX, top + size * 0.12);
        ctx.quadraticCurveTo(baseX + dir * size * 0.08, top, baseX + dir * size * 0.12, top - size * 0.1);
        ctx.stroke();

        ctx.lineWidth = size * 0.02;
        ctx.beginPath();
        ctx.moveTo(baseX + dir * size * 0.06, top + size * 0.02);
        ctx.lineTo(baseX + dir * size * 0.14, top - size * 0.02);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(baseX + dir * size * 0.1, top - size * 0.04);
        ctx.lineTo(baseX + dir * size * 0.18, top - size * 0.06);
        ctx.stroke();
        ctx.lineWidth = size * 0.03;
    }
    ctx.restore();
}

function drawLights(size) {
    ctx.save();
    const colors = ["#e74c3c", "#f1c40f", "#2ecc71", "#3498db"];
    const wireY = size * 0.06;
    const sag = size * 0.05;

    ctx.strokeStyle = "#2c3e50";
    ctx.lineWidth = size * 0.008;
    ctx.beginPath();
    ctx.moveTo(0, wireY);
    ctx.quadraticCurveTo(size * 0.5, wireY + sag, size, wireY);
    ctx.stroke();

    const bulbs = 9;
    for (let i = 0; i <= bulbs; i++) {
        const t = i / bulbs;
        const x = t * size;
        const y = (1 - t) * (1 - t) * wireY + 2 * (1 - t) * t * (wireY + sag) + t * t * wireY;
        ctx.strokeStyle = "#2c3e50";
        ctx.lineWidth = size * 0.004;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + size * 0.025);
        ctx.stroke();

        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.arc(x, y + size * 0.04, size * 0.018, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawFrame(size) {
    const w = size * 0.04;
    ctx.save();
    ctx.lineWidth = w;
    ctx.strokeStyle = "#27632f";
    ctx.strokeRect(w / 2, w / 2, size - w, size - w);
    ctx.fillStyle = "#c0392b";
    const c = w * 1.6;
    [[0, 0], [size - c, 0], [0, size - c], [size - c, size - c]].forEach(([x, y]) => {
        ctx.fillRect(x, y, c, c);
    });
    ctx.restore();
}

function pseudoRandom(seed) {
    const v = Math.sin(seed) * 43758.5453;
    return v - Math.floor(v);
}

[
    toggleHat, hatX, hatY, hatSize,
    toggleSnow, snowAmount,
    toggleLights, toggleAntlers, toggleScarf, toggleFrame,
].forEach((el) => {
    el.addEventListener("input", render);
});

autoBtn.addEventListener("click", () => {
    toggleHat.checked = true;
    hatX.value = 50;
    hatY.value = 20;
    hatSize.value = 100;
    toggleSnow.checked = true;
    snowAmount.value = 60;
    toggleLights.checked = true;
    toggleScarf.checked = true;
    toggleAntlers.checked = false;
    toggleFrame.checked = false;
    render();
});

downloadBtn.addEventListener("click", () => {
    try {
        const link = document.createElement("a");
        link.download = `jolly-${currentName}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    } catch (err) {
        setStatus("Couldn't export image (the source blocks cross-origin downloads).");
    }
});
