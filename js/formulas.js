(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.MoodyFormulas = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const GRAVITY = 9.80665;
  const RE_MIN = 6e2;
  const RE_MAX = 1e8;
  const F_MIN = 8e-3;
  const F_MAX = 1.2e-1;
  const LAMINAR_LIMIT = 2300;
  const TRANSITION_LIMIT = 4000;
  const CUBIC_METER_PER_SECOND_TO_GPM = 15850.323141489;
  const METER_TO_FOOT = 3.280839895;

  const equationCatalog = Object.freeze({
    massFlowRate: {
      title: "Mass flow rate",
      expression: "mdot = rho Q",
      note: "Connects volumetric and mass-flow forms for incompressible liquid service."
    },
    velocity: {
      title: "Mean bulk velocity",
      expression: "V = Q / A = 4Q / (pi D^2)",
      note: "Obtained from volumetric flow rate and cross-sectional area."
    },
    reynolds: {
      title: "Reynolds number",
      expression: "Re = rho V D / mu = V D / nu",
      note: "Determines laminar, transitional, or turbulent regime."
    },
    relativeRoughness: {
      title: "Relative roughness",
      expression: "epsilon / D",
      note: "Locates the pipe among constant-roughness Moody families."
    },
    frictionLaminar: {
      title: "Laminar Darcy friction factor",
      expression: "f = 64 / Re",
      note: "Exact relation for fully developed laminar flow in circular pipes."
    },
    frictionTransitional: {
      title: "Transitional estimate",
      expression: "Churchill bridging correlation",
      note: "Used as a flagged estimate through the unstable transition band."
    },
    frictionTurbulent: {
      title: "Turbulent Darcy friction factor",
      expression: "1 / sqrt(f) = -2 log10(epsilon / (3.7D) + 2.51 / (Re sqrt(f)))",
      note: "Colebrook-White relation solved iteratively."
    },
    pressureDrop: {
      title: "Major pressure drop",
      expression: "DeltaP = f (L / D) (rho V^2 / 2)",
      note: "Distributed pressure loss from Darcy-Weisbach."
    },
    headLoss: {
      title: "Major head loss",
      expression: "hf = f (L / D) (V^2 / 2g)",
      note: "Head-form Darcy-Weisbach relation."
    },
    minorPressureDrop: {
      title: "Minor-loss pressure drop",
      expression: "DeltaP_minor = SigmaK (rho V^2 / 2)",
      note: "Aggregate fitting, valve, entrance, and exit losses."
    },
    minorHeadLoss: {
      title: "Minor-loss head",
      expression: "hm = SigmaK (V^2 / 2g)",
      note: "Head-form representation of the aggregate minor losses."
    },
    boundaryPressureDifference: {
      title: "Boundary pressure difference",
      expression: "DeltaP_boundary = p_destination - p_supply",
      note: "Boundary pressure term used in the Hydraulic Institute system-head relation."
    },
    staticPressureChange: {
      title: "Static pressure differential",
      expression: "DeltaP_static = rho g Delta z + (p_destination - p_supply)",
      note: "Combined elevation and boundary-pressure contribution to the system differential."
    },
    staticHead: {
      title: "Static head",
      expression: "Delta h_stat = Delta z + (p_destination - p_supply) / (rho g)",
      note: "Hydraulic Institute style static head for negligible boundary velocity."
    },
    totalPressureDifferential: {
      title: "Total pressure differential",
      expression: "DeltaP_total = DeltaP_major + DeltaP_minor + DeltaP_static",
      note: "Combined liquid-service differential across the system."
    },
    totalHeadRequirement: {
      title: "Total system head",
      expression: "H_system = Delta h_stat + (hf + hm)",
      note: "Hydraulic Institute style total system head."
    }
  });

  function log10(value) {
    return Math.log(value) / Math.LN10;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function formatNumber(value, digits) {
    if (!Number.isFinite(value)) {
      return "-";
    }

    return value.toLocaleString("en-US", {
      maximumSignificantDigits: digits || 4
    });
  }

  function formatFixed(value, digits) {
    const precision = digits || 5;

    if (!Number.isFinite(value)) {
      return "-";
    }

    if (Math.abs(value) >= 1e4 || (Math.abs(value) > 0 && Math.abs(value) < 1e-3)) {
      return value.toExponential(Math.max(2, precision - 1));
    }

    return value.toLocaleString("en-US", {
      maximumFractionDigits: precision,
      minimumFractionDigits: 0
    });
  }

  function formatWithUnit(value, unit, digits) {
    if (!Number.isFinite(value)) {
      return "-";
    }

    return formatFixed(value, digits || 4) + " " + unit;
  }

  function convertFlowRate(value, unitSystem) {
    if (!Number.isFinite(value)) {
      return value;
    }

    return unitSystem === "us"
      ? value * CUBIC_METER_PER_SECOND_TO_GPM
      : value;
  }

  function convertFlowRateToSI(value, unitSystem) {
    if (!Number.isFinite(value)) {
      return value;
    }

    return unitSystem === "us"
      ? value / CUBIC_METER_PER_SECOND_TO_GPM
      : value;
  }

  function convertVelocity(value, unitSystem) {
    if (!Number.isFinite(value)) {
      return value;
    }

    return unitSystem === "us"
      ? value * METER_TO_FOOT
      : value;
  }

  function convertHead(value, unitSystem) {
    if (!Number.isFinite(value)) {
      return value;
    }

    return unitSystem === "us"
      ? value * METER_TO_FOOT
      : value;
  }

  function computeMassFlowRate(density, flowRate) {
    return density * flowRate;
  }

  function computeVolumetricFlowRate(massFlowRate, density) {
    return massFlowRate / density;
  }

  function computeVelocity(flowRate, diameter) {
    const area = Math.PI * diameter * diameter / 4;
    return flowRate / area;
  }

  function computeReynolds(density, velocity, diameter, viscosity) {
    return density * velocity * diameter / viscosity;
  }

  function computeRelativeRoughness(roughness, diameter) {
    return roughness / diameter;
  }

  function swameeJain(reynolds, relativeRoughness) {
    const rr = Math.max(relativeRoughness, 1e-12);
    return 0.25 / Math.pow(log10(rr / 3.7 + 5.74 / Math.pow(reynolds, 0.9)), 2);
  }

  function churchill(reynolds, relativeRoughness) {
    const rr = Math.max(relativeRoughness, 0);
    const aInner = Math.pow(7 / reynolds, 0.9) + 0.27 * rr;
    const safeInner = Math.max(aInner, 1e-16);
    const a = Math.pow(2.457 * Math.log(1 / safeInner), 16);
    const b = Math.pow(37530 / reynolds, 16);
    const blend = Math.pow(Math.pow(8 / reynolds, 12) + 1 / Math.pow(a + b, 1.5), 1 / 12);
    return 8 * blend;
  }

  function solveColebrook(reynolds, relativeRoughness) {
    const rr = Math.max(relativeRoughness, 0);
    let frictionFactor = clamp(swameeJain(reynolds, rr), F_MIN, F_MAX);

    for (let iteration = 0; iteration < 30; iteration += 1) {
      const term = rr / 3.7 + 2.51 / (reynolds * Math.sqrt(frictionFactor));
      const next = 1 / Math.pow(-2 * log10(Math.max(term, 1e-16)), 2);
      if (Math.abs(next - frictionFactor) < 1e-10) {
        return next;
      }
      frictionFactor = next;
    }

    return frictionFactor;
  }

  function classifyFlow(reynolds) {
    if (reynolds < LAMINAR_LIMIT) {
      return "Laminar";
    }
    if (reynolds <= TRANSITION_LIMIT) {
      return "Transitional";
    }
    return "Turbulent";
  }

  function computeFrictionFactor(reynolds, relativeRoughness) {
    if (reynolds <= 0) {
      throw new Error("Reynolds number must be positive.");
    }

    if (reynolds < LAMINAR_LIMIT) {
      return {
        factor: 64 / reynolds,
        regime: "Laminar",
        method: "Exact laminar relation",
        equation: equationCatalog.frictionLaminar
      };
    }

    if (reynolds <= TRANSITION_LIMIT) {
      return {
        factor: churchill(reynolds, relativeRoughness),
        regime: "Transitional",
        method: "Churchill bridging correlation",
        equation: equationCatalog.frictionTransitional
      };
    }

    return {
      factor: solveColebrook(reynolds, relativeRoughness),
      regime: "Turbulent",
      method: "Colebrook-White iterative solution",
      equation: equationCatalog.frictionTurbulent
    };
  }

  function computePressureDrop(frictionFactor, length, diameter, density, velocity) {
    return frictionFactor * (length / diameter) * (density * velocity * velocity / 2);
  }

  function computeHeadLoss(frictionFactor, length, diameter, velocity) {
    return frictionFactor * (length / diameter) * (velocity * velocity / (2 * GRAVITY));
  }

  function computeMinorLossPressure(minorLossCoefficient, density, velocity) {
    return minorLossCoefficient * (density * velocity * velocity / 2);
  }

  function computeMinorLossHead(minorLossCoefficient, velocity) {
    return minorLossCoefficient * (velocity * velocity / (2 * GRAVITY));
  }

  function computePressureBoundaryDifference(supplyPressure, destinationPressure) {
    return destinationPressure - supplyPressure;
  }

  function computeStaticPressureChange(density, elevationChange, pressureBoundaryDifference) {
    return density * GRAVITY * elevationChange + pressureBoundaryDifference;
  }

  function computeStaticHead(density, elevationChange, pressureBoundaryDifference) {
    return elevationChange + pressureBoundaryDifference / (density * GRAVITY);
  }

  function computeTotalPressureDifferential(majorPressureDrop, minorPressureDrop, staticPressureChange) {
    return majorPressureDrop + minorPressureDrop + staticPressureChange;
  }

  function computeTotalHeadRequirement(majorHeadLoss, minorHeadLoss, staticHead) {
    return majorHeadLoss + minorHeadLoss + staticHead;
  }

  function resolveFlowBasis(inputs) {
    const resolvedFlowRate = inputs.flowRate > 0
      ? inputs.flowRate
      : computeVolumetricFlowRate(inputs.massFlowRate, inputs.density);
    const resolvedMassFlowRate = inputs.massFlowRate > 0
      ? inputs.massFlowRate
      : computeMassFlowRate(inputs.density, resolvedFlowRate);

    return {
      flowRate: resolvedFlowRate,
      massFlowRate: resolvedMassFlowRate
    };
  }

  function computeSystemCurveSeries(inputs, options) {
    const errors = validateInputs(inputs);
    if (errors.length) {
      throw new Error(errors.join(" "));
    }

    const flowBasis = resolveFlowBasis(inputs);
    const elevationChange =
      inputs.elevationChange !== null && inputs.elevationChange !== undefined
        ? inputs.elevationChange
        : 0;
    const pressureBoundaryDifference =
      inputs.supplyPressure !== null &&
      inputs.supplyPressure !== undefined &&
      inputs.destinationPressure !== null &&
      inputs.destinationPressure !== undefined
        ? computePressureBoundaryDifference(inputs.supplyPressure, inputs.destinationPressure)
        : 0;
    const minorLossCoefficient =
      inputs.minorLossCoefficient !== null && inputs.minorLossCoefficient !== undefined
        ? inputs.minorLossCoefficient
        : 0;
    const staticPressureChange = computeStaticPressureChange(
      inputs.density,
      elevationChange,
      pressureBoundaryDifference
    );
    const staticHead = computeStaticHead(inputs.density, elevationChange, pressureBoundaryDifference);
    const pointCount = options && options.pointCount ? options.pointCount : 41;
    const maxFlowRate = options && options.maxFlowRate && options.maxFlowRate > 0
      ? options.maxFlowRate
      : flowBasis.flowRate * (options && options.maxFlowFactor ? options.maxFlowFactor : 1.8);
    const points = [];

    for (let index = 0; index < pointCount; index += 1) {
      const flowRate = maxFlowRate * (index / Math.max(pointCount - 1, 1));

      if (flowRate <= 0) {
        points.push({
          flowRate: 0,
          velocity: 0,
          reynolds: 0,
          frictionFactor: null,
          majorHeadLoss: 0,
          minorHeadLoss: 0,
          totalHead: staticHead,
          totalPressureDifferential: staticPressureChange
        });
        continue;
      }

      const velocity = computeVelocity(flowRate, inputs.diameter);
      const reynolds = computeReynolds(inputs.density, velocity, inputs.diameter, inputs.viscosity);
      const relativeRoughness = computeRelativeRoughness(inputs.roughness, inputs.diameter);
      const friction = computeFrictionFactor(reynolds, relativeRoughness);
      const majorHeadLoss = computeHeadLoss(friction.factor, inputs.length, inputs.diameter, velocity);
      const minorHeadLoss = computeMinorLossHead(minorLossCoefficient, velocity);
      const totalHead = computeTotalHeadRequirement(majorHeadLoss, minorHeadLoss, staticHead);
      const majorPressureDrop = computePressureDrop(
        friction.factor,
        inputs.length,
        inputs.diameter,
        inputs.density,
        velocity
      );
      const minorPressureDrop = computeMinorLossPressure(minorLossCoefficient, inputs.density, velocity);
      const totalPressureDifferential = computeTotalPressureDifferential(
        majorPressureDrop,
        minorPressureDrop,
        staticPressureChange
      );

      points.push({
        flowRate: flowRate,
        velocity: velocity,
        reynolds: reynolds,
        frictionFactor: friction.factor,
        majorHeadLoss: majorHeadLoss,
        minorHeadLoss: minorHeadLoss,
        totalHead: totalHead,
        totalPressureDifferential: totalPressureDifferential
      });
    }

    return {
      staticHead: staticHead,
      staticPressureChange: staticPressureChange,
      maxFlowRate: maxFlowRate,
      points: points
    };
  }

  function validateInputs(inputs) {
    const errors = [];

    if (!(inputs.density > 0)) {
      errors.push("Density must be greater than zero.");
    }
    if (!(inputs.viscosity > 0)) {
      errors.push("Dynamic viscosity must be greater than zero.");
    }
    if (!(inputs.diameter > 0)) {
      errors.push("Pipe diameter must be greater than zero.");
    }
    if (!(inputs.length > 0)) {
      errors.push("Pipe length must be greater than zero.");
    }
    if (!((inputs.flowRate > 0) || (inputs.massFlowRate > 0))) {
      errors.push("Either volumetric flow rate or mass flow rate must be greater than zero.");
    }
    if (!(Number.isFinite(inputs.roughness) && inputs.roughness >= 0)) {
      errors.push("Absolute roughness cannot be negative.");
    }
    if (inputs.flowRate !== null && inputs.flowRate !== undefined && inputs.flowRate < 0) {
      errors.push("Volumetric flow rate cannot be negative.");
    }
    if (inputs.massFlowRate !== null && inputs.massFlowRate !== undefined && inputs.massFlowRate < 0) {
      errors.push("Mass flow rate cannot be negative.");
    }
    if (inputs.vaporPressure !== null && inputs.vaporPressure !== undefined && inputs.vaporPressure < 0) {
      errors.push("Vapor pressure cannot be negative.");
    }
    if (inputs.supplyPressure !== null && inputs.supplyPressure !== undefined && inputs.supplyPressure < 0) {
      errors.push("Supply pressure cannot be negative.");
    }
    if (inputs.destinationPressure !== null && inputs.destinationPressure !== undefined && inputs.destinationPressure < 0) {
      errors.push("Destination pressure cannot be negative.");
    }
    if (
      (inputs.supplyPressure !== null && inputs.supplyPressure !== undefined) !==
      (inputs.destinationPressure !== null && inputs.destinationPressure !== undefined)
    ) {
      errors.push("Supply and destination pressures must be entered together or both left blank.");
    }
    if (inputs.minorLossCoefficient !== null && inputs.minorLossCoefficient !== undefined && inputs.minorLossCoefficient < 0) {
      errors.push("Aggregate minor-loss coefficient cannot be negative.");
    }
    if (
      inputs.additionalMinorLossCoefficient !== null &&
      inputs.additionalMinorLossCoefficient !== undefined &&
      inputs.additionalMinorLossCoefficient < 0
    ) {
      errors.push("Additional custom SigmaK cannot be negative.");
    }
    if (
      inputs.fittingMinorLossCoefficient !== null &&
      inputs.fittingMinorLossCoefficient !== undefined &&
      inputs.fittingMinorLossCoefficient < 0
    ) {
      errors.push("Fitting-based SigmaK cannot be negative.");
    }

    return errors;
  }

  function computeScenario(inputs) {
    const errors = validateInputs(inputs);
    if (errors.length) {
      throw new Error(errors.join(" "));
    }

    const flowBasis = resolveFlowBasis(inputs);
    const resolvedFlowRate = flowBasis.flowRate;
    const resolvedMassFlowRate = flowBasis.massFlowRate;
    const velocity = computeVelocity(resolvedFlowRate, inputs.diameter);
    const reynolds = computeReynolds(inputs.density, velocity, inputs.diameter, inputs.viscosity);
    const relativeRoughness = computeRelativeRoughness(inputs.roughness, inputs.diameter);
    const friction = computeFrictionFactor(reynolds, relativeRoughness);
    const majorPressureDrop = computePressureDrop(
      friction.factor,
      inputs.length,
      inputs.diameter,
      inputs.density,
      velocity
    );
    const majorHeadLoss = computeHeadLoss(friction.factor, inputs.length, inputs.diameter, velocity);
    const supplyPressure =
      inputs.supplyPressure !== null && inputs.supplyPressure !== undefined
        ? inputs.supplyPressure
        : null;
    const destinationPressure =
      inputs.destinationPressure !== null && inputs.destinationPressure !== undefined
        ? inputs.destinationPressure
        : null;
    const elevationChange =
      inputs.elevationChange !== null && inputs.elevationChange !== undefined
        ? inputs.elevationChange
        : 0;
    const minorLossCoefficient =
      inputs.minorLossCoefficient !== null && inputs.minorLossCoefficient !== undefined
        ? inputs.minorLossCoefficient
        : 0;
    const fittingMinorLossCoefficient =
      inputs.fittingMinorLossCoefficient !== null && inputs.fittingMinorLossCoefficient !== undefined
        ? inputs.fittingMinorLossCoefficient
        : minorLossCoefficient;
    const additionalMinorLossCoefficient =
      inputs.additionalMinorLossCoefficient !== null && inputs.additionalMinorLossCoefficient !== undefined
        ? inputs.additionalMinorLossCoefficient
        : Math.max(minorLossCoefficient - fittingMinorLossCoefficient, 0);
    const minorPressureDrop = computeMinorLossPressure(minorLossCoefficient, inputs.density, velocity);
    const minorHeadLoss = computeMinorLossHead(minorLossCoefficient, velocity);
    const pressureBoundaryDifference =
      supplyPressure !== null && destinationPressure !== null
        ? computePressureBoundaryDifference(supplyPressure, destinationPressure)
        : 0;
    const staticPressureChange = computeStaticPressureChange(
      inputs.density,
      elevationChange,
      pressureBoundaryDifference
    );
    const staticHead = computeStaticHead(inputs.density, elevationChange, pressureBoundaryDifference);
    const totalPressureDifferential = computeTotalPressureDifferential(
      majorPressureDrop,
      minorPressureDrop,
      staticPressureChange
    );
    const totalHeadRequirement = computeTotalHeadRequirement(
      majorHeadLoss,
      minorHeadLoss,
      staticHead
    );
    const bulkBoundaryPressureMinimum =
      supplyPressure !== null && destinationPressure !== null
        ? Math.min(supplyPressure, destinationPressure)
        : null;
    const bulkBoundaryVaporMargin =
      bulkBoundaryPressureMinimum !== null &&
      inputs.vaporPressure !== null &&
      inputs.vaporPressure !== undefined
        ? bulkBoundaryPressureMinimum - inputs.vaporPressure
        : null;
    const systemCurve = computeSystemCurveSeries(inputs, {
      pointCount: 41,
      maxFlowRate: Math.max(resolvedFlowRate * 1.8, resolvedFlowRate + Math.max(resolvedFlowRate * 0.15, 1e-6))
    });

    return {
      density: inputs.density,
      viscosity: inputs.viscosity,
      diameter: inputs.diameter,
      length: inputs.length,
      roughness: inputs.roughness,
      flowRate: resolvedFlowRate,
      inputFlowRate: inputs.flowRate,
      massFlowRate: resolvedMassFlowRate,
      inputMassFlowRate: inputs.massFlowRate,
      temperature: inputs.temperature,
      maxTemperature: inputs.maxTemperature,
      vaporPressure: inputs.vaporPressure,
      supplyPressure,
      destinationPressure,
      pressureBoundaryDifference,
      elevationChange,
      minorLossCoefficient,
      fittingMinorLossCoefficient,
      additionalMinorLossCoefficient,
      area: Math.PI * inputs.diameter * inputs.diameter / 4,
      velocity,
      reynolds,
      kinematicViscosity: inputs.viscosity / inputs.density,
      relativeRoughness,
      frictionFactor: friction.factor,
      frictionMethod: friction.method,
      frictionEquation: friction.equation,
      regime: friction.regime,
      pressureDrop: majorPressureDrop,
      headLoss: majorHeadLoss,
      majorPressureDrop,
      majorHeadLoss,
      minorPressureDrop,
      minorHeadLoss,
      staticPressureChange,
      staticHead,
      totalPressureDifferential,
      totalHeadRequirement,
      bulkBoundaryPressureMinimum,
      bulkBoundaryVaporMargin,
      systemCurve
    };
  }

  return {
    GRAVITY,
    RE_MIN,
    RE_MAX,
    F_MIN,
    F_MAX,
    LAMINAR_LIMIT,
    TRANSITION_LIMIT,
    equationCatalog,
    log10,
    clamp,
    formatNumber,
    formatFixed,
    formatWithUnit,
    convertFlowRate,
    convertFlowRateToSI,
    convertVelocity,
    convertHead,
    computeMassFlowRate,
    computeVolumetricFlowRate,
    computeVelocity,
    computeReynolds,
    computeRelativeRoughness,
    swameeJain,
    churchill,
    solveColebrook,
    classifyFlow,
    computeFrictionFactor,
    computePressureDrop,
    computeHeadLoss,
    computeMinorLossPressure,
    computeMinorLossHead,
    computePressureBoundaryDifference,
    computeStaticPressureChange,
    computeStaticHead,
    computeTotalPressureDifferential,
    computeTotalHeadRequirement,
    resolveFlowBasis,
    computeSystemCurveSeries,
    validateInputs,
    computeScenario
  };
});
