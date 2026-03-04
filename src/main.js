import { encode } from "@jsquash/webp";

const el = {
  pick: document.querySelector("#pick"),
  quality: document.querySelector("#quality"),
  qLabel: document.querySelector("#qLabel"),
  list: document.querySelector("#list"),
  log: document.querySelector("#log"),
  convert: document.querySelector("#convert"),
  clear: document.querySelector("#clear"),
  drop: document.querySelector("#drop"),
};

let files = [];

function log(line) {
  el.log.textContent += line + "\n";
  el.log.scrollTop = el.log.scrollHeight;
}

function renderList() {
  el.list.innerHTML = "";
  if (!files.length) {
    el.list.textContent = "Файлы не выбраны";
    return;
  }
  for (const f of files) {
    const li = document.createElement("li");
    li.textContent = `${f.name} (${Math.round(f.size / 1024)} KB)`;
    el.list.appendChild(li);
  }
}

function addFiles(newFiles) {
  const arr = Array.from(newFiles || []);
  // оставим только jpg/png
  const filtered = arr.filter((f) => /\.(jpe?g|png)$/i.test(f.name));
  files = [...files, ...filtered];
  renderList();
  if (arr.length && !filtered.length) log("⚠️ Добавлены файлы, но среди них нет jpg/png");
}

el.quality.addEventListener("input", () => {
  el.qLabel.textContent = el.quality.value;
});

el.pick.addEventListener("change", (e) => {
  addFiles(e.target.files);
  // чтобы можно было снова выбрать те же файлы
  el.pick.value = "";
});

el.clear.addEventListener("click", () => {
  files = [];
  el.log.textContent = "";
  renderList();
});

async function fileToImageData(file) {
  // декод браузером
  const bitmap = await createImageBitmap(file);

  // canvas -> ImageData (RGBA)
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  bitmap.close?.();
  return imageData;
}

function downloadBytes(bytes, filename) {
  const blob = new Blob([bytes], { type: "image/webp" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

el.convert.addEventListener("click", async () => {
  el.log.textContent = "";
  if (!files.length) {
    log("⚠️ Выбери картинки (jpg/png) перед конвертацией");
    return;
  }

  const quality = Number(el.quality.value);
  log(`▶️ Старт. Файлов: ${files.length}, quality: ${quality}`);

  let ok = 0;

  for (const f of files) {
    try {
      const imageData = await fileToImageData(f);

      // encode(ImageData, { quality })
      const webpBytes = await encode(imageData, { quality });

      const outName = f.name.replace(/\.[^.]+$/, "") + ".webp";
      downloadBytes(webpBytes, outName);

      ok++;
      log(`✅ ${f.name} → ${outName}`);
    } catch (e) {
      log(`❌ Ошибка ${f.name}: ${e?.message ?? String(e)}`);
    }
  }

  log(`🎉 Готово. Успешно: ${ok}`);
});

//
// Drag & Drop
//
["dragenter", "dragover"].forEach((evt) => {
  el.drop.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    el.drop.classList.add("drag");
  });
});

["dragleave", "drop"].forEach((evt) => {
  el.drop.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    el.drop.classList.remove("drag");
  });
});

el.drop.addEventListener("drop", (e) => {
  const dt = e.dataTransfer;
  if (!dt) return;
  addFiles(dt.files);
});