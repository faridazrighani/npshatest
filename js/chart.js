(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory(require("./formulas.js"));
  } else {
    root.MoodyChart = factory(root.MoodyFormulas);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (formulas) {
  const chartRoughnessFamilies = [
    0,
    1e-6,
    5e-6,
    1e-5,
    5e-5,
    1e-4,
    2e-4,
    5e-4,
    1e-3,
    2e-3,
    5e-3,
    1e-2,
    2e-2,
    5e-2
  ];

  const curvePalette = [
    "rgba(117, 155, 184, 0.78)",
    "rgba(108, 148, 180, 0.8)",
    "rgba(100, 141, 176, 0.82)",
    "rgba(92, 134, 172, 0.84)",
    "rgba(84, 126, 167, 0.86)",
    "rgba(76, 119, 163, 0.88)",
    "rgba(68, 111, 158, 0.9)",
    "rgba(60, 103, 151, 0.92)",
    "rgba(54, 94, 143, 0.94)",
    "rgba(48, 87, 134, 0.95)",
    "rgba(42, 79, 124, 0.96)",
    "rgba(37, 72, 114, 0.97)",
    "rgba(31, 64, 103, 0.98)",
    "rgba(26, 57, 92, 0.99)"
  ];

  function getChartLabel(roughnessFamily) {
    if (roughnessFamily === 0) return "Smooth pipes";
    if (roughnessFamily >= 0.01) return roughnessFamily.toFixed(2);
    if (roughnessFamily >= 0.001) return roughnessFamily.toFixed(3);
    if (roughnessFamily >= 0.0001) return roughnessFamily.toFixed(4);
    if (roughnessFamily >= 0.00001) return roughnessFamily.toFixed(5);
    return roughnessFamily.toExponential(0).replace("+", "");
  }

  function formatReTick(tick) {
    if (tick < 1000) {
      return String(tick);
    }
    return tick.toExponential(0).replace("+", "");
  }

  function buildTickSet(ticks) {
    const set = new Set();
    ticks.forEach(function (tick) {
      set.add(tick.toPrecision(12));
    });
    return set;
  }

  function getMinorLogTicks(min, max, majorTicks, multipliers) {
    const ticks = [];
    const majorTickSet = buildTickSet(majorTicks);
    const minExponent = Math.floor(formulas.log10(min)) - 1;
    const maxExponent = Math.ceil(formulas.log10(max)) + 1;

    for (let exponent = minExponent; exponent <= maxExponent; exponent += 1) {
      multipliers.forEach(function (multiplier) {
        const tick = multiplier * Math.pow(10, exponent);
        if (tick <= min || tick >= max) {
          return;
        }
        if (majorTickSet.has(tick.toPrecision(12))) {
          return;
        }
        ticks.push(tick);
      });
    }

    ticks.sort(function (left, right) {
      return left - right;
    });

    return ticks;
  }

  function getChartResponsiveConfig(width) {
    const isPhone = width < 540;
    const isCompact = width < 760;
    const isTablet = width < 1080;
    const minorXMultipliers = isPhone
      ? [2, 5]
      : isCompact
        ? [2, 3, 5, 7]
        : [2, 3, 4, 5, 6, 7, 8, 9];
    const minorYMultipliers = [2, 3, 4, 5, 6, 7, 8, 9];

    return {
      isPhone,
      isCompact,
      isTablet,
      height: isPhone 
        ? Math.max(380, width * 1.05)
        : Math.max(
            isCompact ? 360 : isTablet ? 400 : 440,
            Math.min(width * (isCompact ? 0.76 : isTablet ? 0.64 : 0.6), isCompact ? 500 : isTablet ? 580 : 660)
          ),
      margin: isPhone
        ? { top: 64, right: 36, bottom: 62, left: 76 }
        : isCompact
          ? { top: 64, right: 42, bottom: 64, left: 86 }
          : isTablet
            ? { top: 64, right: 50, bottom: 64, left: 96 }
            : { top: 64, right: 58, bottom: 62, left: 106 },
      xTicks: isPhone
        ? [1e3, 4e3, 1e5, 1e7]
        : isCompact
          ? [600, 2e3, 4e3, 1e4, 1e6, 1e8]
          : [600, 1e3, 2e3, 4e3, 1e4, 1e5, 1e6, 1e7, 1e8],
      yTicks: isPhone
        ? [0.01, 0.02, 0.04, 0.08, 0.12]
        : isCompact
          ? [0.008, 0.015, 0.02, 0.03, 0.04, 0.06, 0.08, 0.1, 0.12]
          : [0.008, 0.01, 0.015, 0.02, 0.03, 0.04, 0.06, 0.08, 0.1, 0.12],
      tickFontSize: isPhone ? 10 : isCompact ? 11 : 12,
      axisFontSize: isPhone ? 11 : isCompact ? 12 : 13,
      yAxisFontSize: isPhone ? 10.2 : isCompact ? 11.3 : 13,
      titleFontSize: isPhone ? 9.3 : isCompact ? 10.8 : 14,
      roughnessLabelFontSize: isPhone ? 9 : isCompact ? 10 : 11,
      pointCardWidth: isPhone ? 134 : isCompact ? 164 : 210,
      pointCardHeight: isPhone ? 58 : isCompact ? 64 : 72,
      pointRadius: isPhone ? 5.5 : 6.2,
      majorGridColor: isPhone ? "rgba(24, 36, 51, 0.12)" : "rgba(24, 36, 51, 0.15)",
      minorGridColor: isPhone ? "rgba(24, 36, 51, 0.045)" : isCompact ? "rgba(24, 36, 51, 0.055)" : "rgba(24, 36, 51, 0.065)",
      axisBorderColor: "rgba(24, 36, 51, 0.48)",
      minorGridLineWidth: isPhone ? 0.45 : 0.55,
      majorGridLineWidth: isPhone ? 0.8 : 0.95,
      curveLineWidth: isPhone ? 1.05 : isCompact ? 1.15 : 1.2,
      minorXTicks: getMinorLogTicks(formulas.RE_MIN, formulas.RE_MAX, isPhone
        ? [1e3, 4e3, 1e5, 1e7]
        : isCompact
          ? [600, 2e3, 4e3, 1e4, 1e6, 1e8]
          : [600, 1e3, 2e3, 4e3, 1e4, 1e5, 1e6, 1e7, 1e8], minorXMultipliers),
      minorYTicks: getMinorLogTicks(formulas.F_MIN, formulas.F_MAX, isPhone
        ? [0.01, 0.02, 0.04, 0.08, 0.12]
        : isCompact
          ? [0.008, 0.015, 0.02, 0.03, 0.04, 0.06, 0.08, 0.1, 0.12]
          : [0.008, 0.01, 0.015, 0.02, 0.03, 0.04, 0.06, 0.08, 0.1, 0.12], minorYMultipliers),
      roughnessLabelIndices: isPhone ? [0, 7, 10, 13] : isCompact ? [0, 4, 8, 10, 13] : [0, 4, 7, 9, 11, 13],
      roughnessLabelRe: isPhone ? 2e7 : isCompact ? 4e7 : 7e7,
      roughnessTitleLines: isPhone
        ? ["Relative roughness", "families, epsilon / D"]
        : isCompact
          ? ["Relative roughness families,", "epsilon / D"]
          : ["Relative roughness families, epsilon / D"],
      roughnessTitleAlign: "right",
      roughnessTitleLineHeight: isPhone ? 11.5 : 12.5,
      roughnessTitleY: isPhone ? 30 : isCompact ? 30 : 29,
      xAxisTitle: isPhone ? "Reynolds number" : "Reynolds number, Re",
      yAxisTitle: "Darcy friction factor, f",
      yAxisTitleOffsetX: isPhone ? 29 : isCompact ? 32 : 34,
      laminarLabel: isPhone ? "Laminar 64/Re" : "Laminar: f = 64 / Re",
      transitionLabel: isPhone ? "Trans." : "Transition",
      showPointCard: width >= 360
    };
  }

  function roundRect(context, x, y, width, height, radius, fill, stroke) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
    if (fill) {
      context.fill();
    }
    if (stroke) {
      context.stroke();
    }
  }

  function drawMultilineText(context, lines, x, y, lineHeight, align) {
    const safeLines = Array.isArray(lines) ? lines : [String(lines)];
    const totalHeight = (safeLines.length - 1) * lineHeight;

    context.textAlign = align;
    context.textBaseline = "middle";

    safeLines.forEach(function (line, index) {
      context.fillText(line, x, y - totalHeight / 2 + index * lineHeight);
    });
  }

  function niceLinearStep(value, round) {
    const exponent = Math.floor(Math.log10(value));
    const fraction = value / Math.pow(10, exponent);
    let niceFraction;

    if (round) {
      if (fraction < 1.5) {
        niceFraction = 1;
      } else if (fraction < 3) {
        niceFraction = 2;
      } else if (fraction < 7) {
        niceFraction = 5;
      } else {
        niceFraction = 10;
      }
    } else if (fraction <= 1) {
      niceFraction = 1;
    } else if (fraction <= 2) {
      niceFraction = 2;
    } else if (fraction <= 5) {
      niceFraction = 5;
    } else {
      niceFraction = 10;
    }

    return niceFraction * Math.pow(10, exponent);
  }

  function buildLinearTicks(min, max, targetCount) {
    if (!(Number.isFinite(min) && Number.isFinite(max))) {
      return [0, 1];
    }

    if (max === min) {
      return [min, max + 1];
    }

    const range = niceLinearStep(max - min, false);
    const step = niceLinearStep(range / Math.max(targetCount - 1, 1), true);
    const tickMin = Math.floor(min / step) * step;
    const tickMax = Math.ceil(max / step) * step;
    const ticks = [];

    for (let tick = tickMin; tick <= tickMax + step * 0.5; tick += step) {
      ticks.push(Number(tick.toPrecision(12)));
    }

    return ticks;
  }

  function formatFlowTick(value) {
    return formulas.formatFixed(value, 4);
  }

  function formatHeadTick(value) {
    return formulas.formatFixed(value, 4);
  }

  function getSystemCurveResponsiveConfig(width) {
    const isPhone = width < 540;
    const isCompact = width < 760;
    const isTablet = width < 1080;

    return {
      isPhone: isPhone,
      isCompact: isCompact,
      isTablet: isTablet,
      height: isPhone
        ? 290
        : isCompact
          ? 300
          : isTablet
            ? 320
            : 340,
      margin: isPhone
        ? { top: 30, right: 18, bottom: 52, left: 60 }
        : isCompact
          ? { top: 30, right: 22, bottom: 54, left: 66 }
          : { top: 30, right: 26, bottom: 56, left: 74 },
      tickFontSize: isPhone ? 10 : isCompact ? 11 : 12,
      axisFontSize: isPhone ? 11 : isCompact ? 12 : 13,
      titleFontSize: isPhone ? 13 : isCompact ? 14 : 15,
      xTickTarget: isPhone ? 5 : 6,
      yTickTarget: isPhone ? 5 : 6,
      showPointCard: width >= 390
    };
  }

  function drawChart(canvas, scenario) {
    if (!canvas || typeof canvas.getContext !== "function" || typeof window === "undefined") {
      return;
    }

    const context = canvas.getContext("2d");
    const parentWidth = canvas.parentElement ? canvas.parentElement.clientWidth : 0;
    const cssWidth = canvas.clientWidth || parentWidth || canvas.width;
    if (!cssWidth) {
      return;
    }

    const ratio = Math.min(window.devicePixelRatio || 1, 2.25);
    const responsive = getChartResponsiveConfig(cssWidth);
    const cssHeight = responsive.height;

    canvas.width = cssWidth * ratio;
    canvas.height = cssHeight * ratio;
    canvas.style.height = cssHeight + "px";

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, cssWidth, cssHeight);
    context.imageSmoothingEnabled = true;
    context.lineJoin = "round";
    context.lineCap = "round";

    const margin = responsive.margin;
    const plotWidth = cssWidth - margin.left - margin.right;
    const plotHeight = cssHeight - margin.top - margin.bottom;

    const xForRe = function (reynolds) {
      return margin.left + ((formulas.log10(reynolds) - formulas.log10(formulas.RE_MIN)) / (formulas.log10(formulas.RE_MAX) - formulas.log10(formulas.RE_MIN))) * plotWidth;
    };
    const yForF = function (frictionFactor) {
      return margin.top + ((formulas.log10(formulas.F_MAX) - formulas.log10(frictionFactor)) / (formulas.log10(formulas.F_MAX) - formulas.log10(formulas.F_MIN))) * plotHeight;
    };

    const transitionStart = xForRe(formulas.LAMINAR_LIMIT);
    const transitionEnd = xForRe(formulas.TRANSITION_LIMIT);
    const plotGradient = context.createLinearGradient(margin.left, margin.top, margin.left, margin.top + plotHeight);
    plotGradient.addColorStop(0, "rgba(255, 255, 255, 0.98)");
    plotGradient.addColorStop(1, "rgba(243, 247, 251, 0.98)");
    context.fillStyle = plotGradient;
    context.fillRect(margin.left, margin.top, plotWidth, plotHeight);

    const transitionGradient = context.createLinearGradient(transitionStart, margin.top, transitionEnd, margin.top);
    transitionGradient.addColorStop(0, "rgba(163, 106, 56, 0.05)");
    transitionGradient.addColorStop(0.5, "rgba(163, 106, 56, 0.1)");
    transitionGradient.addColorStop(1, "rgba(163, 106, 56, 0.04)");
    context.fillStyle = transitionGradient;
    context.fillRect(transitionStart, margin.top, transitionEnd - transitionStart, plotHeight);

    context.strokeStyle = responsive.minorGridColor;
    context.lineWidth = responsive.minorGridLineWidth;
    responsive.minorXTicks.forEach(function (tick) {
      const x = xForRe(tick);
      context.beginPath();
      context.moveTo(x, margin.top);
      context.lineTo(x, margin.top + plotHeight);
      context.stroke();
    });

    responsive.minorYTicks.forEach(function (tick) {
      const y = yForF(tick);
      context.beginPath();
      context.moveTo(margin.left, y);
      context.lineTo(margin.left + plotWidth, y);
      context.stroke();
    });

    context.strokeStyle = responsive.majorGridColor;
    context.lineWidth = responsive.majorGridLineWidth;
    context.font = responsive.tickFontSize + 'px "Aptos", "Segoe UI Variable", "Segoe UI", sans-serif';
    context.fillStyle = "#5f6f81";
    context.textBaseline = "middle";

    context.textAlign = "center";
    responsive.xTicks.forEach(function (tick) {
      const x = xForRe(tick);
      context.beginPath();
      context.moveTo(x, margin.top);
      context.lineTo(x, margin.top + plotHeight);
      context.stroke();
      context.fillText(formatReTick(tick), x, cssHeight - margin.bottom + 20);
    });

    context.textAlign = "right";
    responsive.yTicks.forEach(function (tick) {
      const y = yForF(tick);
      context.beginPath();
      context.moveTo(margin.left, y);
      context.lineTo(margin.left + plotWidth, y);
      context.stroke();
      context.fillText(String(tick), margin.left - 8, y);
    });

    context.strokeStyle = responsive.axisBorderColor;
    context.lineWidth = 1.2;
    context.strokeRect(margin.left, margin.top, plotWidth, plotHeight);

    context.save();
    context.fillStyle = "#182433";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "700 " + responsive.axisFontSize + 'px "Aptos", "Segoe UI Variable", "Segoe UI", sans-serif';
    context.fillText(responsive.xAxisTitle, margin.left + plotWidth / 2, cssHeight - margin.bottom * 0.25);
    context.font = "700 " + responsive.yAxisFontSize + 'px "Aptos", "Segoe UI Variable", "Segoe UI", sans-serif';
    context.translate(responsive.yAxisTitleOffsetX, margin.top + plotHeight / 2);
    context.rotate(-Math.PI / 2);
    context.fillText(responsive.yAxisTitle, 0, 0);
    context.restore();

    context.fillStyle = "#183956";
    context.font = "700 " + responsive.titleFontSize + 'px Cambria, Georgia, "Times New Roman", serif';
    drawMultilineText(
      context,
      responsive.roughnessTitleLines,
      responsive.roughnessTitleAlign === "center" ? margin.left + plotWidth / 2 : margin.left + plotWidth,
      responsive.roughnessTitleY,
      responsive.roughnessTitleLineHeight,
      responsive.roughnessTitleAlign
    );

    context.save();
    context.beginPath();
    context.rect(margin.left, margin.top, plotWidth, plotHeight);
    context.clip();

    chartRoughnessFamilies.forEach(function (roughnessFamily, index) {
      context.beginPath();
      let started = false;

      for (let step = 0; step <= 220; step += 1) {
        const logRe = formulas.log10(formulas.TRANSITION_LIMIT) + (step / 220) * (formulas.log10(formulas.RE_MAX) - formulas.log10(formulas.TRANSITION_LIMIT));
        const reynolds = Math.pow(10, logRe);
        const frictionFactor = formulas.solveColebrook(reynolds, roughnessFamily);
        const x = xForRe(reynolds);
        const y = yForF(frictionFactor);

        if (!started) {
          context.moveTo(x, y);
          started = true;
        } else {
          context.lineTo(x, y);
        }
      }

      context.strokeStyle = curvePalette[Math.min(index, curvePalette.length - 1)];
      context.lineWidth = roughnessFamily === 0 ? responsive.curveLineWidth + 0.75 : responsive.curveLineWidth;
      context.stroke();

      if (responsive.roughnessLabelIndices.indexOf(index) !== -1) {
        const labelY = yForF(formulas.solveColebrook(formulas.RE_MAX, roughnessFamily));
        const labelX = margin.left + plotWidth - 4;
        
        if (labelY > margin.top + 8 && labelY < margin.top + plotHeight - 8) {
          const labelText = getChartLabel(roughnessFamily);
          context.font = responsive.roughnessLabelFontSize + 'px "Aptos", "Segoe UI Variable", "Segoe UI", sans-serif';
          const textWidth = context.measureText(labelText).width;
          
          context.fillStyle = "rgba(255, 255, 255, 0.86)";
          roundRect(context, labelX - textWidth - 7, labelY - 8, textWidth + 12, 16, 8, true, false);
          
          context.fillStyle = "#1f4e79";
          context.textAlign = "right";
          context.textBaseline = "middle";
          context.fillText(labelText, labelX, labelY);
        }
      }
    });

    context.beginPath();
    let laminarStarted = false;
    for (let step = 0; step <= 140; step += 1) {
      const logRe = formulas.log10(formulas.RE_MIN) + (step / 140) * (formulas.log10(formulas.LAMINAR_LIMIT) - formulas.log10(formulas.RE_MIN));
      const reynolds = Math.pow(10, logRe);
      const frictionFactor = 64 / reynolds;
      const x = xForRe(reynolds);
      const y = yForF(frictionFactor);

      if (!laminarStarted) {
        context.moveTo(x, y);
        laminarStarted = true;
      } else {
        context.lineTo(x, y);
      }
    }
    context.strokeStyle = "#9b6737";
    context.lineWidth = 2.6;
    context.stroke();
    
    // Draw Laminar text slightly lower on the line for mobile space
    const laminarLabelRe = responsive.isPhone ? 1200 : 780;
    context.fillStyle = "#84552d";
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    context.font = responsive.roughnessLabelFontSize + 'px "Aptos", "Segoe UI Variable", "Segoe UI", sans-serif';
    context.fillText(responsive.laminarLabel, xForRe(laminarLabelRe), yForF(64 / laminarLabelRe) - (responsive.isPhone ? 6 : 10));

    context.restore(); // Restore clip region

    // Place Transition label optimally
    context.fillStyle = "rgba(155, 103, 55, 0.9)";
    context.textAlign = "center";
    context.textBaseline = "top";
    const xTransCenter = transitionStart + (transitionEnd - transitionStart) / 2;
    context.fillText(responsive.transitionLabel, xTransCenter, margin.top + (responsive.isPhone ? 32 : 12));

    if (scenario) {
      const pointRe = formulas.clamp(scenario.reynolds, formulas.RE_MIN, formulas.RE_MAX);
      const pointF = formulas.clamp(scenario.frictionFactor, formulas.F_MIN, formulas.F_MAX);
      const pointX = xForRe(pointRe);
      const pointY = yForF(pointF);

      context.setLineDash([6, 6]);
      context.strokeStyle = "rgba(155, 103, 55, 0.82)";
      context.lineWidth = 1.3;
      context.beginPath();
      context.moveTo(pointX, margin.top);
      context.lineTo(pointX, margin.top + plotHeight);
      context.moveTo(margin.left, pointY);
      context.lineTo(margin.left + plotWidth, pointY);
      context.stroke();
      context.setLineDash([]);

      context.fillStyle = "#9b6737";
      context.beginPath();
      context.arc(pointX, pointY, responsive.pointRadius, 0, Math.PI * 2);
      context.shadowColor = "rgba(163, 106, 56, 0.26)";
      context.shadowBlur = 12;
      context.shadowOffsetY = 2;
      context.fill();
      context.shadowColor = "transparent";
      context.shadowBlur = 0;
      context.shadowOffsetY = 0;

      if (responsive.showPointCard) {
        const cardX = formulas.clamp(
          pointX + 14,
          margin.left + 12,
          margin.left + plotWidth - (responsive.pointCardWidth + 10)
        );
        const cardY = formulas.clamp(
          pointY - (responsive.pointCardHeight + 12),
          margin.top + 10,
          margin.top + plotHeight - (responsive.pointCardHeight + 10)
        );

        context.fillStyle = "rgba(24, 36, 51, 0.94)";
        context.shadowColor = "rgba(24, 36, 51, 0.16)";
        context.shadowBlur = 16;
        context.shadowOffsetY = 6;
        roundRect(context, cardX, cardY, responsive.pointCardWidth, responsive.pointCardHeight, 8, true, false);
        context.shadowColor = "transparent";
        context.shadowBlur = 0;
        context.shadowOffsetY = 0;
        context.fillStyle = "#ffffff";
        context.textAlign = "left";
        context.textBaseline = "alphabetic";
        context.font = responsive.tickFontSize + 'px "Aptos", "Segoe UI Variable", "Segoe UI", sans-serif';
        
        const lineSpacing = responsive.isPhone ? 18 : responsive.isCompact ? 20 : 22;
        const startY = cardY + (responsive.isPhone ? 18 : 20);
        
        context.fillText("Re = " + formulas.formatNumber(scenario.reynolds, 4), cardX + 12, startY);
        context.fillText("eps/D = " + formulas.formatFixed(scenario.relativeRoughness || 0, 6), cardX + 12, startY + lineSpacing);
        context.fillText("f = " + formulas.formatFixed(scenario.frictionFactor, 5), cardX + 12, startY + lineSpacing * 2);
      }
    }
  }

  function drawSystemCurve(canvas, scenario, options) {
    if (!canvas || typeof canvas.getContext !== "function" || typeof window === "undefined") {
      return;
    }

    const context = canvas.getContext("2d");
    const parentWidth = canvas.parentElement ? canvas.parentElement.clientWidth : 0;
    const cssWidth = canvas.clientWidth || parentWidth || canvas.width;
    if (!cssWidth) {
      return;
    }

    const responsive = getSystemCurveResponsiveConfig(cssWidth);
    const unitSystem = options && options.unitSystem === "us" ? "us" : "si";
    const ratio = Math.min(window.devicePixelRatio || 1, 2.25);
    const cssHeight = responsive.height;

    canvas.width = cssWidth * ratio;
    canvas.height = cssHeight * ratio;
    canvas.style.height = cssHeight + "px";

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, cssWidth, cssHeight);

    const margin = responsive.margin;
    const plotWidth = cssWidth - margin.left - margin.right;
    const plotHeight = cssHeight - margin.top - margin.bottom;

    const plotGradient = context.createLinearGradient(margin.left, margin.top, margin.left, margin.top + plotHeight);
    plotGradient.addColorStop(0, "rgba(255, 255, 255, 0.99)");
    plotGradient.addColorStop(1, "rgba(243, 247, 251, 0.98)");
    context.fillStyle = plotGradient;
    context.fillRect(margin.left, margin.top, plotWidth, plotHeight);

    if (!scenario || !scenario.systemCurve || !scenario.systemCurve.points || !scenario.systemCurve.points.length) {
      context.strokeStyle = "rgba(24, 36, 51, 0.18)";
      context.strokeRect(margin.left, margin.top, plotWidth, plotHeight);
      context.fillStyle = "#5f6f81";
      context.font = "600 " + responsive.axisFontSize + 'px "Aptos", "Segoe UI Variable", "Segoe UI", sans-serif';
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("System curve will appear after evaluation.", margin.left + plotWidth / 2, margin.top + plotHeight / 2);
      return;
    }

    const curve = scenario.systemCurve;
    const points = curve.points.map(function (point) {
      return {
        flowRate: formulas.convertFlowRate(point.flowRate, unitSystem),
        velocity: formulas.convertVelocity(point.velocity, unitSystem),
        totalHead: formulas.convertHead(point.totalHead, unitSystem)
      };
    });
    const displayFlowRate = formulas.convertFlowRate(scenario.flowRate, unitSystem);
    const displayTotalHead = formulas.convertHead(scenario.totalHeadRequirement, unitSystem);
    const displayStaticHead = formulas.convertHead(curve.staticHead, unitSystem);
    const flowMax = Math.max(formulas.convertFlowRate(curve.maxFlowRate, unitSystem), displayFlowRate);
    const headValues = points.map(function (point) { return point.totalHead; });
    headValues.push(displayStaticHead, displayTotalHead);
    const minHead = Math.min.apply(null, headValues);
    const maxHead = Math.max.apply(null, headValues);
    const headPadding = Math.max((maxHead - minHead) * 0.12, Math.abs(maxHead) * 0.08, 0.5);
    const yMin = Math.min(0, minHead - headPadding * (minHead < 0 ? 0.6 : 0.15));
    const yMax = maxHead + headPadding;
    const xTicks = buildLinearTicks(0, flowMax, responsive.xTickTarget);
    const yTicks = buildLinearTicks(yMin, yMax, responsive.yTickTarget);

    const xForQ = function (flowRate) {
      return margin.left + (flowRate / flowMax) * plotWidth;
    };
    const yForH = function (head) {
      return margin.top + ((yMax - head) / (yMax - yMin)) * plotHeight;
    };

    context.strokeStyle = "rgba(24, 36, 51, 0.06)";
    context.lineWidth = 0.7;
    xTicks.forEach(function (tick) {
      const x = xForQ(tick);
      context.beginPath();
      context.moveTo(x, margin.top);
      context.lineTo(x, margin.top + plotHeight);
      context.stroke();
    });
    yTicks.forEach(function (tick) {
      const y = yForH(tick);
      context.beginPath();
      context.moveTo(margin.left, y);
      context.lineTo(margin.left + plotWidth, y);
      context.stroke();
    });

    context.strokeStyle = "rgba(24, 36, 51, 0.42)";
    context.lineWidth = 1.1;
    context.strokeRect(margin.left, margin.top, plotWidth, plotHeight);

    context.font = responsive.tickFontSize + 'px "Aptos", "Segoe UI Variable", "Segoe UI", sans-serif';
    context.fillStyle = "#5f6f81";
    context.textBaseline = "middle";
    context.textAlign = "center";
    xTicks.forEach(function (tick) {
      context.fillText(formatFlowTick(tick), xForQ(tick), cssHeight - margin.bottom + 18);
    });
    context.textAlign = "right";
    yTicks.forEach(function (tick) {
      context.fillText(formatHeadTick(tick), margin.left - 8, yForH(tick));
    });

    context.save();
    context.fillStyle = "#182433";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "700 " + responsive.axisFontSize + 'px "Aptos", "Segoe UI Variable", "Segoe UI", sans-serif';
    context.fillText(
      unitSystem === "us" ? "Flow rate, Q (gpm)" : "Flow rate, Q (m^3/s)",
      margin.left + plotWidth / 2,
      cssHeight - margin.bottom * 0.25
    );
    context.translate(responsive.isPhone ? 24 : 28, margin.top + plotHeight / 2);
    context.rotate(-Math.PI / 2);
    context.fillText(
      unitSystem === "us" ? "Total system head, H_system (ft)" : "Total system head, H_system (m)",
      0,
      0
    );
    context.restore();

    context.fillStyle = "#183956";
    context.font = "700 " + responsive.titleFontSize + 'px Cambria, Georgia, "Times New Roman", serif';
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    context.fillText("Head vs Flow Rate", margin.left, margin.top - 10);

    if (displayStaticHead > yMin && displayStaticHead < yMax) {
      context.setLineDash([7, 5]);
      context.strokeStyle = "rgba(77, 139, 161, 0.9)";
      context.lineWidth = 1.25;
      context.beginPath();
      context.moveTo(margin.left, yForH(displayStaticHead));
      context.lineTo(margin.left + plotWidth, yForH(displayStaticHead));
      context.stroke();
      context.setLineDash([]);

      context.fillStyle = "#2c6b82";
      context.font = responsive.tickFontSize + 'px "Aptos", "Segoe UI Variable", "Segoe UI", sans-serif';
      context.textAlign = "left";
      context.fillText("Static head", margin.left + 8, yForH(displayStaticHead) - 8);
    }

    const areaGradient = context.createLinearGradient(0, margin.top, 0, margin.top + plotHeight);
    areaGradient.addColorStop(0, "rgba(32, 79, 116, 0.16)");
    areaGradient.addColorStop(1, "rgba(32, 79, 116, 0.02)");
    context.beginPath();
    points.forEach(function (point, index) {
      const x = xForQ(point.flowRate);
      const y = yForH(point.totalHead);
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });
    context.lineTo(xForQ(points[points.length - 1].flowRate), yForH(yMin));
    context.lineTo(xForQ(points[0].flowRate), yForH(yMin));
    context.closePath();
    context.fillStyle = areaGradient;
    context.fill();

    context.beginPath();
    points.forEach(function (point, index) {
      const x = xForQ(point.flowRate);
      const y = yForH(point.totalHead);
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });
    context.strokeStyle = "#204f74";
    context.lineWidth = responsive.isPhone ? 2.1 : 2.4;
    context.stroke();

    const pointX = xForQ(displayFlowRate);
    const pointY = yForH(displayTotalHead);
    context.setLineDash([6, 6]);
    context.strokeStyle = "rgba(163, 106, 56, 0.82)";
    context.lineWidth = 1.2;
    context.beginPath();
    context.moveTo(pointX, margin.top);
    context.lineTo(pointX, margin.top + plotHeight);
    context.moveTo(margin.left, pointY);
    context.lineTo(margin.left + plotWidth, pointY);
    context.stroke();
    context.setLineDash([]);

    context.fillStyle = "#9b6737";
    context.beginPath();
    context.arc(pointX, pointY, responsive.isPhone ? 5 : 5.8, 0, Math.PI * 2);
    context.fill();

    if (responsive.showPointCard) {
      const cardWidth = responsive.isPhone ? 144 : 184;
      const cardHeight = responsive.isPhone ? 58 : 68;
      const cardX = formulas.clamp(pointX + 12, margin.left + 10, margin.left + plotWidth - cardWidth - 8);
      const cardY = formulas.clamp(pointY - cardHeight - 12, margin.top + 8, margin.top + plotHeight - cardHeight - 8);

      context.fillStyle = "rgba(24, 36, 51, 0.95)";
      roundRect(context, cardX, cardY, cardWidth, cardHeight, 8, true, false);
      context.fillStyle = "#ffffff";
      context.font = responsive.tickFontSize + 'px "Aptos", "Segoe UI Variable", "Segoe UI", sans-serif';
      context.textAlign = "left";
      context.textBaseline = "alphabetic";
      context.fillText(
        "Q = " + formulas.formatFixed(displayFlowRate, 5) + (unitSystem === "us" ? " gpm" : ""),
        cardX + 12,
        cardY + 22
      );
      context.fillText(
        "H = " + formulas.formatFixed(displayTotalHead, 5) + (unitSystem === "us" ? " ft" : " m"),
        cardX + 12,
        cardY + 40
      );
      if (!responsive.isPhone) {
        context.fillText(
          "h_stat = " + formulas.formatFixed(displayStaticHead, 5) + (unitSystem === "us" ? " ft" : " m"),
          cardX + 12,
          cardY + 58
        );
      }
    }
  }

  return {
    chartRoughnessFamilies,
    getChartLabel,
    formatReTick,
    getChartResponsiveConfig,
    getSystemCurveResponsiveConfig,
    drawChart,
    drawSystemCurve
  };
});
