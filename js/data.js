(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.MoodyData = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const fluidPresets = [
    {
      id: "custom",
      label: "Custom fluid properties",
      density: null,
      viscosity: null,
      temperature: null,
      vaporPressure: null
    },
    {
      id: "water20",
      label: "Water at 20 C",
      density: 998.2,
      viscosity: 1.002e-3,
      temperature: 20,
      vaporPressure: 2339
    },
    {
      id: "seawater20",
      label: "Seawater at 20 C",
      density: 1024,
      viscosity: 1.08e-3,
      temperature: 20
    },
    {
      id: "lightoil40",
      label: "Light mineral oil at 40 C (approx.)",
      density: 860,
      viscosity: 2.8e-2,
      temperature: 40
    }
  ];

  const materialPresets = [
    {
      id: "custom",
      label: "Custom roughness",
      roughness: null
    },
    {
      id: "drawn",
      label: "Drawn tubing / hydraulically smooth",
      roughness: 1.5e-6
    },
    {
      id: "pvc",
      label: "Thermoplastics / PVC",
      roughness: 1.5e-6
    },
    {
      id: "commercialSteel",
      label: "Commercial steel / wrought iron",
      roughness: 4.6e-5
    },
    {
      id: "galvanizedIron",
      label: "Galvanized iron",
      roughness: 1.5e-4
    },
    {
      id: "castIron",
      label: "Cast iron, new",
      roughness: 2.6e-4
    },
    {
      id: "concreteSmooth",
      label: "Concrete, smoothed",
      roughness: 4e-5
    },
    {
      id: "concreteRough",
      label: "Concrete, rough",
      roughness: 2e-3
    }
  ];

  const minorLossCatalog = [
    {
      id: "entranceSharp",
      label: "Sharp-edged entrance",
      category: "Entrance / exit",
      kValue: 0.5
    },
    {
      id: "entranceRounded",
      label: "Well-rounded entrance",
      category: "Entrance / exit",
      kValue: 0.04
    },
    {
      id: "exitFreeDischarge",
      label: "Free discharge exit",
      category: "Entrance / exit",
      kValue: 1
    },
    {
      id: "elbow90Standard",
      label: "90 deg elbow, standard radius",
      category: "Elbows and bends",
      kValue: 0.3
    },
    {
      id: "elbow90Long",
      label: "90 deg elbow, long radius",
      category: "Elbows and bends",
      kValue: 0.2
    },
    {
      id: "elbow45",
      label: "45 deg elbow",
      category: "Elbows and bends",
      kValue: 0.1
    },
    {
      id: "gateValveOpen",
      label: "Gate valve, fully open",
      category: "Valves",
      kValue: 0.1
    },
    {
      id: "ballValveOpen",
      label: "Ball valve, fully open (full-port)",
      category: "Valves",
      kValue: 0
    },
    {
      id: "globeValveOpen",
      label: "Globe valve, fully open",
      category: "Valves",
      kValue: 6
    },
    {
      id: "swingCheck",
      label: "Swing check valve",
      category: "Valves",
      kValue: 2
    },
    {
      id: "teeThrough",
      label: "Tee, straight-through run",
      category: "Tees and branches",
      kValue: 0.6
    },
    {
      id: "teeBranch",
      label: "Tee, branch flow",
      category: "Tees and branches",
      kValue: 1.8
    }
  ];

  const canonicalReferences = [
    {
      title: "Moody, L. F. (1944). Friction Factors for Pipe Flow.",
      description: "Classical ASME paper that consolidated friction-factor data into the chart now known as the Moody diagram.",
      url: "https://asmedigitalcollection.asme.org/fluidsengineering/article-abstract/66/8/671/1153865/Friction-Factors-for-Pipe-Flow?redirectedFrom=fulltext"
    },
    {
      title: "Colebrook, C. F. (1939). Turbulent Flow in Pipes with Particular Reference to the Transition Region Between the Smooth and Rough Pipe Laws.",
      description: "Foundational correlation for turbulent friction factor in smooth-to-rough commercial pipes.",
      url: "https://spacefrontiers.org/r/10.1680/ijoti.1939.13150"
    },
    {
      title: "Churchill, S. W. (1977). Friction Factor Equation Spans All Fluid Flow Regimes.",
      description: "Widely used continuous correlation spanning laminar, transitional, and turbulent conditions.",
      url: "https://www.sciepub.com/reference/127553"
    },
    {
      title: "Swamee, P. K., and Jain, A. K. (1976). Explicit Equations for Pipe-Flow Problems.",
      description: "Classic explicit approximation used as a practical non-iterative estimate of Darcy friction factor.",
      url: "https://www.tucson.ars.ag.gov/unit/publications/PDFfiles/161a.pdf"
    }
  ];

  const researchReferences = [
    {
      title: "Zeghadnia, L., Robert, J. L., and Achour, B. (2019). Explicit solutions for turbulent flow friction factor: A review, assessment and approaches classification.",
      description: "Review and ranking study of explicit turbulent friction-factor formulas.",
      url: "https://www.sciencedirect.com/science/article/pii/S2090447919300176"
    },
    {
      title: "Easa, S. M., Lamri, A. A., and Brkic, D. (2022). Reliability-Based Criterion for Evaluating Explicit Approximations of Colebrook Equation.",
      description: "Assessment of explicit Colebrook approximations using a reliability-oriented metric.",
      url: "https://www.mdpi.com/2077-1312/10/6/803"
    },
    {
      title: "Offor, U. H., and Alabi, S. B. (2016). An Accurate and Computationally Efficient Explicit Friction Factor Model.",
      description: "Explores explicit friction-factor modeling for turbulent pipe flow with attention to accuracy and computational cost.",
      url: "https://www.scirp.org/journal/paperinformation?paperid=66711"
    },
    {
      title: "Process-Based Friction Factor for Pipe Flow.",
      description: "Supplementary reading on physics-based or process-oriented friction-factor modeling.",
      url: "https://www.scirp.org/journal/paperinformation?paperid=76919"
    },
    {
      title: "Adams, T., Grant, C., and Watson, H. (2012). A Simple Algorithm to Relate Measured Surface Roughness to Equivalent Sand-grain Roughness.",
      description: "Useful when roughness is measured by profilometry and must be translated into equivalent sand-grain roughness for Moody-style use.",
      url: "https://ijmem.avestia.com/2012/PDF/008.pdf"
    },
    {
      title: "Additional turbulence and Reynolds-number studies supplied for this project.",
      description: "The user also requested the inclusion of Reynolds-number and roughness studies from MDPI, IWA Publishing, ScienceDirect, and ResearchGate; these are listed below as project reading links.",
      url: ""
    }
  ];

  const userSuppliedReadingList = [
    "https://asmedigitalcollection.asme.org/fluidsengineering/article-abstract/66/8/671/1153865/Friction-Factors-for-Pipe-Flow?redirectedFrom=fulltext",
    "https://www.sciencedirect.com/science/article/pii/S2090447919300176",
    "https://www.mdpi.com/2077-1312/10/6/803",
    "https://www.mdpi.com/2311-5521/9/12/299",
    "https://www.scirp.org/journal/paperinformation?paperid=66711",
    "https://www.scirp.org/journal/paperinformation?paperid=76919",
    "https://www.sciencedirect.com/science/article/abs/pii/S0142727X2200073X",
    "https://iwaponline.com/aqua/article/73/5/1030/101670/Reynolds-number-effect-on-the-parameters-of",
    "https://www.researchgate.net/publication/322055367_Surface-Roughness_Design_Values_for_Modern_Pipes",
    "https://ijmem.avestia.com/2012/PDF/008.pdf",
    "https://iwaponline.com/hr/article/55/10/1030/104787/Determination-of-the-coefficient-of-friction-in",
    "https://www.engineersedge.com/fluid_flow/pipe-roughness.htm",
    "https://www.engineersedge.com/fluid_flow/fluid_data.htm",
    "https://www.engineersedge.com/fluid_flow/pressure_drop/pressure_drop.htm"
  ];

  const engineeringDataReferences = [
    {
      title: "Pipe Roughness Coefficients Table Charts.",
      description: "Practical absolute roughness values for common engineering pipe materials.",
      url: "https://www.engineersedge.com/fluid_flow/pipe-roughness.htm"
    },
    {
      title: "Fluid Characteristics Chart Table.",
      description: "Engineering property data including density and kinematic viscosity.",
      url: "https://www.engineersedge.com/fluid_flow/fluid_data.htm"
    },
    {
      title: "Pressure Drop Along Pipe Length.",
      description: "Applied engineering reference material for Darcy-Weisbach pressure-loss calculations.",
      url: "https://www.engineersedge.com/fluid_flow/pressure_drop/pressure_drop.htm"
    }
  ];

  const referenceSections = [
    {
      heading: "Canonical foundations",
      description: "These references underpin the chart construction and the friction-factor models used in the application.",
      type: "annotated",
      items: canonicalReferences
    },
    {
      heading: "Supplementary research papers",
      description: "These papers are useful for comparing explicit approximations, roughness treatment, and friction-factor modeling philosophy.",
      type: "annotated",
      items: researchReferences
    },
    {
      heading: "Engineering property and roughness data",
      description: "These sources support quick engineering estimates for density, viscosity, and commercial pipe roughness.",
      type: "annotated",
      items: engineeringDataReferences
    },
    {
      heading: "User-supplied project reading list",
      description: "Requested links preserved verbatim in the interface for further literature review.",
      type: "links",
      items: userSuppliedReadingList
    }
  ];

  return {
    fluidPresets,
    materialPresets,
    minorLossCatalog,
    referenceSections
  };
});
