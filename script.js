const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

let resolution = 200;
let sensitivity = 0.02;
let expr = 'x*y/100';
let history = [];
let graphColorMode = "hue";
let styleColorMode = "";
let custom1 = "#00ff00";
let custom2 = "#ff00ff";
let randomStyleColors = ["#ff0000", "#00ff00", "#0000ff"];

function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    render();
}

window.addEventListener('resize', resizeCanvas);
document.addEventListener('fullscreenchange', resizeCanvas);
resizeCanvas();

function indexToXY(i, j, res) {
    const x = -100 + (i / (res - 1)) * 200;
    const y = 100 - (j / (res - 1)) * 200;
    return { x, y };
}

function compileExpression(src) {
    try {
    const f = new Function('x', 'y', 'with(Math){return (' + src + ')}');
    f(0, 0);
    return { fn: f };
    } catch (e) {
    return { error: e.message };
    }
}

function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [
    Math.round(255 * f(0)),
    Math.round(255 * f(8)),
    Math.round(255 * f(4))
    ];
}

function hexToRgb(hex) {
    if (hex.startsWith("hsl")) {
    const m = hex.match(/hsl\((\d+),(\d+)%?,(\d+)%?\)/);
    if (m) return hslToRgb(+m[1], +m[2], +m[3]);
    }
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const v = parseInt(hex, 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function gradient(pct, colors) {
    const n = colors.length - 1;
    const pos = pct * n;
    const idx = Math.floor(pos);
    const t = pos - idx;
    const c1 = hexToRgb(colors[idx]);
    const c2 = hexToRgb(colors[Math.min(idx + 1, n)]);
    return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t))
    ];
}

function valueToColor(pct) {
    if (styleColorMode) {
    if (styleColorMode === "random") {
        let colors = randomStyleColors.slice();
        if (document.getElementById("styleBoost").checked) {
        colors = colors.map(c => {
            const rgb = hexToRgb(c);
            return `rgb(${Math.min(255, rgb[0] * 1.3)}, ${Math.min(255, rgb[1] * 1.3)}, ${Math.min(255, rgb[2] * 1.3)})`;
        });
        }
        return gradient(pct, colors);
    }
    switch (styleColorMode) {
        case "rainbow": return hslToRgb(pct * 360, 100, 50);
        case "plasma": return gradient(pct, ["#0d0887","#6a00a8","#b12a90","#e16462","#fca636","#f0f921"]);
        case "neon": return gradient(pct, ["#00ffff", "#ff00ff"]);
        case "pastel": return gradient(pct, ["#ffd1dc","#caffbf","#9bf6ff","#bdb2ff"]);
        case "monochrome": return hslToRgb(200, 60, pct * 100);
        case "fire": return gradient(pct, ["#000000","#8b0000","#ff4500","#ffff00","#ffffff"]);
        case "ocean": return gradient(pct, ["#000033","#0044cc","#00ccff","#ffffff"]);
        case "forest": return gradient(pct, ["#003300","#228b22","#adff2f"]);
        case "candy": return gradient(pct, ["#ff69b4","#8a2be2","#00ced1"]);
        case "aurora": return gradient(pct, ["#00ff99","#00ccff","#9900ff"]);
        case "sunset": return gradient(pct, ["#ff4500","#ff1493","#800080"]);
        case "cyberpunk": return gradient(pct, ["#ff00ff","#00ffff","#000000"]);
    }
    } else {
    if (graphColorMode === "hue") {
        return hslToRgb(pct * 360, 100, pct * 100);
    } else if (graphColorMode === "hueonly") {
        return hslToRgb(pct * 360, 100, 50);
    } else if (graphColorMode === "gray") {
        const g = Math.round(pct * 255);
        return [g, g, g];
    } else if (graphColorMode === "heat") {
        const r = Math.round(pct * 255), b = 255 - r;
        return [r, 0, b];
    } else {
        const c1 = hexToRgb(custom1), c2 = hexToRgb(custom2);
        return [
        Math.round(lerp(c1[0], c2[0], pct)),
        Math.round(lerp(c1[1], c2[1], pct)),
        Math.round(lerp(c1[2], c2[2], pct))
        ];
    }
    }
}

