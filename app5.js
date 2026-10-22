const MODELS = {
    "Tomato":      "https://teachablemachine.withgoogle.com/models/z2niuamRf/",
    "Apple":       "https://teachablemachine.withgoogle.com/models/X4CmAVvRJ/",
    "Potato":      "https://teachablemachine.withgoogle.com/models/MIMDs8u73/",
    "Grape":       "https://teachablemachine.withgoogle.com/models/67ZHczOkq/",
    "Corn":         "https://teachablemachine.withgoogle.com/models/c45p88bIJ/",
    "Bell Pepper": "https://teachablemachine.withgoogle.com/models/81ubzV8J9/"
};


const DISEASES = [
    ["Tomato", "Early Blight", "Fungal", "Brown spots with ring pattern on older leaves.", "Remove infected leaves, mulch, rotate crops, use copper fungicide."],
    ["Tomato", "Late Blight", "Fungal", "Large dark water-soaked patches, white mould underneath.", "Remove plants fast, avoid wet leaves, use fungicide early."],
    ["Tomato", "Septoria Leaf Spot", "Fungal", "Many small round spots with grey centres.", "Pick off spotted leaves, water at the base, use fungicide."],
    ["Tomato", "Bacterial Spot", "Bacterial", "Small dark greasy spots, yellow halo.", "Use clean seed, avoid overhead watering, copper spray."],
    ["Tomato", "Leaf Mold", "Fungal", "Yellow patches on top, olive mould underneath.", "Improve airflow, reduce humidity, remove infected leaves."],
    ["Tomato", "Target Spot", "Fungal", "Brown spots with concentric rings.", "Prune for airflow, use fungicide, clear plant debris."],
    ["Tomato", "Yellow Leaf Curl Virus", "Viral", "Leaves curl upward and turn yellow, plant stunted.", "Control whiteflies, remove infected plants, use resistant types."],
    ["Tomato", "Mosaic Virus", "Viral", "Mottled light and dark green leaves, distorted growth.", "Remove infected plants, wash hands and tools, no cure."],
    ["Tomato", "Spider Mites", "Pest", "Tiny yellow speckles, fine webbing.", "Spray water or neem oil, keep plants from drying out."],
    ["Apple", "Apple Scab", "Fungal", "Olive-green to black scabby spots on leaves.", "Rake fallen leaves, prune for airflow, use fungicide in spring."],
    ["Apple", "Black Rot", "Fungal", "Purple-edged brown spots (frogeye) on leaves.", "Prune dead wood, remove mummified fruit, use fungicide."],
    ["Apple", "Cedar Apple Rust", "Fungal", "Bright yellow-orange spots on leaves.", "Remove nearby juniper, use fungicide at pink bud stage."],
    ["Potato", "Early Blight", "Fungal", "Dark spots with rings on lower leaves.", "Rotate crops, remove infected leaves, use fungicide."],
    ["Potato", "Late Blight", "Fungal", "Dark wet patches that spread quickly, white mould.", "Destroy infected plants, avoid wet foliage, use fungicide."],
    ["Grape", "Black Rot", "Fungal", "Small brown circles with dark border on leaves.", "Remove mummified berries, prune for airflow, fungicide."],
    ["Grape", "Esca (Black Measles)", "Fungal", "Yellow-brown stripes between veins (tiger stripes).", "Prune out affected wood, protect pruning wounds."],
    ["Grape", "Leaf Blight", "Fungal", "Irregular brown patches on leaves.", "Clear fallen leaves, improve airflow, use fungicide."],
    ["Corn", "Gray Leaf Spot", "Fungal", "Long rectangular grey-tan lesions.", "Rotate crops, till residue, use resistant hybrids."],
    ["Corn", "Common Rust", "Fungal", "Small reddish-brown pustules on both sides of leaf.", "Plant resistant hybrids, fungicide if severe."],
    ["Corn", "Northern Leaf Blight", "Fungal", "Long cigar-shaped grey-green lesions.", "Resistant hybrids, rotate crops, fungicide if early."],
    ["Bell Pepper", "Bacterial Spot", "Bacterial", "Small water-soaked spots turning brown, leaves drop.", "Use clean seed, avoid overhead watering, copper spray."],
    ["Bell Pepper", "Cercospora Leaf Spot", "Fungal", "Round spots with pale centres and dark edges.", "Remove infected leaves, rotate crops, use fungicide."],
    ["Bell Pepper", "Powdery Mildew", "Fungal", "White powdery coating, yellow patches on top.", "Improve airflow, sulphur or neem spray."],
    ["Bell Pepper", "Aphids", "Pest", "Curled leaves, sticky residue, small insects.", "Spray water, neem oil, encourage ladybugs."]
];


const $ = (id) => document.getElementById(id);

function esc(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}


let currentPlant = null;
let currentModel = null;
const modelPromises = {};   
const modelInfo = {};       
let modelsReady = 0;


const blank = document.createElement("canvas");
blank.width = blank.height = 224;

