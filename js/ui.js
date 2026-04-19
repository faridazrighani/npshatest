(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory(
      require("./data.js"),
      require("./formulas.js"),
      require("./chart.js")
    );
  } else {
    root.MoodyUI = factory(root.MoodyData, root.MoodyFormulas, root.MoodyChart);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (data, formulas, chartLib) {
  function buildInterpretation(result) {
    const roughnessComment =
      result.relativeRoughness < 1e-4
        ? "The pipe behaves close to the hydraulically smooth limit."
        : result.relativeRoughness < 1e-3
          ? "The wall condition is mildly rough and should be treated as commercially rough."
          : "Wall roughness is dynamically significant and materially affects turbulent drag.";

    const regimeComment =
      result.regime === "Laminar"
        ? "The calculated Reynolds number places the flow in the laminar regime, so viscous effects dominate and the friction factor is governed directly by the inverse Reynolds relation."
        : result.regime === "Transitional"
        ? "The operating point lies in the transitional interval, where flow intermittency makes any single friction-factor estimate inherently uncertain."
        : "The calculated Reynolds number is clearly turbulent, so the friction factor is controlled by both Reynolds number and relative roughness.";

    const minorComment =
      result.minorLossCoefficient > 0
        ? " Aggregate minor losses with total SigmaK = " + formulas.formatFixed(result.minorLossCoefficient, 4) +
          " (fittings " + formulas.formatFixed(result.fittingMinorLossCoefficient, 4) +
          " + additional " + formulas.formatFixed(result.additionalMinorLossCoefficient, 4) +
          ") add " + formulas.formatFixed(result.minorPressureDrop, 5) + " Pa."
        : " No aggregate minor-loss term was added beyond distributed wall friction.";

    const staticComment =
      result.supplyPressure !== null && result.destinationPressure !== null
        ? " The boundary pressures are p_supply = " + formulas.formatFixed(result.supplyPressure, 5) +
          " Pa abs and p_destination = " + formulas.formatFixed(result.destinationPressure, 5) +
          " Pa abs, giving DeltaP_boundary = " + formulas.formatFixed(result.pressureBoundaryDifference, 5) +
          " Pa and Delta h_stat = " + formulas.formatFixed(result.staticHead, 5) + " m."
        : Math.abs(result.elevationChange) > 1e-9
          ? " With no explicit boundary-pressure difference entered, static head reduces to the elevation term alone: Delta h_stat = " +
            formulas.formatFixed(result.staticHead, 5) + " m."
          : " With equal or open boundary pressures and zero elevation difference, static head is zero.";

    return regimeComment +
      " The hydraulic inputs correspond to Q = " + formulas.formatFixed(result.flowRate, 5) +
      " m^3/s and mdot = " + formulas.formatFixed(result.massFlowRate, 5) +
      " kg/s." +
      " With V = " + formulas.formatFixed(result.velocity, 5) +
      " m/s, Re = " + formulas.formatNumber(result.reynolds, 5) +
      ", and epsilon/D = " + formulas.formatFixed(result.relativeRoughness, 5) +
      ", the resulting Darcy friction factor is " + formulas.formatFixed(result.frictionFactor, 5) +
      ". Over a pipe length of " + formulas.formatFixed(result.length, 4) +
      " m, the major Darcy-Weisbach component is " + formulas.formatFixed(result.majorPressureDrop, 5) +
      " Pa with hf = " + formulas.formatFixed(result.majorHeadLoss, 5) +
      " m." + minorComment + staticComment +
      " The resulting HI-style total system differential is " + formulas.formatFixed(result.totalPressureDifferential, 5) +
      " Pa, equivalent to H_system = " + formulas.formatFixed(result.totalHeadRequirement, 5) +
      " m at the operating point." +
      " " + roughnessComment;
  }

  function createMinorLossRowMarkup(item, formulasRef) {
    return (
      '<div class="fitting-row" data-fitting-id="' + item.id + '" data-default-k="' + item.kValue + '">' +
        '<div class="fitting-name">' +
          '<div class="fitting-title-row">' +
            "<strong>" + item.label + "</strong>" +
            '<span class="fitting-badge" tabindex="0" title="Typical handbook-style K value. Confirm with vendor, manufacturer, or project standard for final design.">Typical value</span>' +
          "</div>" +
          '<span class="fitting-category">' + item.category + "</span>" +
        "</div>" +
        '<label class="fitting-input">' +
          '<span class="fitting-mobile-label">Count</span>' +
          '<input type="number" min="0" step="1" inputmode="numeric" value="0" data-role="count">' +
        "</label>" +
        '<label class="fitting-input">' +
          '<span class="fitting-mobile-label">K each</span>' +
          '<input type="number" min="0" step="any" inputmode="decimal" value="' + formulasRef.formatFixed(item.kValue, 4) + '" data-role="k-value">' +
        "</label>" +
        '<div class="fitting-subtotal">' +
          '<span class="fitting-mobile-label">Subtotal</span>' +
          '<strong data-role="subtotal">' + formulasRef.formatFixed(0, 4) + "</strong>" +
        "</div>" +
      "</div>"
    );
  }

  function buildProcessNotes(result) {
    const notes = [];

    notes.push(
      "The present implementation is restricted to incompressible, non-gaseous, single-phase liquid service."
    );

    notes.push(
      "Mass flow tracking is active through mdot = rho Q, giving mdot = " +
      formulas.formatFixed(result.massFlowRate, 5) +
      " kg/s for the present density-flow combination."
    );

    if (result.temperature !== null && result.temperature !== undefined) {
      notes.push(
        "Operating temperature entered: " +
        formulas.formatFixed(result.temperature, 4) +
        " degC. Fluid-property inputs should correspond to this operating state."
      );
    }

    if (
      result.temperature !== null &&
      result.temperature !== undefined &&
      result.maxTemperature !== null &&
      result.maxTemperature !== undefined
    ) {
      const margin = result.maxTemperature - result.temperature;
      if (margin < 0) {
        notes.push(
          "Warning: the operating temperature exceeds Tmax by " +
          formulas.formatFixed(Math.abs(margin), 4) +
          " degC."
        );
      } else if (margin <= 10) {
        notes.push(
          "Caution: the thermal margin to Tmax is only " +
          formulas.formatFixed(margin, 4) +
          " degC."
        );
      } else {
        notes.push(
          "Thermal margin to Tmax is " +
          formulas.formatFixed(margin, 4) +
          " degC."
        );
      }
    } else if (result.maxTemperature !== null && result.maxTemperature !== undefined) {
      notes.push(
        "Maximum allowable temperature recorded at " +
        formulas.formatFixed(result.maxTemperature, 4) +
        " degC."
      );
    }

    if (result.minorLossCoefficient > 0) {
      notes.push(
        "Minor-loss accounting is active with fitting SigmaK = " +
        formulas.formatFixed(result.fittingMinorLossCoefficient, 4) +
        ", additional custom SigmaK = " +
        formulas.formatFixed(result.additionalMinorLossCoefficient, 4) +
        ", and total SigmaK = " +
        formulas.formatFixed(result.minorLossCoefficient, 4) +
        ", producing hm = " +
        formulas.formatFixed(result.minorHeadLoss, 5) +
        " m."
      );
    } else {
      notes.push(
        "No aggregate minor-loss coefficient has been entered, so only distributed wall friction and any elevation term contribute to the total line differential."
      );
    }

    if (result.supplyPressure !== null && result.destinationPressure !== null) {
      notes.push(
        "Boundary pressures are entered as p_supply = " +
        formulas.formatFixed(result.supplyPressure, 5) +
        " Pa abs and p_destination = " +
        formulas.formatFixed(result.destinationPressure, 5) +
        " Pa abs, so the HI boundary-pressure term is DeltaP_boundary = " +
        formulas.formatFixed(result.pressureBoundaryDifference, 5) +
        " Pa."
      );
    } else {
      notes.push(
        "No explicit supply/destination pressure pair has been entered, so the HI static head reduces to elevation only, as in the open-tank case."
      );
    }

    if (Math.abs(result.elevationChange) > 1e-9) {
      notes.push(
        "Elevation change is set to Delta z = " +
        formulas.formatFixed(result.elevationChange, 4) +
        " m, with the sign convention positive upward from supply to destination."
      );
    } else {
      notes.push("Elevation change is presently zero, so there is no elevation contribution to static head.");
    }

    if (
      result.vaporPressure !== null &&
      result.vaporPressure !== undefined &&
      result.bulkBoundaryPressureMinimum !== null
    ) {
      if (result.bulkBoundaryVaporMargin <= 0) {
        notes.push(
          "Warning: the lower entered boundary pressure is at or below the vapor pressure, so this coarse bulk-pressure screen indicates elevated risk of flashing or two-phase behavior."
        );
      } else if (result.bulkBoundaryVaporMargin <= 25000) {
        notes.push(
          "Caution: the lower entered boundary pressure remains above vapor pressure, but the screen margin is only " +
          formulas.formatFixed(result.bulkBoundaryVaporMargin, 5) +
          " Pa. This is not a substitute for local-pressure or NPSH review."
        );
      } else {
        notes.push(
          "The lower entered boundary pressure exceeds vapor pressure by " +
          formulas.formatFixed(result.bulkBoundaryVaporMargin, 5) +
          " Pa. This is favorable for remaining liquid, but it is still only a coarse screen and not a cavitation guarantee."
        );
      }
    } else if (result.vaporPressure !== null && result.vaporPressure !== undefined) {
      notes.push(
        "Vapor pressure is recorded at " +
        formulas.formatFixed(result.vaporPressure, 5) +
        " Pa abs, but no complete boundary-pressure pair was entered, so even a coarse bulk-pressure screen cannot yet be performed."
      );
    } else {
      notes.push(
        "No vapor-pressure data entered; the model therefore reports hydraulic losses and HI-style system head without a bulk-pressure vapor-margin screen."
      );
    }

    if (
      result.supplyPressure !== null ||
      result.destinationPressure !== null ||
      (result.vaporPressure !== null && result.vaporPressure !== undefined)
    ) {
      notes.push(
        "A literature-standard cavitation assessment still requires local suction conditions and NPSH-style evaluation rather than bulk boundary pressure alone."
      );
    }

    notes.push(
      "The system-curve chart follows the Hydraulic Institute structure H_system = Delta h_stat + friction head over a range of flow rates."
    );

    return notes.join(" ");
  }

  function getSystemCurveUnitConfig(unitMode) {
    if (unitMode === "us") {
      return {
        flowHeading: "Flow Rate (gpm)",
        velocityHeading: "Velocity (ft/s)",
        headHeading: "System Head (ft)",
        convertFlow: function (value) { return formulas.convertFlowRate(value, "us"); },
        convertVelocity: function (value) { return formulas.convertVelocity(value, "us"); },
        convertHead: function (value) { return formulas.convertHead(value, "us"); }
      };
    }

    return {
      flowHeading: "Flow Rate (m^3/s)",
      velocityHeading: "Velocity (m/s)",
      headHeading: "System Head (m)",
      convertFlow: function (value) { return formulas.convertFlowRate(value, "si"); },
      convertVelocity: function (value) { return formulas.convertVelocity(value, "si"); },
      convertHead: function (value) { return formulas.convertHead(value, "si"); }
    };
  }

  function sampleSystemCurvePoints(points, targetRows) {
    if (!points || !points.length) {
      return [];
    }

    if (points.length <= targetRows) {
      return points.slice();
    }

    const sampled = [];
    const seen = new Set();

    for (let index = 0; index < targetRows; index += 1) {
      const pointIndex = Math.round(index * (points.length - 1) / Math.max(targetRows - 1, 1));
      if (seen.has(pointIndex)) {
        continue;
      }
      seen.add(pointIndex);
      sampled.push(points[pointIndex]);
    }

    return sampled;
  }

  function niceLinearStep(value) {
    if (!(value > 0)) {
      return 1;
    }

    const exponent = Math.floor(Math.log10(value));
    const fraction = value / Math.pow(10, exponent);
    let niceFraction;

    if (fraction <= 1) {
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

  function interpolateSystemCurvePoint(points, flowRate) {
    if (!points || !points.length) {
      return null;
    }

    if (flowRate <= points[0].flowRate) {
      return points[0];
    }

    for (let index = 1; index < points.length; index += 1) {
      const right = points[index];
      const left = points[index - 1];

      if (flowRate <= right.flowRate) {
        const span = right.flowRate - left.flowRate;
        const ratio = span > 0 ? (flowRate - left.flowRate) / span : 0;

        return {
          flowRate: flowRate,
          velocity: left.velocity + (right.velocity - left.velocity) * ratio,
          totalHead: left.totalHead + (right.totalHead - left.totalHead) * ratio
        };
      }
    }

    return points[points.length - 1];
  }

  function createOptionMarkup(items) {
    return items
      .map(function (item) {
        return '<option value="' + item.id + '">' + item.label + "</option>";
      })
      .join("");
  }

  function renderReferenceSections(container) {
    if (!container) {
      return;
    }

    container.innerHTML = data.referenceSections
      .map(function (section) {
        const content = section.type === "annotated"
          ? '<div class="reference-list">' + section.items
            .map(function (item) {
              return (
                '<article class="reference-item">' +
                  "<strong>" + item.title + "</strong>" +
                  "<p>" + item.description + "</p>" +
                  (item.url ? '<a href="' + item.url + '" target="_blank" rel="noreferrer">' + item.url + "</a>" : "") +
                "</article>"
              );
            })
            .join("") + "</div>"
          : '<div class="reference-list">' + section.items
            .map(function (link) {
              return (
                '<article class="reference-item">' +
                  "<strong>Project reading link</strong>" +
                  '<a href="' + link + '" target="_blank" rel="noreferrer">' + link + "</a>" +
                "</article>"
              );
            })
            .join("") + "</div>";

        return (
          '<section class="reference-group">' +
            "<h3>" + section.heading + "</h3>" +
            "<p>" + section.description + "</p>" +
            content +
          "</section>"
        );
      })
      .join("");
  }

  function initBrowserApp() {
    if (typeof document === "undefined") {
      return;
    }

    const fluidPresetSelect = document.getElementById("fluidPreset");
    const materialPresetSelect = document.getElementById("materialPreset");
    const densityInput = document.getElementById("density");
    const viscosityInput = document.getElementById("viscosity");
    const temperatureInput = document.getElementById("temperature");
    const maxTemperatureInput = document.getElementById("maxTemperature");
    const vaporPressureInput = document.getElementById("vaporPressure");
    const supplyPressureInput = document.getElementById("supplyPressure");
    const destinationPressureInput = document.getElementById("destinationPressure");
    const elevationChangeInput = document.getElementById("elevationChange");
    const additionalMinorLossInput = document.getElementById("additionalMinorLossCoefficient");
    const minorLossCoefficientInput = document.getElementById("minorLossCoefficient");
    const minorLossBuilderRows = document.getElementById("minorLossBuilderRows");
    const fittingSigmaKDisplay = document.getElementById("fittingSigmaKDisplay");
    const totalSigmaKDisplay = document.getElementById("totalSigmaKDisplay");
    const diameterInput = document.getElementById("diameter");
    const lengthInput = document.getElementById("length");
    const roughnessInput = document.getElementById("roughness");
    const flowRateInput = document.getElementById("flowRate");
    const massFlowRateInput = document.getElementById("massFlowRate");
    const sampleButton = document.getElementById("sampleButton");
    const errorBox = document.getElementById("errorBox");
    const chartCanvas = document.getElementById("moodyChart");
    const systemCurveCanvas = document.getElementById("systemCurveChart");
    const systemUnitButtons = Array.prototype.slice.call(document.querySelectorAll("[data-system-unit]"));
    const systemCurveFlowHeading = document.getElementById("systemCurveFlowHeading");
    const systemCurveVelocityHeading = document.getElementById("systemCurveVelocityHeading");
    const systemCurveHeadHeading = document.getElementById("systemCurveHeadHeading");
    const systemCurveTableBody = document.getElementById("systemCurveTableBody");
    const chartStage = chartCanvas ? (chartCanvas.closest(".chart-stage") || chartCanvas.parentElement) : null;
    const systemCurveStage = systemCurveCanvas ? (systemCurveCanvas.closest(".chart-stage") || systemCurveCanvas.parentElement) : null;

    const outputs = {
      flowRegime: document.getElementById("flowRegime"),
      frictionMethod: document.getElementById("frictionMethod"),
      kinematicViscosity: document.getElementById("kinematicViscosity"),
      massFlowRate: document.getElementById("massFlowRateOutput"),
      velocity: document.getElementById("velocityOutput"),
      reynolds: document.getElementById("reynoldsOutput"),
      relativeRoughness: document.getElementById("relativeRoughnessOutput"),
      frictionFactor: document.getElementById("frictionFactorOutput"),
      totalMinorLossCoefficient: document.getElementById("totalMinorLossCoefficientOutput"),
      pressureDrop: document.getElementById("pressureDropOutput"),
      headLoss: document.getElementById("headLossOutput"),
      minorPressureDrop: document.getElementById("minorPressureDropOutput"),
      minorHeadLoss: document.getElementById("minorHeadLossOutput"),
      boundaryPressureDifference: document.getElementById("boundaryPressureDifferenceOutput"),
      staticPressureChange: document.getElementById("staticPressureChangeOutput"),
      staticHead: document.getElementById("staticHeadOutput"),
      totalPressureDifferential: document.getElementById("totalPressureOutput"),
      totalHeadRequirement: document.getElementById("totalHeadOutput"),
      interpretation: document.getElementById("interpretationText"),
      processNotes: document.getElementById("processNotesText")
    };

    let currentResult = null;
    let currentInputs = null;
    let resizeFrame = null;
    let flowInputMode = "volumetric";
    let systemCurveUnitMode = "si";
    let minorLossBreakdown = {
      fittingSigmaK: 0,
      additionalSigmaK: 0,
      totalSigmaK: 0
    };

    fluidPresetSelect.innerHTML = createOptionMarkup(data.fluidPresets);
    materialPresetSelect.innerHTML = createOptionMarkup(data.materialPresets);
    renderReferenceSections(document.getElementById("referenceSections"));
    if (minorLossBuilderRows) {
      minorLossBuilderRows.innerHTML = data.minorLossCatalog
        .map(function (item) {
          return createMinorLossRowMarkup(item, formulas);
        })
        .join("");
    }

    function setFluidPreset(presetId) {
      const preset = data.fluidPresets.find(function (item) {
        return item.id === presetId;
      });

      if (!preset || preset.id === "custom") {
        return;
      }

      densityInput.value = preset.density;
      viscosityInput.value = preset.viscosity;
      temperatureInput.value =
        preset.temperature !== null && preset.temperature !== undefined
          ? preset.temperature
          : "";
      vaporPressureInput.value =
        preset.vaporPressure !== null && preset.vaporPressure !== undefined
          ? preset.vaporPressure
          : "";
    }

    function setMaterialPreset(presetId) {
      const preset = data.materialPresets.find(function (item) {
        return item.id === presetId;
      });

      if (!preset || preset.id === "custom") {
        return;
      }

      roughnessInput.value = preset.roughness;
    }

    function parseOptionalNumber(value) {
      if (value === "") {
        return null;
      }

      const numericValue = Number(value);
      return Number.isFinite(numericValue) ? numericValue : null;
    }

    function formatInputValue(value) {
      if (!Number.isFinite(value)) {
        return "";
      }

      if (Math.abs(value) >= 1e4 || (Math.abs(value) > 0 && Math.abs(value) < 1e-3)) {
        return value.toExponential(6);
      }

      return String(Number(value.toFixed(8)));
    }

    function syncFlowPairFrom(source) {
      const density = parseOptionalNumber(densityInput.value);
      const flowRate = parseOptionalNumber(flowRateInput.value);
      const massFlowRate = parseOptionalNumber(massFlowRateInput.value);

      if (!(density > 0)) {
        return;
      }

      if (source === "volumetric" && flowRate !== null && flowRate >= 0) {
        massFlowRateInput.value = formatInputValue(formulas.computeMassFlowRate(density, flowRate));
      }

      if (source === "mass" && massFlowRate !== null && massFlowRate >= 0) {
        flowRateInput.value = formatInputValue(formulas.computeVolumetricFlowRate(massFlowRate, density));
      }
    }

    function hasRequiredHydraulicInputs() {
      const fields = [
        densityInput,
        viscosityInput,
        diameterInput,
        lengthInput,
        roughnessInput
      ];

      const hasFlowBasis = flowRateInput.value !== "" || massFlowRateInput.value !== "";
      return fields.every(function (field) { return field.value !== ""; }) && hasFlowBasis;
    }

    function updateMinorLossBuilder() {
      let fittingSigmaK = 0;

      if (minorLossBuilderRows) {
        minorLossBuilderRows.querySelectorAll(".fitting-row").forEach(function (row) {
          const countInput = row.querySelector('[data-role="count"]');
          const kValueInput = row.querySelector('[data-role="k-value"]');
          const subtotalOutput = row.querySelector('[data-role="subtotal"]');
          const count = parseOptionalNumber(countInput.value) || 0;
          const kValue = parseOptionalNumber(kValueInput.value) || 0;
          const subtotal = count * kValue;

          subtotalOutput.textContent = formulas.formatFixed(subtotal, 4);
          fittingSigmaK += subtotal;
        });
      }

      const additionalSigmaK = parseOptionalNumber(additionalMinorLossInput.value) || 0;
      const totalSigmaK = fittingSigmaK + additionalSigmaK;

      minorLossBreakdown = {
        fittingSigmaK: fittingSigmaK,
        additionalSigmaK: additionalSigmaK,
        totalSigmaK: totalSigmaK
      };

      minorLossCoefficientInput.value = formatInputValue(totalSigmaK);

      if (fittingSigmaKDisplay) {
        fittingSigmaKDisplay.textContent = formulas.formatFixed(fittingSigmaK, 4);
      }

      if (totalSigmaKDisplay) {
        totalSigmaKDisplay.textContent = formulas.formatFixed(totalSigmaK, 4);
      }
    }

    function resetMinorLossBuilder() {
      if (minorLossBuilderRows) {
        minorLossBuilderRows.querySelectorAll(".fitting-row").forEach(function (row) {
          const countInput = row.querySelector('[data-role="count"]');
          const kValueInput = row.querySelector('[data-role="k-value"]');
          const defaultKValue = Number(row.dataset.defaultK);

          countInput.value = 0;
          kValueInput.value = formatInputValue(defaultKValue);
        });
      }

      additionalMinorLossInput.value = 0;
      updateMinorLossBuilder();
    }

    function readInputs() {
      return {
        density: parseOptionalNumber(densityInput.value),
        viscosity: parseOptionalNumber(viscosityInput.value),
        temperature: parseOptionalNumber(temperatureInput.value),
        maxTemperature: parseOptionalNumber(maxTemperatureInput.value),
        vaporPressure: parseOptionalNumber(vaporPressureInput.value),
        supplyPressure: parseOptionalNumber(supplyPressureInput.value),
        destinationPressure: parseOptionalNumber(destinationPressureInput.value),
        elevationChange: parseOptionalNumber(elevationChangeInput.value),
        minorLossCoefficient: minorLossBreakdown.totalSigmaK,
        fittingMinorLossCoefficient: minorLossBreakdown.fittingSigmaK,
        additionalMinorLossCoefficient: minorLossBreakdown.additionalSigmaK,
        diameter: parseOptionalNumber(diameterInput.value),
        length: parseOptionalNumber(lengthInput.value),
        roughness: parseOptionalNumber(roughnessInput.value),
        flowRate: parseOptionalNumber(flowRateInput.value),
        massFlowRate: parseOptionalNumber(massFlowRateInput.value)
      };
    }

    function clearError() {
      errorBox.hidden = true;
      errorBox.textContent = "";
    }

    function showError(message) {
      errorBox.hidden = false;
      errorBox.textContent = message;
    }

    function updateSystemCurveTable(result) {
      if (!systemCurveTableBody || !systemCurveFlowHeading || !systemCurveVelocityHeading || !systemCurveHeadHeading) {
        return;
      }

      const unitConfig = getSystemCurveUnitConfig(systemCurveUnitMode);
      systemCurveFlowHeading.textContent = unitConfig.flowHeading;
      systemCurveVelocityHeading.textContent = unitConfig.velocityHeading;
      systemCurveHeadHeading.textContent = unitConfig.headHeading;

      if (!result || !result.systemCurve || !result.systemCurve.points || !result.systemCurve.points.length) {
        systemCurveTableBody.innerHTML = '<tr><td colspan="3">Evaluate the system to generate tabulated curve data.</td></tr>';
        return;
      }

      const points = result.systemCurve.points;
      const displayMaxFlow = unitConfig.convertFlow(result.systemCurve.maxFlowRate);
      let displayStep = niceLinearStep(displayMaxFlow / 15);
      let displayUpperBound = Math.ceil(displayMaxFlow / displayStep) * displayStep;

      while ((displayUpperBound / displayStep) + 1 > 16) {
        displayStep = niceLinearStep(displayStep * 1.5);
        displayUpperBound = Math.ceil(displayMaxFlow / displayStep) * displayStep;
      }

      const displayRows = [];
      for (let displayFlow = 0; displayFlow <= displayUpperBound + displayStep * 0.25; displayFlow += displayStep) {
        displayRows.push(Number(displayFlow.toPrecision(12)));
      }

      systemCurveTableBody.innerHTML = displayRows
        .map(function (displayFlow) {
          const flowRateSI = formulas.convertFlowRateToSI(displayFlow, systemCurveUnitMode);
          const point = interpolateSystemCurvePoint(points, flowRateSI);

          if (!point) {
            return "";
          }

          return (
            "<tr>" +
              "<td>" + formulas.formatFixed(displayFlow, 5) + "</td>" +
              "<td>" + formulas.formatFixed(unitConfig.convertVelocity(point.velocity), 5) + "</td>" +
              "<td>" + formulas.formatFixed(unitConfig.convertHead(point.totalHead), 5) + "</td>" +
            "</tr>"
          );
        })
        .join("");
    }

    function scheduleChartRender() {
      if (resizeFrame !== null) {
        window.cancelAnimationFrame(resizeFrame);
      }

      resizeFrame = window.requestAnimationFrame(function () {
        chartLib.drawChart(chartCanvas, currentResult);
        chartLib.drawSystemCurve(systemCurveCanvas, currentResult, { unitSystem: systemCurveUnitMode });
        updateSystemCurveTable(currentResult);
        resizeFrame = null;
      });
    }

    function updateOutputs(result) {
      currentResult = result;
      outputs.flowRegime.textContent = result.regime;
      outputs.frictionMethod.textContent = result.frictionMethod;
      outputs.kinematicViscosity.textContent = formulas.formatWithUnit(result.kinematicViscosity, "m^2/s", 5);
      outputs.massFlowRate.textContent = formulas.formatWithUnit(result.massFlowRate, "kg/s", 5);
      outputs.velocity.textContent = formulas.formatWithUnit(result.velocity, "m/s", 5);
      outputs.reynolds.textContent = formulas.formatNumber(result.reynolds, 5);
      outputs.relativeRoughness.textContent = formulas.formatFixed(result.relativeRoughness, 5);
      outputs.frictionFactor.textContent = formulas.formatFixed(result.frictionFactor, 5);
      outputs.totalMinorLossCoefficient.textContent = formulas.formatFixed(result.minorLossCoefficient, 5);
      outputs.pressureDrop.textContent = formulas.formatWithUnit(result.majorPressureDrop, "Pa", 5);
      outputs.headLoss.textContent = formulas.formatWithUnit(result.majorHeadLoss, "m", 5);
      outputs.minorPressureDrop.textContent = formulas.formatWithUnit(result.minorPressureDrop, "Pa", 5);
      outputs.minorHeadLoss.textContent = formulas.formatWithUnit(result.minorHeadLoss, "m", 5);
      outputs.boundaryPressureDifference.textContent = formulas.formatWithUnit(result.pressureBoundaryDifference, "Pa", 5);
      outputs.staticPressureChange.textContent = formulas.formatWithUnit(result.staticPressureChange, "Pa", 5);
      outputs.staticHead.textContent = formulas.formatWithUnit(result.staticHead, "m", 5);
      outputs.totalPressureDifferential.textContent = formulas.formatWithUnit(result.totalPressureDifferential, "Pa", 5);
      outputs.totalHeadRequirement.textContent = formulas.formatWithUnit(result.totalHeadRequirement, "m", 5);
      outputs.interpretation.textContent = buildInterpretation(result);
      outputs.processNotes.textContent = buildProcessNotes(result);
      scheduleChartRender();
    }

    function evaluateScenario() {
      try {
        currentInputs = readInputs();
        const result = formulas.computeScenario(currentInputs);
        clearError();
        updateOutputs(result);
      } catch (error) {
        currentResult = null;
        showError(error.message);
        scheduleChartRender();
      }
    }

    function loadBenchmarkExample() {
      flowInputMode = "volumetric";
      fluidPresetSelect.value = "water20";
      materialPresetSelect.value = "commercialSteel";
      setFluidPreset("water20");
      setMaterialPreset("commercialSteel");
      diameterInput.value = 0.1;
      lengthInput.value = 60;
      flowRateInput.value = 0.015;
      massFlowRateInput.value = formatInputValue(formulas.computeMassFlowRate(998.2, 0.015));
      temperatureInput.value = 20;
      maxTemperatureInput.value = 60;
      vaporPressureInput.value = 2339;
      supplyPressureInput.value = 101325;
      destinationPressureInput.value = 101325;
      elevationChangeInput.value = 0;
      resetMinorLossBuilder();
      evaluateScenario();
    }

    fluidPresetSelect.addEventListener("change", function (event) {
      setFluidPreset(event.target.value);
      syncFlowPairFrom(flowInputMode);
      evaluateScenario();
    });

    materialPresetSelect.addEventListener("change", function (event) {
      setMaterialPreset(event.target.value);
      evaluateScenario();
    });

    flowRateInput.addEventListener("input", function () {
      flowInputMode = "volumetric";
      syncFlowPairFrom("volumetric");
      if (hasRequiredHydraulicInputs()) {
        evaluateScenario();
      }
    });

    massFlowRateInput.addEventListener("input", function () {
      flowInputMode = "mass";
      syncFlowPairFrom("mass");
      if (hasRequiredHydraulicInputs()) {
        evaluateScenario();
      }
    });

    [
      densityInput,
      viscosityInput,
      temperatureInput,
      maxTemperatureInput,
      vaporPressureInput,
      supplyPressureInput,
      destinationPressureInput,
      elevationChangeInput,
      minorLossCoefficientInput,
      diameterInput,
      lengthInput,
      roughnessInput
    ].forEach(function (input) {
      input.addEventListener("input", function () {
        if (input === densityInput) {
          syncFlowPairFrom(flowInputMode);
        }

        if (hasRequiredHydraulicInputs()) {
          evaluateScenario();
        }
      });
    });

    if (minorLossBuilderRows) {
      minorLossBuilderRows.addEventListener("input", function (event) {
        if (!(event.target instanceof HTMLInputElement)) {
          return;
        }

        updateMinorLossBuilder();

        if (hasRequiredHydraulicInputs()) {
          evaluateScenario();
        }
      });
    }

    additionalMinorLossInput.addEventListener("input", function () {
      updateMinorLossBuilder();

      if (hasRequiredHydraulicInputs()) {
        evaluateScenario();
      }
    });

    sampleButton.addEventListener("click", loadBenchmarkExample);

    systemUnitButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        systemCurveUnitMode = button.dataset.systemUnit === "us" ? "us" : "si";
        systemUnitButtons.forEach(function (candidate) {
          candidate.classList.toggle("active", candidate === button);
        });
        scheduleChartRender();
      });
    });

    document.querySelectorAll(".tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        document.querySelectorAll(".tab").forEach(function (button) {
          button.classList.remove("active");
        });

        document.querySelectorAll(".tab-panel").forEach(function (panel) {
          panel.classList.remove("active");
        });

        tab.classList.add("active");
        document.getElementById(tab.dataset.tabTarget).classList.add("active");

        if (tab.dataset.tabTarget === "analysis-tab") {
          scheduleChartRender();
        }
      });
    });

    if (typeof ResizeObserver !== "undefined") {
      const chartObserver = new ResizeObserver(function () {
        scheduleChartRender();
      });
      if (chartStage) {
        chartObserver.observe(chartStage);
      }
      if (systemCurveStage) {
        chartObserver.observe(systemCurveStage);
      }
    }

    window.addEventListener("resize", scheduleChartRender);

    updateMinorLossBuilder();
    updateSystemCurveTable(null);
    loadBenchmarkExample();
  }

  return {
    buildInterpretation,
    createOptionMarkup,
    renderReferenceSections,
    initBrowserApp
  };
});