function normalizeValue(val) {
    if (!isFinite(val)) {
    if (document.getElementById("styleNanFix")?.checked) return Math.random();
    return 0.5;
    }
    return (Math.tanh(val * sensitivity) + 1) / 2;
}

function render() {
    const compiled = compileExpression(expr);
    if (compiled.error) {
    document.getElementById('exprStatus').textContent = 'Syntax error: ' + compiled.error;
    return;
    }
    document.getElementById('exprStatus').textContent = '';
    const fn = compiled.fn;
    const img = ctx.createImageData(resolution, resolution);
    const data = img.data;

    for (let j = 0; j < resolution; j++) {
    for (let i = 0; i < resolution; i++) {
        const { x, y } = indexToXY(i, j, resolution);
        let val = 0;
        try { val = fn(x, y); } catch(e) { val = NaN; }
        const pct = normalizeValue(val);
        const rgb = valueToColor(pct);
        const idx = (j * resolution + i) * 4;
        data[idx] = rgb[0];
        data[idx + 1] = rgb[1];
        data[idx + 2] = rgb[2];
        data[idx + 3] = 255;
    }
    }

    const off = document.createElement('canvas');
    off.width = resolution;
    off.height = resolution;
    off.getContext('2d').putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
    document.getElementById('stat').textContent = 'running';
}

document.querySelectorAll("input[name=graphColorMode]").forEach(radio => {
    radio.onchange = e => {
    graphColorMode = e.target.value;
    document.getElementById("customColors").style.display =
        (graphColorMode === "custom") ? "block" : "none";
    render();
    };
});

document.querySelectorAll("input[name=styleColorMode]").forEach(radio => {
    radio.onchange = e => {
    styleColorMode = e.target.value;
    document.getElementById("randomStyleControls").style.display =
        (styleColorMode === "random") ? "block" : "none";
    render();
    };
});

document.getElementById("color1").oninput = e => {
    custom1 = e.target.value;
    render();
};

document.getElementById("color2").oninput = e => {
    custom2 = e.target.value;
    render();
};

document.getElementById("genRandomStyle").onclick = () => generateRandomStyle();
document.getElementById("styleColorCount").oninput = () => generateRandomStyle();
document.getElementById("styleBoost").onchange = () => render();
document.getElementById("styleNanFix").onchange = () => render();

document.getElementById('expr').oninput = e => {
    expr = e.target.value;
    render();
};

document.getElementById('resRange').oninput = e => {
    resolution = parseInt(e.target.value);
    document.getElementById('resVal').textContent = resolution;
    render();
};

document.getElementById('sensRange').oninput = e => {
    sensitivity = parseFloat(e.target.value);
    document.getElementById('sensVal').textContent = sensitivity;
    render();
};

canvas.addEventListener('mousemove', e => {
    const x = -100 + (e.offsetX / canvas.clientWidth) * 200;
    const y = 100 - (e.offsetY / canvas.clientHeight) * 200;
    const compiled = compileExpression(expr);
    let val = '---';
    if (!compiled.error) {
    try {
        const v = compiled.fn(x, y);
        val = (typeof v === "number" && isFinite(v)) ? v.toFixed(2) : String(v);
    } catch {}
    }
    document.getElementById('coordBox').textContent =
    `Hover: (x,y)=(${x.toFixed(2)},${y.toFixed(2)}), f=${val}`;
});

function insert(text) {
    const ta = document.getElementById('expr');
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    ta.value = ta.value.substring(0, start) + text + ta.value.substring(end);
    ta.focus();
    ta.selectionStart = ta.selectionEnd = start + text.length;
    expr = ta.value;
    render();
}

