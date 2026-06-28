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
const toggleFrame = document.getElementById("toggleFrame");

let currentImage = null;
let currentName = "pfp";
let tainted = false;

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
            tainted = false; 
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
    return new Promise((resolve, reject) => {
        const corsImg = new Image();
        corsImg.crossOrigin = "anonymous";
        corsImg.onload = () => {
            currentImage = corsImg;
            tainted = false;
            resolve();
        };
        corsImg.onerror = () => {
            const plainImg = new Image();
            plainImg.onload = () => {
                currentImage = plainImg;
                tainted = true;
                resolve();
            };
            plainImg.onerror = () => reject(new Error("Failed to load profile image."));
            plainImg.src = url;
        };
        corsImg.src = url;
    });
}

function openEditor(label) {
    displayNameEl.textContent = label;
    displayNameEl.classList.toggle("hidden", !label);
    editor.classList.remove("hidden");
    render();

    if (tainted) {
        downloadBtn.disabled = true;
        setStatus("Loaded. Slack's CDN blocks downloads, so use a screenshot to save.", false);
    } else {
        downloadBtn.disabled = false;
        setStatus("Loaded.", false);
    }
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


[toggleHat, hatX, hatY, hatSize, toggleSnow, snowAmount, toggleFrame].forEach((el) => {
    el.addEventListener("input", render);
});

autoBtn.addEventListener("click", () => {
    toggleHat.checked = true;
    hatX.value = 50;
    hatY.value = 20;
    hatSize.value = 100;
    toggleSnow.checked = true;
    snowAmount.value = 60;
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
