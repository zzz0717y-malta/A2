(() => {
  "use strict";

  const TAU = Math.PI * 2;
  const MAX_SOURCE_SIDE = 420;

  const state = {
    source: null,
    sourceName: "内置样例",
    selection: { x: 80, y: 52, w: 96, h: 72 },
    dragStart: null,
    frequencyTimer: 0,
    spectraTimer: 0
  };

  const el = {
    sourceName: byId("sourceName"),
    imageUpload: byId("imageUpload"),
    sampleButton: byId("sampleButton"),
    sourceSize: byId("sourceSize"),
    filterMode: byId("filterMode"),
    kernelSize: byId("kernelSize"),
    kernelValue: byId("kernelValue"),
    sigma: byId("sigma"),
    sigmaValue: byId("sigmaValue"),
    originalCanvas: byId("originalCanvas"),
    filteredCanvas: byId("filteredCanvas"),
    spatialRuntime: byId("spatialRuntime"),
    spatialMetrics: byId("spatialMetrics"),
    spatialCompare: byId("spatialCompare"),
    roiX: byId("roiX"),
    roiY: byId("roiY"),
    roiW: byId("roiW"),
    roiH: byId("roiH"),
    roiXValue: byId("roiXValue"),
    roiYValue: byId("roiYValue"),
    roiWValue: byId("roiWValue"),
    roiHValue: byId("roiHValue"),
    roiLabel: byId("roiLabel"),
    directionLabel: byId("directionLabel"),
    gradientCanvas: byId("gradientCanvas"),
    patchCanvas: byId("patchCanvas"),
    histCanvas: byId("histCanvas"),
    gradientMetrics: byId("gradientMetrics"),
    fftSize: byId("fftSize"),
    fftLabel: byId("fftLabel"),
    freqFilter: byId("freqFilter"),
    freqRadius: byId("freqRadius"),
    radiusValue: byId("radiusValue"),
    freqBand: byId("freqBand"),
    bandValue: byId("bandValue"),
    maskLabel: byId("maskLabel"),
    energyLabel: byId("energyLabel"),
    inverseLabel: byId("inverseLabel"),
    freqOriginalCanvas: byId("freqOriginalCanvas"),
    spectrumCanvas: byId("spectrumCanvas"),
    maskCanvas: byId("maskCanvas"),
    filteredSpectrumCanvas: byId("filteredSpectrumCanvas"),
    freqResultCanvas: byId("freqResultCanvas"),
    rotateAngle: byId("rotateAngle"),
    angleValue: byId("angleValue"),
    shiftX: byId("shiftX"),
    shiftY: byId("shiftY"),
    shiftXValue: byId("shiftXValue"),
    shiftYValue: byId("shiftYValue"),
    scaleAmount: byId("scaleAmount"),
    scaleValue: byId("scaleValue"),
    spectrumCompareGrid: byId("spectrumCompareGrid"),
    spectrumNotes: byId("spectrumNotes")
  };

  init();

  function byId(id) {
    return document.getElementById(id);
  }

  function init() {
    bindTabs();
    bindControls();
    bindGradientCanvas();
    setSource(createSampleImage(), "内置样例");
  }

  function bindTabs() {
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.addEventListener("click", () => {
        const tab = button.dataset.tab;
        document.querySelectorAll(".tab-button").forEach((item) => {
          item.classList.toggle("active", item === button);
        });
        document.querySelectorAll(".panel").forEach((panel) => {
          panel.classList.toggle("active", panel.dataset.panel === tab);
        });
        document.querySelectorAll(".view").forEach((view) => {
          view.classList.toggle("active", view.dataset.view === tab);
        });
        if (tab === "frequency") renderFrequencySoon(1);
        if (tab === "spectra") renderSpectraSoon(1);
      });
    });
  }

  function bindControls() {
    el.imageUpload.addEventListener("change", handleImageUpload);
    el.sampleButton.addEventListener("click", () => setSource(createSampleImage(), "内置样例"));

    [el.filterMode, el.kernelSize, el.sigma].forEach((input) => {
      input.addEventListener("input", () => {
        syncControlLabels();
        renderSpatial();
      });
    });

    [el.roiX, el.roiY, el.roiW, el.roiH].forEach((input) => {
      input.addEventListener("input", () => {
        state.selection = {
          x: Number(el.roiX.value),
          y: Number(el.roiY.value),
          w: Number(el.roiW.value),
          h: Number(el.roiH.value)
        };
        clampSelection();
        syncRoiControls();
        renderGradient();
      });
    });

    [el.fftSize, el.freqFilter, el.freqRadius, el.freqBand].forEach((input) => {
      input.addEventListener("input", () => {
        syncControlLabels();
        renderFrequencySoon(40);
        renderSpectraSoon(80);
      });
    });

    [el.rotateAngle, el.shiftX, el.shiftY, el.scaleAmount].forEach((input) => {
      input.addEventListener("input", () => {
        syncControlLabels();
        renderSpectraSoon(40);
      });
    });
  }

  function bindGradientCanvas() {
    el.gradientCanvas.addEventListener("pointerdown", (event) => {
      if (!state.source) return;
      el.gradientCanvas.setPointerCapture(event.pointerId);
      const p = canvasPointToImage(el.gradientCanvas, event);
      state.dragStart = p;
      state.selection = { x: p.x, y: p.y, w: 1, h: 1 };
      clampSelection();
      syncRoiControls();
      renderGradient();
    });

    el.gradientCanvas.addEventListener("pointermove", (event) => {
      if (!state.dragStart || !state.source) return;
      const p = canvasPointToImage(el.gradientCanvas, event);
      const x0 = Math.min(state.dragStart.x, p.x);
      const y0 = Math.min(state.dragStart.y, p.y);
      const x1 = Math.max(state.dragStart.x, p.x);
      const y1 = Math.max(state.dragStart.y, p.y);
      state.selection = {
        x: x0,
        y: y0,
        w: Math.max(12, x1 - x0),
        h: Math.max(12, y1 - y0)
      };
      clampSelection();
      syncRoiControls();
      renderGradient();
    });

    el.gradientCanvas.addEventListener("pointerup", (event) => {
      state.dragStart = null;
      try {
        el.gradientCanvas.releasePointerCapture(event.pointerId);
      } catch (_) {
        // Pointer capture can already be released by the browser.
      }
    });
  }

  function handleImageUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const image = new Image();
    image.onload = () => {
      const data = imageToImageData(image, MAX_SOURCE_SIDE);
      setSource(data, file.name);
      URL.revokeObjectURL(image.src);
    };
    image.src = URL.createObjectURL(file);
  }

  function setSource(imageData, name) {
    state.source = imageData;
    state.sourceName = name;
    state.selection = defaultSelection(imageData.width, imageData.height);
    el.sourceName.textContent = name;
    el.sourceSize.textContent = `${imageData.width} x ${imageData.height}`;
    setupRoiLimits();
    syncControlLabels();
    renderSpatial();
    renderGradient();
    renderFrequencySoon(1);
    renderSpectraSoon(1);
  }

  function defaultSelection(w, h) {
    return {
      x: Math.round(w * 0.22),
      y: Math.round(h * 0.22),
      w: Math.max(24, Math.round(w * 0.25)),
      h: Math.max(24, Math.round(h * 0.28))
    };
  }

  function syncControlLabels() {
    el.kernelValue.textContent = el.kernelSize.value;
    el.sigmaValue.textContent = Number(el.sigma.value).toFixed(1);
    el.radiusValue.textContent = el.freqRadius.value;
    el.bandValue.textContent = el.freqBand.value;
    el.angleValue.textContent = `${el.rotateAngle.value}°`;
    el.shiftXValue.textContent = el.shiftX.value;
    el.shiftYValue.textContent = el.shiftY.value;
    el.scaleValue.textContent = Number(el.scaleAmount.value).toFixed(2);
  }

  function setupRoiLimits() {
    const { width, height } = state.source;
    el.roiX.max = Math.max(0, width - 12);
    el.roiY.max = Math.max(0, height - 12);
    el.roiW.max = width;
    el.roiH.max = height;
    clampSelection();
    syncRoiControls();
  }

  function syncRoiControls() {
    const s = state.selection;
    el.roiX.value = s.x;
    el.roiY.value = s.y;
    el.roiW.value = s.w;
    el.roiH.value = s.h;
    el.roiXValue.textContent = s.x;
    el.roiYValue.textContent = s.y;
    el.roiWValue.textContent = s.w;
    el.roiHValue.textContent = s.h;
    el.roiLabel.textContent = `${s.x}, ${s.y}, ${s.w} x ${s.h}`;
  }

  function clampSelection() {
    const s = state.selection;
    const w = state.source.width;
    const h = state.source.height;
    s.x = clamp(Math.round(s.x), 0, Math.max(0, w - 12));
    s.y = clamp(Math.round(s.y), 0, Math.max(0, h - 12));
    s.w = clamp(Math.round(s.w), 12, w - s.x);
    s.h = clamp(Math.round(s.h), 12, h - s.y);
  }

  function renderSpatial() {
    if (!state.source) return;
    drawImageData(el.originalCanvas, state.source);

    const gray = toGray(state.source);
    const w = state.source.width;
    const h = state.source.height;
    const mode = el.filterMode.value;
    const kernelSize = Number(el.kernelSize.value);
    const sigma = Number(el.sigma.value);
    const start = performance.now();
    const result = applySpatialFilter(gray, w, h, mode, kernelSize, sigma);
    const elapsed = performance.now() - start;

    drawImageData(el.filteredCanvas, grayToImageData(result.output, w, h, result.displayMode));
    el.spatialRuntime.textContent = `${elapsed.toFixed(1)} ms`;
    el.spatialMetrics.innerHTML = metricsHtml([
      ["MAD", meanAbsDiff(gray, result.output).toFixed(2), "平均绝对差"],
      ["Std", stddev(result.output).toFixed(2), "输出标准差"],
      ["Mode", result.label, "当前算子"],
      ["Kernel", `${kernelSize} x ${kernelSize}`, "空间窗口"]
    ]);
    renderSpatialCompare(gray, w, h);
  }

  function applySpatialFilter(gray, w, h, mode, kernelSize, sigma) {
    if (mode === "box") {
      return {
        output: convolve(gray, w, h, boxKernel(kernelSize), kernelSize),
        label: "Box",
        displayMode: "clamp"
      };
    }
    if (mode === "gaussian") {
      return {
        output: convolve(gray, w, h, gaussianKernel(kernelSize, sigma), kernelSize),
        label: "Gaussian",
        displayMode: "clamp"
      };
    }
    if (mode === "median") {
      return {
        output: medianFilter(gray, w, h, kernelSize),
        label: "Median",
        displayMode: "clamp"
      };
    }
    if (mode === "sobel-x" || mode === "sobel-y" || mode === "sobel-mag") {
      const sobel = sobelGradients(gray, w, h);
      const output = mode === "sobel-x" ? sobel.gx : mode === "sobel-y" ? sobel.gy : sobel.mag;
      return {
        output,
        label: mode === "sobel-mag" ? "Sobel |G|" : mode === "sobel-x" ? "Sobel X" : "Sobel Y",
        displayMode: mode === "sobel-mag" ? "normalize" : "signed"
      };
    }
    if (mode === "laplacian") {
      return {
        output: convolve(gray, w, h, [0, -1, 0, -1, 4, -1, 0, -1, 0], 3),
        label: "Laplacian",
        displayMode: "signed"
      };
    }
    return {
      output: convolve(gray, w, h, [0, -1, 0, -1, 5, -1, 0, -1, 0], 3),
      label: "Sharpen",
      displayMode: "clamp"
    };
  }

  function renderSpatialCompare(gray, w, h) {
    const defs = [
      ["Box 5x5", () => convolve(gray, w, h, boxKernel(5), 5), "clamp"],
      ["Gaussian", () => convolve(gray, w, h, gaussianKernel(5, 1.4), 5), "clamp"],
      ["Median 5x5", () => medianFilter(gray, w, h, 5), "clamp"],
      ["Sobel |G|", () => sobelGradients(gray, w, h).mag, "normalize"],
      ["Sharpen", () => convolve(gray, w, h, [0, -1, 0, -1, 5, -1, 0, -1, 0], 3), "clamp"]
    ];
    el.spatialCompare.innerHTML = "";
    defs.forEach(([name, fn, displayMode]) => {
      const start = performance.now();
      const out = fn();
      const ms = performance.now() - start;
      const card = document.createElement("article");
      card.className = "mini-card";
      const header = document.createElement("header");
      header.innerHTML = `<span>${name}</span><small>${ms.toFixed(1)} ms</small>`;
      const canvas = document.createElement("canvas");
      const footer = document.createElement("footer");
      footer.innerHTML = `<span>MAD ${meanAbsDiff(gray, out).toFixed(2)}</span><span>Std ${stddev(out).toFixed(2)}</span>`;
      card.append(header, canvas, footer);
      el.spatialCompare.appendChild(card);
      drawImageData(canvas, grayToImageData(out, w, h, displayMode));
    });
  }

  function renderGradient() {
    if (!state.source) return;
    const gray = toGray(state.source);
    const w = state.source.width;
    const h = state.source.height;
    const sobel = sobelGradients(gray, w, h);
    const stats = gradientStats(sobel, w, h, state.selection);
    drawGradientCanvas(sobel, stats);
    drawPatchCanvas(sobel, stats);
    drawHistogram(el.histCanvas, stats.hist);
    const meanAngle = Number.isFinite(stats.meanAngle) ? `${stats.meanAngle.toFixed(1)}°` : "--";
    const dominantAngle = Number.isFinite(stats.dominantAngle) ? `${stats.dominantAngle.toFixed(1)}°` : "--";
    el.directionLabel.textContent = `主方向 ${dominantAngle}`;
    el.gradientMetrics.innerHTML = metricsHtml([
      ["Mean", meanAngle, "平均方向 atan2(Gy,Gx)"],
      ["Peak", dominantAngle, "幅值加权主方向"],
      ["|G|", stats.avgMag.toFixed(2), "平均梯度幅值"],
      ["Pixels", stats.count, "参与统计像素"]
    ]);
  }

  function gradientStats(sobel, w, h, roi) {
    const hist = new Float64Array(36);
    let sumGx = 0;
    let sumGy = 0;
    let sumMag = 0;
    let count = 0;
    const x0 = clamp(roi.x, 1, w - 2);
    const y0 = clamp(roi.y, 1, h - 2);
    const x1 = clamp(roi.x + roi.w, 1, w - 1);
    const y1 = clamp(roi.y + roi.h, 1, h - 1);
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const i = y * w + x;
        const gx = sobel.gx[i];
        const gy = sobel.gy[i];
        const mag = sobel.mag[i];
        if (mag < 1e-6) continue;
        let angle = Math.atan2(gy, gx) * 180 / Math.PI;
        if (angle < 0) angle += 360;
        const bin = Math.min(35, Math.floor(angle / 10));
        hist[bin] += mag;
        sumGx += gx;
        sumGy += gy;
        sumMag += mag;
        count += 1;
      }
    }
    let dominantBin = 0;
    for (let i = 1; i < hist.length; i += 1) {
      if (hist[i] > hist[dominantBin]) dominantBin = i;
    }
    const meanAngleRaw = Math.atan2(sumGy, sumGx) * 180 / Math.PI;
    return {
      hist,
      count,
      sumGx,
      sumGy,
      avgMag: count ? sumMag / count : 0,
      meanAngle: count ? (meanAngleRaw < 0 ? meanAngleRaw + 360 : meanAngleRaw) : NaN,
      dominantAngle: count ? dominantBin * 10 + 5 : NaN
    };
  }

  function drawGradientCanvas(sobel, stats) {
    const canvas = el.gradientCanvas;
    drawImageData(canvas, state.source);
    const ctx = canvas.getContext("2d");
    const s = state.selection;
    ctx.save();
    ctx.lineWidth = Math.max(2, state.source.width / 180);
    ctx.strokeStyle = "#e76f51";
    ctx.fillStyle = "rgba(231, 111, 81, 0.13)";
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeRect(s.x + 0.5, s.y + 0.5, s.w, s.h);
    if (Number.isFinite(stats.meanAngle)) {
      const cx = s.x + s.w / 2;
      const cy = s.y + s.h / 2;
      const len = Math.max(18, Math.min(s.w, s.h) * 0.36);
      drawArrow(ctx, cx, cy, stats.meanAngle, len, "#0f766e", 5);
    }
    ctx.restore();
  }

  function drawPatchCanvas(sobel, stats) {
    const canvas = el.patchCanvas;
    const ctx = canvas.getContext("2d");
    const s = state.selection;
    canvas.width = 520;
    canvas.height = 340;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f8fafb";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const scale = Math.min((canvas.width - 36) / s.w, (canvas.height - 36) / s.h);
    const drawW = s.w * scale;
    const drawH = s.h * scale;
    const dx = (canvas.width - drawW) / 2;
    const dy = (canvas.height - drawH) / 2;
    const sourceCanvas = imageDataToCanvas(state.source);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sourceCanvas, s.x, s.y, s.w, s.h, dx, dy, drawW, drawH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(dx, dy, drawW, drawH);
    ctx.clip();
    const stride = Math.max(5, Math.round(Math.min(s.w, s.h) / 9));
    for (let yy = s.y + stride; yy < s.y + s.h; yy += stride) {
      for (let xx = s.x + stride; xx < s.x + s.w; xx += stride) {
        const i = yy * state.source.width + xx;
        const mag = sobel.mag[i];
        if (mag < 18) continue;
        let angle = Math.atan2(sobel.gy[i], sobel.gx[i]) * 180 / Math.PI;
        if (angle < 0) angle += 360;
        const px = dx + (xx - s.x) * scale;
        const py = dy + (yy - s.y) * scale;
        const len = clamp(Math.sqrt(mag) * 0.7, 6, 18);
        drawArrow(ctx, px, py, angle, len, "rgba(15, 118, 110, 0.78)", 3);
      }
    }
    ctx.restore();

    ctx.strokeStyle = "#172026";
    ctx.lineWidth = 2;
    ctx.strokeRect(dx + 0.5, dy + 0.5, drawW, drawH);

    if (Number.isFinite(stats.meanAngle)) {
      drawArrow(ctx, 46, 48, stats.meanAngle, 30, "#e76f51", 7);
      ctx.fillStyle = "#172026";
      ctx.font = "700 13px Segoe UI, Microsoft YaHei, sans-serif";
      ctx.fillText(`${stats.meanAngle.toFixed(1)}°`, 84, 52);
    }
  }

  function drawArrow(ctx, x, y, degrees, length, color, width) {
    const rad = degrees * Math.PI / 180;
    const x2 = x + Math.cos(rad) * length;
    const y2 = y + Math.sin(rad) * length;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const head = Math.max(7, width * 2.2);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(rad - 0.55) * head, y2 - Math.sin(rad - 0.55) * head);
    ctx.lineTo(x2 - Math.cos(rad + 0.55) * head, y2 - Math.sin(rad + 0.55) * head);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawHistogram(canvas, hist) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    const maxValue = Math.max(1, ...hist);
    const padding = 34;
    const base = h - 34;
    const plotH = h - 58;
    const barW = (w - padding * 2) / hist.length;

    ctx.strokeStyle = "#dce4e7";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, base);
    ctx.lineTo(w - padding, base);
    ctx.stroke();

    for (let i = 0; i < hist.length; i += 1) {
      const value = hist[i] / maxValue;
      const barH = value * plotH;
      const x = padding + i * barW;
      const y = base - barH;
      const color = spectralColor(i / (hist.length - 1));
      ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
      ctx.fillRect(x + 1, y, Math.max(1, barW - 2), barH);
    }

    ctx.fillStyle = "#66737c";
    ctx.font = "700 12px Segoe UI, Microsoft YaHei, sans-serif";
    for (let deg = 0; deg <= 360; deg += 60) {
      const x = padding + (deg / 360) * (w - padding * 2);
      ctx.fillText(`${deg}°`, x - 12, h - 12);
    }
  }

  function renderFrequencySoon(delay) {
    clearTimeout(state.frequencyTimer);
    state.frequencyTimer = setTimeout(renderFrequency, delay);
  }

  function renderFrequency() {
    if (!state.source) return;
    const n = Number(el.fftSize.value);
    el.fftLabel.textContent = `${n} x ${n}`;
    const gray = resizeToSquareGray(state.source, n);
    drawFloatImage(el.freqOriginalCanvas, gray, n);

    const start = performance.now();
    const spectrum = centeredFft(gray, n);
    const fftMs = performance.now() - start;
    drawSpectrum(el.spectrumCanvas, spectrum.re, spectrum.im, n);

    const radius = Number(el.freqRadius.value);
    const band = Number(el.freqBand.value);
    const mask = makeFrequencyMask(n, el.freqFilter.value, radius, band);
    drawMask(el.maskCanvas, mask, n);
    el.maskLabel.textContent = mask.label;

    const filteredRe = spectrum.re.slice();
    const filteredIm = spectrum.im.slice();
    let totalEnergy = 0;
    let keptEnergy = 0;
    for (let i = 0; i < filteredRe.length; i += 1) {
      const energy = spectrum.re[i] * spectrum.re[i] + spectrum.im[i] * spectrum.im[i];
      totalEnergy += energy;
      keptEnergy += energy * mask.values[i] * mask.values[i];
      filteredRe[i] *= mask.values[i];
      filteredIm[i] *= mask.values[i];
    }
    drawSpectrum(el.filteredSpectrumCanvas, filteredRe, filteredIm, n);

    const invStart = performance.now();
    const restored = inverseCenteredFft(filteredRe, filteredIm, n);
    const invMs = performance.now() - invStart;
    drawFloatImage(el.freqResultCanvas, restored, n, "auto");
    el.energyLabel.textContent = `${(keptEnergy / Math.max(totalEnergy, 1) * 100).toFixed(1)}% energy`;
    el.inverseLabel.textContent = `${(fftMs + invMs).toFixed(1)} ms`;
  }

  function renderSpectraSoon(delay) {
    clearTimeout(state.spectraTimer);
    state.spectraTimer = setTimeout(renderSpectraComparison, delay);
  }

  function renderSpectraComparison() {
    if (!state.source) return;
    const n = Number(el.fftSize.value);
    const base = resizeToSquareGray(state.source, n);
    const angle = Number(el.rotateAngle.value);
    const shiftX = Number(el.shiftX.value);
    const shiftY = Number(el.shiftY.value);
    const scale = Number(el.scaleAmount.value);
    const variants = [
      {
        title: "原图",
        key: "original",
        data: base,
        caption: "基准谱图"
      },
      {
        title: `旋转 ${angle}°`,
        key: "rotated",
        data: rotateGray(base, n, angle),
        caption: "幅度谱同步旋转"
      },
      {
        title: `平移 ${shiftX}, ${shiftY}`,
        key: "shifted",
        data: circularShiftGray(base, n, shiftX, shiftY),
        caption: "幅度谱保持，相位改变"
      },
      {
        title: `缩放 ${scale.toFixed(2)}`,
        key: "scaled",
        data: scaleGray(base, n, scale),
        caption: "空间缩放引起频域反向尺度变化"
      }
    ];

    const spectra = variants.map((variant) => {
      const fft = centeredFft(variant.data, n);
      return { ...variant, fft, log: spectrumLogArray(fft.re, fft.im) };
    });
    const baseLog = spectra[0].log;

    el.spectrumCompareGrid.innerHTML = "";
    spectra.forEach((item, index) => {
      const card = document.createElement("article");
      card.className = "mini-card";
      const header = document.createElement("header");
      const corr = index === 0 ? 1 : correlation(baseLog, item.log);
      header.innerHTML = `<span>${item.title}</span><small>r ${corr.toFixed(3)}</small>`;
      const imageCanvas = document.createElement("canvas");
      const spectrumCanvas = document.createElement("canvas");
      const footer = document.createElement("footer");
      footer.innerHTML = `<span>${item.caption}</span>`;
      card.append(header, imageCanvas, spectrumCanvas, footer);
      el.spectrumCompareGrid.appendChild(card);
      drawFloatImage(imageCanvas, item.data, n);
      drawSpectrum(spectrumCanvas, item.fft.re, item.fft.im, n);
    });

    el.spectrumNotes.innerHTML = [
      ["旋转", "图像旋转后，频谱幅度也围绕中心旋转；强边缘方向会在谱图中换到对应角度。"],
      ["平移", "循环平移不改变幅度谱，主要改变傅里叶相位，因此相关系数接近 1。"],
      ["缩放", "空间域放大通常压缩频域结构；空间域缩小会让频谱向外扩展。"]
    ].map(([title, text]) => `<div class="note"><strong>${title}</strong>${text}</div>`).join("");
  }

  function createSampleImage() {
    const w = 384;
    const h = 256;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    const image = ctx.createImageData(w, h);
    const d = image.data;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const i = (y * w + x) * 4;
        const diagonal = Math.sin((x + y) * 0.085) * 22;
        const vertical = Math.sin(x * 0.18) * 18;
        const circular = Math.hypot(x - 290, y - 84) < 52 ? 72 : 0;
        const block = x > 44 && x < 142 && y > 58 && y < 166 ? 58 : 0;
        const line = Math.abs(y - (0.42 * x + 28)) < 3 ? 95 : 0;
        d[i] = clamp(52 + x * 0.34 + diagonal + block + line, 0, 255);
        d[i + 1] = clamp(76 + y * 0.52 + vertical + circular + line * 0.28, 0, 255);
        d[i + 2] = clamp(116 + (w - x) * 0.22 + Math.sin((x - y) * 0.055) * 34 + circular * 0.34, 0, 255);
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);

    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = "#172026";
    ctx.fillRect(202, 146, 122, 64);
    ctx.fillStyle = "#f8fafb";
    ctx.font = "800 54px Segoe UI, Arial, sans-serif";
    ctx.fillText("A2", 232, 197);
    ctx.strokeStyle = "#e76f51";
    ctx.lineWidth = 5;
    ctx.strokeRect(44, 58, 98, 108);
    ctx.strokeStyle = "#0f766e";
    ctx.beginPath();
    ctx.arc(290, 84, 52, 0, TAU);
    ctx.stroke();
    ctx.restore();

    return ctx.getImageData(0, 0, w, h);
  }

  function imageToImageData(image, maxSide) {
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const w = Math.max(1, Math.round(image.naturalWidth * scale));
    const h = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  }

  function imageDataToCanvas(imageData) {
    const canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    canvas.getContext("2d").putImageData(imageData, 0, 0);
    return canvas;
  }

  function drawImageData(canvas, imageData) {
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    canvas.getContext("2d").putImageData(imageData, 0, 0);
  }

  function toGray(imageData) {
    const out = new Float64Array(imageData.width * imageData.height);
    const d = imageData.data;
    for (let i = 0, j = 0; i < d.length; i += 4, j += 1) {
      out[j] = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    }
    return out;
  }

  function grayToImageData(gray, w, h, mode = "clamp") {
    const out = new ImageData(w, h);
    const d = out.data;
    let min = Infinity;
    let max = -Infinity;
    if (mode === "normalize" || mode === "signed") {
      for (let i = 0; i < gray.length; i += 1) {
        if (gray[i] < min) min = gray[i];
        if (gray[i] > max) max = gray[i];
      }
      if (mode === "signed") {
        const abs = Math.max(Math.abs(min), Math.abs(max), 1);
        min = -abs;
        max = abs;
      }
    }
    for (let i = 0, j = 0; i < d.length; i += 4, j += 1) {
      let v = gray[j];
      if (mode === "normalize" || mode === "signed") {
        v = (v - min) / Math.max(1e-9, max - min) * 255;
      }
      v = clamp(Math.round(v), 0, 255);
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = 255;
    }
    return out;
  }

  function boxKernel(size) {
    return new Array(size * size).fill(1 / (size * size));
  }

  function gaussianKernel(size, sigma) {
    const kernel = [];
    const r = Math.floor(size / 2);
    let sum = 0;
    for (let y = -r; y <= r; y += 1) {
      for (let x = -r; x <= r; x += 1) {
        const value = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
        kernel.push(value);
        sum += value;
      }
    }
    return kernel.map((value) => value / sum);
  }

  function convolve(gray, w, h, kernel, size) {
    const out = new Float64Array(gray.length);
    const r = Math.floor(size / 2);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        let acc = 0;
        for (let ky = -r; ky <= r; ky += 1) {
          const yy = clamp(y + ky, 0, h - 1);
          for (let kx = -r; kx <= r; kx += 1) {
            const xx = clamp(x + kx, 0, w - 1);
            const kv = kernel[(ky + r) * size + (kx + r)];
            acc += gray[yy * w + xx] * kv;
          }
        }
        out[y * w + x] = acc;
      }
    }
    return out;
  }

  function medianFilter(gray, w, h, size) {
    const out = new Float64Array(gray.length);
    const r = Math.floor(size / 2);
    const values = new Array(size * size);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        let n = 0;
        for (let ky = -r; ky <= r; ky += 1) {
          const yy = clamp(y + ky, 0, h - 1);
          for (let kx = -r; kx <= r; kx += 1) {
            const xx = clamp(x + kx, 0, w - 1);
            values[n] = gray[yy * w + xx];
            n += 1;
          }
        }
        values.length = n;
        values.sort((a, b) => a - b);
        out[y * w + x] = values[Math.floor(n / 2)];
        values.length = size * size;
      }
    }
    return out;
  }

  function sobelGradients(gray, w, h) {
    const gx = new Float64Array(gray.length);
    const gy = new Float64Array(gray.length);
    const mag = new Float64Array(gray.length);
    const kx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const ky = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        let sx = 0;
        let sy = 0;
        for (let yy = -1; yy <= 1; yy += 1) {
          const py = clamp(y + yy, 0, h - 1);
          for (let xx = -1; xx <= 1; xx += 1) {
            const px = clamp(x + xx, 0, w - 1);
            const idx = (yy + 1) * 3 + (xx + 1);
            const v = gray[py * w + px];
            sx += v * kx[idx];
            sy += v * ky[idx];
          }
        }
        const i = y * w + x;
        gx[i] = sx;
        gy[i] = sy;
        mag[i] = Math.hypot(sx, sy);
      }
    }
    return { gx, gy, mag };
  }

  function resizeToSquareGray(imageData, n) {
    const src = toGray(imageData);
    const sw = imageData.width;
    const sh = imageData.height;
    const out = new Float64Array(n * n);
    const scale = Math.min(n / sw, n / sh);
    const dw = sw * scale;
    const dh = sh * scale;
    const ox = (n - dw) / 2;
    const oy = (n - dh) / 2;
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        const sx = (x - ox) / scale;
        const sy = (y - oy) / scale;
        out[y * n + x] = sampleGray(src, sw, sh, sx, sy);
      }
    }
    return out;
  }

  function centeredFft(gray, n) {
    const re = new Float64Array(n * n);
    const im = new Float64Array(n * n);
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        const i = y * n + x;
        re[i] = ((x + y) & 1 ? -gray[i] : gray[i]);
      }
    }
    fft2d(re, im, n, false);
    return { re, im };
  }

  function inverseCenteredFft(re, im, n) {
    fft2d(re, im, n, true);
    const out = new Float64Array(n * n);
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        const i = y * n + x;
        out[i] = ((x + y) & 1 ? -re[i] : re[i]);
      }
    }
    return out;
  }

  function fft2d(re, im, n, inverse) {
    const rowRe = new Float64Array(n);
    const rowIm = new Float64Array(n);
    for (let y = 0; y < n; y += 1) {
      const offset = y * n;
      for (let x = 0; x < n; x += 1) {
        rowRe[x] = re[offset + x];
        rowIm[x] = im[offset + x];
      }
      fft1d(rowRe, rowIm, inverse);
      for (let x = 0; x < n; x += 1) {
        re[offset + x] = rowRe[x];
        im[offset + x] = rowIm[x];
      }
    }
    const colRe = new Float64Array(n);
    const colIm = new Float64Array(n);
    for (let x = 0; x < n; x += 1) {
      for (let y = 0; y < n; y += 1) {
        const i = y * n + x;
        colRe[y] = re[i];
        colIm[y] = im[i];
      }
      fft1d(colRe, colIm, inverse);
      for (let y = 0; y < n; y += 1) {
        const i = y * n + x;
        re[i] = colRe[y];
        im[i] = colIm[y];
      }
    }
  }

  function fft1d(re, im, inverse) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i += 1) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        const tr = re[i];
        const ti = im[i];
        re[i] = re[j];
        im[i] = im[j];
        re[j] = tr;
        im[j] = ti;
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const angle = (inverse ? TAU : -TAU) / len;
      const wLenRe = Math.cos(angle);
      const wLenIm = Math.sin(angle);
      for (let i = 0; i < n; i += len) {
        let wRe = 1;
        let wIm = 0;
        for (let j = 0; j < len / 2; j += 1) {
          const uRe = re[i + j];
          const uIm = im[i + j];
          const vRe = re[i + j + len / 2] * wRe - im[i + j + len / 2] * wIm;
          const vIm = re[i + j + len / 2] * wIm + im[i + j + len / 2] * wRe;
          re[i + j] = uRe + vRe;
          im[i + j] = uIm + vIm;
          re[i + j + len / 2] = uRe - vRe;
          im[i + j + len / 2] = uIm - vIm;
          const nextRe = wRe * wLenRe - wIm * wLenIm;
          const nextIm = wRe * wLenIm + wIm * wLenRe;
          wRe = nextRe;
          wIm = nextIm;
        }
      }
    }
    if (inverse) {
      for (let i = 0; i < n; i += 1) {
        re[i] /= n;
        im[i] /= n;
      }
    }
  }

  function makeFrequencyMask(n, type, radius, band) {
    const values = new Float64Array(n * n);
    const center = n / 2;
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        const d = Math.hypot(x - center, y - center);
        let v = 1;
        if (type === "ideal-low") v = d <= radius ? 1 : 0;
        else if (type === "ideal-high") v = d >= radius ? 1 : 0;
        else if (type === "gaussian-low") v = Math.exp(-(d * d) / (2 * radius * radius));
        else if (type === "gaussian-high") v = 1 - Math.exp(-(d * d) / (2 * radius * radius));
        else if (type === "band-pass") v = Math.abs(d - radius) <= band / 2 ? 1 : 0;
        else if (type === "band-stop") v = Math.abs(d - radius) <= band / 2 ? 0 : 1;
        values[y * n + x] = v;
      }
    }
    const labels = {
      "ideal-low": `LP r=${radius}`,
      "ideal-high": `HP r=${radius}`,
      "gaussian-low": `GLP σ=${radius}`,
      "gaussian-high": `GHP σ=${radius}`,
      "band-pass": `BP ${radius}/${band}`,
      "band-stop": `BS ${radius}/${band}`
    };
    return { values, label: labels[type] || type };
  }

  function drawFloatImage(canvas, gray, n, mode = "clamp") {
    const image = new ImageData(n, n);
    const d = image.data;
    let min = Infinity;
    let max = -Infinity;
    if (mode === "auto") {
      for (let i = 0; i < gray.length; i += 1) {
        if (gray[i] < min) min = gray[i];
        if (gray[i] > max) max = gray[i];
      }
    }
    for (let i = 0, j = 0; i < d.length; i += 4, j += 1) {
      let value = gray[j];
      if (mode === "auto") value = (value - min) / Math.max(1e-9, max - min) * 255;
      value = clamp(Math.round(value), 0, 255);
      d[i] = value;
      d[i + 1] = value;
      d[i + 2] = value;
      d[i + 3] = 255;
    }
    drawImageData(canvas, image);
  }

  function drawSpectrum(canvas, re, im, n) {
    const logs = spectrumLogArray(re, im);
    const sorted = Array.from(logs).sort((a, b) => a - b);
    const min = sorted[Math.floor(sorted.length * 0.02)];
    const max = sorted[Math.floor(sorted.length * 0.995)];
    const image = new ImageData(n, n);
    const d = image.data;
    for (let i = 0, j = 0; i < d.length; i += 4, j += 1) {
      const t = clamp((logs[j] - min) / Math.max(1e-9, max - min), 0, 1);
      const c = spectralColor(t);
      d[i] = c[0];
      d[i + 1] = c[1];
      d[i + 2] = c[2];
      d[i + 3] = 255;
    }
    drawImageData(canvas, image);
  }

  function drawMask(canvas, mask, n) {
    const image = new ImageData(n, n);
    const d = image.data;
    for (let i = 0, j = 0; i < d.length; i += 4, j += 1) {
      const t = clamp(mask.values[j], 0, 1);
      d[i] = Math.round(20 + t * 235);
      d[i + 1] = Math.round(38 + t * 180);
      d[i + 2] = Math.round(46 + t * 120);
      d[i + 3] = 255;
    }
    drawImageData(canvas, image);
  }

  function spectrumLogArray(re, im) {
    const out = new Float64Array(re.length);
    for (let i = 0; i < re.length; i += 1) {
      out[i] = Math.log1p(Math.hypot(re[i], im[i]));
    }
    return out;
  }

  function rotateGray(gray, n, degrees) {
    const out = new Float64Array(n * n);
    const rad = -degrees * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const c = (n - 1) / 2;
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        const dx = x - c;
        const dy = y - c;
        const sx = c + dx * cos - dy * sin;
        const sy = c + dx * sin + dy * cos;
        out[y * n + x] = sampleGray(gray, n, n, sx, sy);
      }
    }
    return out;
  }

  function circularShiftGray(gray, n, dx, dy) {
    const out = new Float64Array(n * n);
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        const sx = mod(x - dx, n);
        const sy = mod(y - dy, n);
        out[y * n + x] = gray[sy * n + sx];
      }
    }
    return out;
  }

  function scaleGray(gray, n, scale) {
    const out = new Float64Array(n * n);
    const c = (n - 1) / 2;
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        const sx = c + (x - c) / scale;
        const sy = c + (y - c) / scale;
        out[y * n + x] = sampleGray(gray, n, n, sx, sy);
      }
    }
    return out;
  }

  function sampleGray(gray, w, h, x, y) {
    if (x < 0 || y < 0 || x > w - 1 || y > h - 1) return 0;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(w - 1, x0 + 1);
    const y1 = Math.min(h - 1, y0 + 1);
    const tx = x - x0;
    const ty = y - y0;
    const a = gray[y0 * w + x0];
    const b = gray[y0 * w + x1];
    const c = gray[y1 * w + x0];
    const d = gray[y1 * w + x1];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  }

  function spectralColor(t) {
    const stops = [
      [0.00, [15, 23, 42]],
      [0.20, [37, 99, 235]],
      [0.46, [15, 118, 110]],
      [0.70, [216, 156, 20]],
      [0.88, [231, 111, 81]],
      [1.00, [255, 255, 255]]
    ];
    for (let i = 0; i < stops.length - 1; i += 1) {
      const [p0, c0] = stops[i];
      const [p1, c1] = stops[i + 1];
      if (t >= p0 && t <= p1) {
        const k = (t - p0) / (p1 - p0);
        return [
          Math.round(c0[0] + (c1[0] - c0[0]) * k),
          Math.round(c0[1] + (c1[1] - c0[1]) * k),
          Math.round(c0[2] + (c1[2] - c0[2]) * k)
        ];
      }
    }
    return stops[stops.length - 1][1];
  }

  function canvasPointToImage(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clamp(Math.round((event.clientX - rect.left) / rect.width * canvas.width), 0, canvas.width - 1),
      y: clamp(Math.round((event.clientY - rect.top) / rect.height * canvas.height), 0, canvas.height - 1)
    };
  }

  function metricsHtml(items) {
    return items.map(([title, value, label]) => (
      `<div class="metric"><strong>${value}</strong><span>${title} · ${label}</span></div>`
    )).join("");
  }

  function meanAbsDiff(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i += 1) sum += Math.abs(a[i] - b[i]);
    return sum / a.length;
  }

  function stddev(values) {
    let sum = 0;
    for (let i = 0; i < values.length; i += 1) sum += values[i];
    const mean = sum / values.length;
    let variance = 0;
    for (let i = 0; i < values.length; i += 1) {
      const d = values[i] - mean;
      variance += d * d;
    }
    return Math.sqrt(variance / values.length);
  }

  function correlation(a, b) {
    let sumA = 0;
    let sumB = 0;
    for (let i = 0; i < a.length; i += 1) {
      sumA += a[i];
      sumB += b[i];
    }
    const meanA = sumA / a.length;
    const meanB = sumB / b.length;
    let num = 0;
    let denA = 0;
    let denB = 0;
    for (let i = 0; i < a.length; i += 1) {
      const da = a[i] - meanA;
      const db = b[i] - meanB;
      num += da * db;
      denA += da * da;
      denB += db * db;
    }
    return num / Math.max(1e-9, Math.sqrt(denA * denB));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function mod(value, n) {
    return ((value % n) + n) % n;
  }
})();