function insertFunc(fnName) {
    const ta = document.getElementById('expr');
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const insertText = fnName + "()";
    ta.value = ta.value.substring(0, start) + insertText + ta.value.substring(end);
    ta.focus();
    ta.selectionStart = ta.selectionEnd = start + fnName.length + 1;
    expr = ta.value;
    render();
}

function randomEquation() {
    const vars = ["x", "y"];
    const funcs = ["sin", "cos", "tan", "abs", "sqrt", "log", "exp"];
    const ops = ["+", "-", "*", "/"];

    function rand(a) { return a[Math.floor(Math.random() * a.length)]; }
    function randNum() {
    if (Math.random() < 0.2) return (Math.random() * 100 - 50).toFixed(0);
    return (Math.random() * 10).toFixed(2);
    }

    function makeExpr(d = 0) {
    if (d > 2 && Math.random() < 0.5) return rand(vars);
    if (Math.random() < 0.25) return rand(vars);
    if (Math.random() < 0.25) return randNum();
    if (Math.random() < 0.5) {
        const l = makeExpr(d + 1), r = makeExpr(d + 1);
        return `(${l} ${rand(ops)} ${r})`;
    } else {
        const inner = makeExpr(d + 1), fn = rand(funcs);
        return `${fn}(${inner})`;
    }
    }

    let eq = "";
    for (let t = 0; t < 30; t++) {
    eq = makeExpr();
    if (/[xy]/.test(eq)) break;
    }
    return eq;
}

function isFlatEquation(eq) {
    const testSens = 0.02;
    const compiled = compileExpression(eq);
    if (compiled.error) return true;
    const fn = compiled.fn;
    const sampleCoords = [-100, -50, 0, 50, 100];
    const vals = [];
    for (const x of sampleCoords) {
    for (const y of sampleCoords) {
        let v = 0;
        try { v = fn(x, y); } catch { v = 0; }
        const norm = Math.tanh(v * testSens);
        vals.push(norm);
    }
    }
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + (b - mean) * (b - mean), 0) / vals.length;
    const std = Math.sqrt(variance);
    return std < 0.03;
}

function isSingleVar(eq) {
    if (!eq || typeof eq !== "string") return false;
    const s = eq.trim();
    return s === "x" || s === "y";
}

function generateNonFlatEquation() {
    for (let a = 0; a < 100; a++) {
    const eq = randomEquation();
    if (isSingleVar(eq)) continue;
    if (!isFlatEquation(eq)) return eq;
    }
    return "x*y/100";
}

function addHistory(eq) {
    history.unshift(eq);
    if (history.length > 10) history.pop();
    const tbody = document.querySelector("#historyTable tbody");
    tbody.innerHTML = "";
    history.forEach((h, i) => {
    const tr = document.createElement("tr");
    tr.className = "clickable";
    tr.innerHTML = `<td>${i + 1}</td><td>${h}</td>`;
    tr.onclick = () => { loadHistory(i); };
    tbody.appendChild(tr);
    });
}

function loadHistory(index) {
    const eq = history[index];
    if (!eq) return;
    const ta = document.getElementById('expr');
    ta.value = eq;
    expr = eq;
    render();
}

document.getElementById('randomBtn').onclick = () => {
    document.getElementById('stat').textContent = 'generating...';
    const eq = generateNonFlatEquation();
    const ta = document.getElementById('expr');
    ta.value = eq;
    expr = eq;
    render();
    addHistory(eq);
    document.getElementById('stat').textContent = 'running';
};

function downloadImage(type) {
    const link = document.createElement('a');
    link.download = "graph." + type;
    link.href = canvas.toDataURL(type === "jpg" ? "image/jpeg" : "image/png");
    link.click();
}

function resetResolution() {
    resolution = 200;
    const resRange = document.getElementById('resRange');
    resRange.value = resolution;
    document.getElementById('resVal').textContent = resolution;
    render();
}

function resetSensitivity() {
    sensitivity = 0.02;
    const sensRange = document.getElementById('sensRange');
    sensRange.value = sensitivity;
    document.getElementById('sensVal').textContent = sensitivity;
    render();
}

render();