function loadModel(plant) {
    if (modelPromises[plant]) return modelPromises[plant];
    const base = MODELS[plant];

    modelPromises[plant] = Promise.all([
        tmImage.load(base + "model.json", base + "metadata.json"),
        fetch(base + "metadata.json").then((r) => r.json())   
    ]).then(([model, meta]) => {
        modelInfo[plant] = (meta.labels || []).length;
      
        return model.predict(blank).then(() => model).catch(() => model);
    }).catch((err) => {
        delete modelPromises[plant];   
        throw err;
    });

    return modelPromises[plant];
}


function preloadAll() {
    Object.keys(MODELS).forEach((plant) => {
        loadModel(plant).then(() => {
            modelsReady++;
            if (!currentPlant) {
                $("modelStatus").textContent = "Models loaded: " + modelsReady + " / " + Object.keys(MODELS).length;
            }
        }).catch(() => {});
    });
    $("modelStatus").textContent = "Loading models in the background...";
}

function buildPlantButtons() {
    Object.keys(MODELS).forEach((plant) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = plant;
        btn.addEventListener("click", () => selectPlant(plant, btn));
        $("plantButtons").appendChild(btn);
    });
}

async function selectPlant(plant, btn) {
    document.querySelectorAll("#plantButtons button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentPlant = plant;
    currentModel = null;
    updateAnalyseButton();
    $("modelStatus").textContent = "Loading " + plant + " model...";

    try {
        const model = await loadModel(plant);
        if (currentPlant !== plant) return;  
        currentModel = model;
        $("modelStatus").textContent = plant + " model ready (" + modelInfo[plant] + " classes).";
    } catch (err) {
        $("modelStatus").textContent = "Could not load " + plant + " model. Check your internet and the model link.";
    }
    updateAnalyseButton();
}


let hasImage = false;
const canvas = $("preview");
const ctx = canvas.getContext("2d");

function updateAnalyseButton() {
    $("analyseBtn").disabled = !(hasImage && currentModel);
}

function handleFile(file) {
    if (!file) return;
    if (file.type !== "image/jpeg" && file.type !== "image/png") {
        $("result").textContent = "Please upload a JPG or PNG image.";
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          
            const side = Math.min(img.width, img.height);
            const sx = (img.width - side) / 2;
            const sy = (img.height - side) / 2;
            ctx.clearRect(0, 0, 224, 224);
            ctx.drawImage(img, sx, sy, side, side, 0, 0, 224, 224);
            canvas.hidden = false;
            hasImage = true;
            $("result").innerHTML = "Photo ready. Hit <b>Analyse</b>.";
            updateAnalyseButton();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function setupUpload() {
    const zone = $("dropZone");
    $("chooseBtn").addEventListener("click", () => $("fileInput").click());
    $("fileInput").addEventListener("change", (e) => handleFile(e.target.files[0]));

    zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("over"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("over"));
    zone.addEventListener("drop", (e) => {
        e.preventDefault();
        zone.classList.remove("over");
        handleFile(e.dataTransfer.files[0]);
    });
}


function findInfo(plant, label) {
    const l = label.toLowerCase();
    return DISEASES.find((d) => d[0] === plant && l.includes(d[1].toLowerCase().split(" (")[0]));
}

async function analyse() {
    if (!currentModel || !hasImage) return;
    $("result").textContent = "Analysing...";
    try {
        const preds = await currentModel.predict(canvas);
        preds.sort((a, b) => b.probability - a.probability);
        const top = preds.slice(0, 3);

        const box = $("result");
        box.innerHTML = "";

        const title = document.createElement("p");
        title.innerHTML = "<b>" + esc(top[0].className) + "</b> — " + (top[0].probability * 100).toFixed(1) + "%";
        box.appendChild(title);

        if (top[0].probability < 0.6) {
            const w = document.createElement("p");
            w.className = "warn";
            w.textContent = "Low confidence. Try a clearer, close-up photo of a single leaf.";
            box.appendChild(w);
        }

        top.forEach((p) => {
            const pct = (p.probability * 100).toFixed(1);
            const row = document.createElement("div");
            row.innerHTML = "<span>" + esc(p.className) + " (" + pct + "%)</span>" +
                            '<div class="bar"><span style="width:' + pct + '%"></span></div>';
            box.appendChild(row);
        });

        const info = findInfo(currentPlant, top[0].className);
        if (info) {
            const t = document.createElement("p");
            t.innerHTML = "<b>Treatment:</b> " + esc(info[4]);
            box.appendChild(t);
        }
    } catch (err) {
        $("result").textContent = "Something went wrong while analysing. Try again.";
    }
}


function highlight(text, q) {
    const safe = esc(text);
    if (!q) return safe;
    const escQ = esc(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return safe.replace(new RegExp("(" + escQ + ")", "gi"), "<mark>$1</mark>");
}

function renderLibrary() {
    const q = $("searchBox").value.trim();
    const crop = $("cropFilter").value;
    const ql = q.toLowerCase();

    const list = DISEASES.filter((d) => {
        if (crop !== "All" && d[0] !== crop) return false;
        return !ql || d.join(" ").toLowerCase().includes(ql);
    });

    $("libCount").textContent = list.length + " of " + DISEASES.length + " diseases";
    $("libList").innerHTML = list.map((d) =>
        '<div class="disease"><b>' + highlight(d[1], q) + "</b> — " + d[0] + " (" + d[2] + ")" +
        "<p>" + highlight(d[3], q) + "</p>" +
        "<p><i>Fix:</i> " + highlight(d[4], q) + "</p></div>"
    ).join("");
}

function setupLibrary() {
    const sel = $("cropFilter");
    ["All"].concat(Object.keys(MODELS)).forEach((c) => {
        const o = document.createElement("option");
        o.value = c;
        o.textContent = c === "All" ? "All crops" : c;
        sel.appendChild(o);
    });
    $("searchBox").addEventListener("input", renderLibrary);
    sel.addEventListener("change", renderLibrary);
    renderLibrary();
}


const STORE_KEY = "plantsafe_tasks";
let tasks = [];

function loadTasks() {
    try { tasks = JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
    catch (e) { tasks = []; }
}

function saveTasks() {
    localStorage.setItem(STORE_KEY, JSON.stringify(tasks));
}

function renderTasks() {
    const ul = $("taskList");
    ul.innerHTML = "";
    $("taskEmpty").hidden = tasks.length > 0;

    tasks.forEach((t, i) => {
        const li = document.createElement("li");
        li.className = "task" + (t.done ? " done" : "");

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = t.done;
        cb.addEventListener("change", () => { tasks[i].done = cb.checked; saveTasks(); renderTasks(); });

        const span = document.createElement("span");
        span.textContent = t.text;

        const del = document.createElement("button");
        del.type = "button";
        del.textContent = "Delete";
        del.addEventListener("click", () => { tasks.splice(i, 1); saveTasks(); renderTasks(); });

        li.append(cb, span, del);
        ul.appendChild(li);
    });
}

function addTask() {
    const text = $("taskInput").value.trim();
    if (!text) return;
    tasks.push({ text: text, done: false });
    $("taskInput").value = "";
    saveTasks();
    renderTasks();
}

function setupChecklist() {
    loadTasks();
    renderTasks();
    $("addTask").addEventListener("click", addTask);
    $("taskInput").addEventListener("keydown", (e) => { if (e.key === "Enter") addTask(); });
}


const QUIZ = [
    { q: "What do the spots look like?", a: [
        ["Brown, round, sometimes with rings", "Fungal"],
        ["Small, dark and greasy with a yellow halo", "Bacterial"],
        ["No clear spots, but mottled yellow-green", "Viral"],
        ["Tiny speckles or small holes", "Pest"] ] },
    { q: "How does the leaf feel or look?", a: [
        ["Dry patches, powdery or fuzzy coating", "Fungal"],
        ["Wet, slimy or greasy", "Bacterial"],
        ["Curled, crinkled or stunted", "Viral"],
        ["Sticky, webbing or chewed edges", "Pest"] ] },
    { q: "What has the weather or surroundings been like?", a: [
        ["Humid and rainy", "Fungal"],
        ["Warm, with water splashing on leaves", "Bacterial"],
        ["Lots of whiteflies or aphids around", "Viral"],
        ["Hot and dry", "Pest"] ] }
];

const QUIZ_ADVICE = {
    "Fungal": "Likely a fungal disease. Remove infected leaves, improve airflow and use a fungicide.",
    "Bacterial": "Likely a bacterial disease. Avoid overhead watering and use copper spray.",
    "Viral": "Likely a viral disease. Control insects, remove infected plants. There is no cure.",
    "Pest": "Likely a pest problem. Check under leaves, spray with water or neem oil."
};

function setupQuiz() {
    $("quizBox").innerHTML = QUIZ.map((item, qi) =>
        '<div class="q"><p><b>' + (qi + 1) + ". " + item.q + "</b></p>" +
        item.a.map((opt) =>
            '<label><input type="radio" name="q' + qi + '" value="' + opt[1] + '"> ' + opt[0] + "</label>"
        ).join("") + "</div>"
    ).join("");

    $("quizBtn").addEventListener("click", () => {
        const score = {};
        for (let i = 0; i < QUIZ.length; i++) {
            const picked = document.querySelector('input[name="q' + i + '"]:checked');
            if (!picked) { $("quizResult").textContent = "Answer all 3 questions first."; return; }
            score[picked.value] = (score[picked.value] || 0) + 1;
        }
        const best = Object.keys(score).sort((a, b) => score[b] - score[a])[0];
        $("quizResult").textContent = QUIZ_ADVICE[best];
    });
}


buildPlantButtons();
preloadAll();
setupUpload();
setupLibrary();
setupChecklist();
setupQuiz();
$("analyseBtn").addEventListener("click", analyse);
