// Actual local captures, reviewed October 15, 2026. Keep explanations in portable MDX.
export type DocumentationScreenshotMetadata = {
  width: number
  height: number
  points: readonly { number: number; x: number; y: number }[]
}

export const documentationScreenshots: Readonly<Partial<Record<string, DocumentationScreenshotMetadata>>> = {
  "/docs/phaeno/screenshots/customer-order-20261015.jpg": {
    "width": 1156,
    "height": 354,
    "points": [
      {
        "number": 1,
        "x": 46.27,
        "y": 27.12
      },
      {
        "number": 2,
        "x": 95.23,
        "y": 27.12
      },
      {
        "number": 3,
        "x": 95.23,
        "y": 48.6
      },
      {
        "number": 4,
        "x": 46.27,
        "y": 70.07
      },
      {
        "number": 5,
        "x": 95.23,
        "y": 70.07
      }
    ]
  },
  "/docs/phaeno/screenshots/sample-type-20261015.jpg": {
    "width": 768,
    "height": 868,
    "points": [
      {
        "number": 1,
        "x": 91.23,
        "y": 18.03
      },
      {
        "number": 2,
        "x": 91.23,
        "y": 41.18
      },
      {
        "number": 3,
        "x": 44.43,
        "y": 83.16
      }
    ]
  },
  "/docs/phaeno/screenshots/protocol-editor-20261015.jpg": {
    "width": 989,
    "height": 629,
    "points": [
      {
        "number": 1,
        "x": 2.5,
        "y": 70.7
      },
      {
        "number": 2,
        "x": 58,
        "y": 74.7
      },
      {
        "number": 3,
        "x": 97,
        "y": 21
      }
    ]
  }
}
