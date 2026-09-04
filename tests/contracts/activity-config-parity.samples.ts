export const validSimulationConfig = {
  engineKind: 'transverse_wave_v1' as const,
  mediumSpeedMps: 12,
  frequencyHz: {
    min: 0.5,
    max: 4,
    step: 0.5,
    initial: 1,
  },
  amplitudeM: {
    min: 0.2,
    max: 1,
    step: 0.1,
    initial: 0.5,
  },
};

export const simulationConfigParityCases = [
  {
    name: 'valid simulation config',
    value: validSimulationConfig,
    valid: true,
  },
  {
    name: 'unsupported simulation top-level key',
    value: {
      ...validSimulationConfig,
      unexpected: true,
    },
    valid: false,
  },
  {
    name: 'unsupported simulation range key',
    value: {
      ...validSimulationConfig,
      frequencyHz: {
        ...validSimulationConfig.frequencyHz,
        unexpected: true,
      },
    },
    valid: false,
  },
  {
    name: 'non-positive simulation frequency minimum',
    value: {
      ...validSimulationConfig,
      frequencyHz: {
        ...validSimulationConfig.frequencyHz,
        min: 0,
      },
    },
    valid: false,
  },
] as const;

export const validDataActivityConfig = {
  engineKind: 'data_graph_v1' as const,
  context: 'A body moves along a straight path.',
  presentation: {
    mode: 'table_and_line_graph' as const,
    xAxisLabel: 'Time',
    yAxisLabel: 'Distance',
  },
  dataset: {
    x: {
      label: 'Time',
      unit: 's',
      values: [0, 1, 2],
    },
    series: [
      {
        id: 'distance',
        label: 'Distance',
        unit: 'm',
        values: [0, 2, 4],
      },
    ],
  },
  tasks: [
    {
      id: 'read-1',
      prompt: 'Read the distance at 1 s.',
      unit: 'm',
      rule: {
        kind: 'read_value' as const,
        seriesId: 'distance',
        pointIndex: 1,
      },
    },
    {
      id: 'difference-1',
      prompt: 'Find the change in distance.',
      unit: 'm',
      tolerance: 0.01,
      rule: {
        kind: 'difference' as const,
        seriesId: 'distance',
        leftIndex: 0,
        rightIndex: 2,
        absolute: true,
      },
    },
    {
      id: 'mean-1',
      prompt: 'Find the mean distance.',
      unit: 'm',
      rule: {
        kind: 'mean' as const,
        seriesId: 'distance',
        pointIndices: [0, 1, 2],
      },
    },
  ],
};

export const dataConfigParityCases = [
  {
    name: 'valid data activity config',
    value: validDataActivityConfig,
    valid: true,
  },
  {
    name: 'unsupported data presentation key',
    value: {
      ...validDataActivityConfig,
      presentation: {
        ...validDataActivityConfig.presentation,
        unexpected: true,
      },
    },
    valid: false,
  },
  {
    name: 'unknown data series reference',
    value: {
      ...validDataActivityConfig,
      tasks: [
        {
          ...validDataActivityConfig.tasks[0],
          rule: {
            kind: 'read_value' as const,
            seriesId: 'missing-series',
            pointIndex: 1,
          },
        },
      ],
    },
    valid: false,
  },
  {
    name: 'out-of-range data point reference',
    value: {
      ...validDataActivityConfig,
      tasks: [
        {
          ...validDataActivityConfig.tasks[0],
          rule: {
            kind: 'read_value' as const,
            seriesId: 'distance',
            pointIndex: 99,
          },
        },
      ],
    },
    valid: false,
  },
  {
    name: 'negative data tolerance',
    value: {
      ...validDataActivityConfig,
      tasks: [
        {
          ...validDataActivityConfig.tasks[0],
          tolerance: -0.01,
        },
      ],
    },
    valid: false,
  },
] as const;
